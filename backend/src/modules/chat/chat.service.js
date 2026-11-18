import * as model from './chat.model.js';
import { findAuthById } from '../users/users.model.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToUser, emitToUsers, isOnline } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { transaction } from '../../config/db.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

/**
 * Who can talk to whom (US-S03, US-B08, US-PC05):
 * seller ↔ buyer, collector ↔ seller, collector ↔ buyer, admin ↔ anyone.
 */
function canChat(roleA, roleB) {
  return roleA === 'admin' || roleB === 'admin' || roleA !== roleB;
}

async function assertParticipant(user, conversationId) {
  const participants = await model.participantIds(conversationId);
  if (!participants.length) throw ApiError.notFound('Conversation introuvable');
  if (!participants.includes(user.id)) throw ApiError.forbidden('Vous ne participez pas à cette conversation');
  return participants;
}

async function pushUnreadCount(userId) {
  emitToUser(userId, SocketEvents.CHAT_UNREAD_COUNT, { count: await model.countUnreadMessages(userId) });
}

export async function list(user, q) {
  const page = paginationOf(q);
  const rows = await model.listForUser(user.id, { q: q.q, unreadOnly: q.unread_only, ...page });
  const result = paginated(rows, page);
  result.data = result.data.map((row) => ({ ...row, participant: { ...row.participant, online: isOnline(row.participant.id) } }));
  return result;
}

export async function getById(user, id) {
  await assertParticipant(user, id);
  const conversation = found(await model.findForUser(id, user.id), 'Conversation introuvable');
  conversation.participant.online = isOnline(conversation.participant.id);
  return conversation;
}

export const unreadCount = async (user) => ({ count: await model.countUnreadMessages(user.id) });

/** Opens (or reuses) the conversation with another user, optionally sending a first message. */
export async function start(user, { participant_id: otherId, message }) {
  if (otherId === user.id) throw ApiError.badRequest('Impossible de démarrer une conversation avec vous-même');
  const other = await findAuthById(otherId);
  if (!other?.is_active) throw ApiError.notFound('Utilisateur introuvable');
  if (!canChat(user.role, other.role)) throw ApiError.forbidden('La messagerie relie vendeurs, acheteurs et points de collecte entre eux');
  const { id, created } = await transaction((db) => model.getOrCreateDirect(user.id, otherId, db));
  if (message) await sendMessage(user, id, message);
  return { conversation: await getById(user, id), created };
}

export async function listMessages(user, conversationId, q) {
  await assertParticipant(user, conversationId);
  return model.listMessages(conversationId, { before: q.before, limit: q.limit ?? 50 });
}

/**
 * Persists a message, pushes `message:new` to every participant socket and
 * creates a `message.new` notification for recipients who are offline.
 */
export async function sendMessage(user, conversationId, data) {
  const participants = await assertParticipant(user, conversationId);
  const message = await model.insertMessage(conversationId, user.id, data);
  const payload = { ...message, sender_name: user.name };
  emitToUsers(participants, SocketEvents.MESSAGE_NEW, payload);

  const recipients = participants.filter((id) => id !== user.id);
  await Promise.all(recipients.map(pushUnreadCount));
  const offline = recipients.filter((id) => !isOnline(id));
  await notify(offline, {
    type: NotificationTypes.MESSAGE_NEW,
    title: `Nouveau message de ${user.name}`,
    message: data.body.length > 120 ? `${data.body.slice(0, 117)}...` : data.body,
    data: { conversation_id: conversationId, message_id: message.id, sender_id: user.id },
    link: `/chat/${conversationId}`,
  });
  return payload;
}

/** Read receipt: updates last_read_at and tells the other participants. */
export async function markConversationRead(user, conversationId) {
  const participants = await assertParticipant(user, conversationId);
  const { last_read_at: readAt } = await model.markRead(conversationId, user.id);
  emitToUsers(participants.filter((id) => id !== user.id), SocketEvents.CONVERSATION_READ, {
    conversation_id: conversationId, user_id: user.id, read_at: readAt,
  });
  await pushUnreadCount(user.id);
  return { conversation_id: conversationId, read_at: readAt };
}
