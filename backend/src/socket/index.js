/**
 * Socket.IO server — real-time notifications, chat and presence.
 *
 * Client connection:  io(API_URL, { auth: { token: '<JWT>' } })
 * (the HttpOnly session cookie also works with { withCredentials: true }).
 *
 * Rooms: every socket joins `user:<id>` and `role:<role>`.
 * The server only pushes; all writes go through the REST API except the
 * lightweight `typing:*`, `conversation:read` and `presence:get` events.
 */
import { Server } from 'socket.io';
import { isOriginAllowed } from '../config/env.js';
import { userFromToken } from '../middlewares/auth.js';
import { tokenFromHeaders } from '../utils/jwt.js';
import { SocketEvents } from './events.js';
import * as chatModel from '../modules/chat/chat.model.js';
import * as notificationsModel from '../modules/notifications/notifications.model.js';

let io = null;
const connections = new Map(); // userId -> number of open sockets

export const userRoom = (userId) => `user:${userId}`;
export const roleRoom = (role) => `role:${role}`;

export const isOnline = (userId) => (connections.get(userId) ?? 0) > 0;

export function emitToUser(userId, event, payload) {
  if (io && userId) io.to(userRoom(userId)).emit(event, payload);
}

export function emitToUsers(userIds, event, payload) {
  if (!io) return;
  const rooms = [...new Set(userIds.filter(Boolean))].map(userRoom);
  if (rooms.length) io.to(rooms).emit(event, payload);
}

export function emitToAll(event, payload) {
  if (io) io.emit(event, payload);
}

export function emitToRole(role, event, payload) {
  if (io) io.to(roleRoom(role)).emit(event, payload);
}

async function broadcastPresence(userId, online) {
  try {
    const partners = await chatModel.partnerIdsOf(userId);
    emitToUsers(partners, SocketEvents.PRESENCE_UPDATE, { user_id: userId, online, at: new Date().toISOString() });
  } catch (error) {
    console.error('[socket] presence broadcast failed:', error.message);
  }
}

const ack = (cb, payload) => { if (typeof cb === 'function') cb(payload); };

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || tokenFromHeaders(socket.handshake.headers);
      socket.user = await userFromToken(token);
      next();
    } catch (error) {
      next(new Error(error.message || 'Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { id: userId, role } = socket.user;
    socket.join([userRoom(userId), roleRoom(role)]);

    const count = (connections.get(userId) ?? 0) + 1;
    connections.set(userId, count);
    if (count === 1) broadcastPresence(userId, true);

    // Initial counters so the UI badges are right as soon as the socket opens.
    try {
      const [notifications, messages] = await Promise.all([
        notificationsModel.countUnread(userId),
        chatModel.countUnreadMessages(userId),
      ]);
      socket.emit(SocketEvents.NOTIFICATION_UNREAD_COUNT, { count: notifications });
      socket.emit(SocketEvents.CHAT_UNREAD_COUNT, { count: messages });
    } catch (error) {
      console.error('[socket] initial counters failed:', error.message);
    }

    const relayTyping = (event) => async ({ conversation_id: conversationId } = {}, cb) => {
      try {
        const participants = await chatModel.participantIds(conversationId);
        if (!participants.includes(userId)) return ack(cb, { ok: false, error: 'Not a participant' });
        emitToUsers(participants.filter((id) => id !== userId), event, { conversation_id: conversationId, user_id: userId });
        ack(cb, { ok: true });
      } catch {
        ack(cb, { ok: false, error: 'Invalid conversation' });
      }
    };
    socket.on(SocketEvents.TYPING_START, relayTyping(SocketEvents.TYPING_START));
    socket.on(SocketEvents.TYPING_STOP, relayTyping(SocketEvents.TYPING_STOP));

    socket.on(SocketEvents.CONVERSATION_READ, async ({ conversation_id: conversationId } = {}, cb) => {
      try {
        const { markConversationRead } = await import('../modules/chat/chat.service.js');
        await markConversationRead(socket.user, conversationId);
        ack(cb, { ok: true });
      } catch (error) {
        ack(cb, { ok: false, error: error.message });
      }
    });

    socket.on(SocketEvents.PRESENCE_GET, ({ user_ids: userIds = [] } = {}, cb) => {
      const list = Array.isArray(userIds) ? userIds.slice(0, 200) : [];
      ack(cb, Object.fromEntries(list.map((id) => [id, isOnline(id)])));
    });

    socket.on('disconnect', () => {
      const remaining = (connections.get(userId) ?? 1) - 1;
      if (remaining <= 0) {
        connections.delete(userId);
        broadcastPresence(userId, false);
      } else {
        connections.set(userId, remaining);
      }
    });
  });

  console.log('🔌 Socket.IO ready');
  return io;
}

export const getIO = () => io;
