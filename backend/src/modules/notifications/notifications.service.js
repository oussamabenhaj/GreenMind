import * as model from './notifications.model.js';
import { emitToUser } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { ApiError } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

/** Every notification `type` the API can produce. */
export const NotificationTypes = Object.freeze({
  REQUEST_NEW: 'request.new',                       // nouvelle demande d'achat compatible
  REQUEST_RESPONSE: 'request.response',             // réponse reçue sur ma demande
  REQUEST_RESPONSE_STATUS: 'request.response_status', // ma réponse acceptée / refusée
  REQUEST_STATUS: 'request.status',                 // demande clôturée / annulée
  MESSAGE_NEW: 'message.new',                       // nouveau message de chat
  DISCOUNT_NEW: 'discount.new',                     // nouvelle remise sur une catégorie suivie
  OFFER_PUBLISHED: 'offer.published',               // nouvelle offre publiée
  PURCHASE_NEW: 'purchase.new',                     // un point de collecte veut m'acheter
  PURCHASE_STATUS: 'purchase.status',               // statut d'une opération d'achat
  STOCK_ALERT: 'stock.alert',                       // stockage > 90 % ou sous le seuil
  ACCOUNT_VERIFIED: 'account.verified',
  COLLECTION_POINT_VERIFIED: 'collection_point.verified',
  POST_NEW: 'post.new',
  EXCHANGE_NEW: 'exchange.new',                     // nouvelle proposition d’échange dans ma catégorie
  EXCHANGE_RESPONSE: 'exchange.response',           // réponse reçue sur mon échange
  EXCHANGE_RESPONSE_STATUS: 'exchange.response_status', // ma réponse acceptée / refusée
});

/**
 * Persists a notification for each user and pushes it in real time.
 * Never throws: a failed notification must not break the business action.
 */
export async function notify(userIds, notification) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean))];
  if (!ids.length) return [];
  try {
    const rows = await model.createMany(ids, notification);
    await Promise.all(rows.map(async (row) => {
      emitToUser(row.user_id, SocketEvents.NOTIFICATION_NEW, row);
      emitToUser(row.user_id, SocketEvents.NOTIFICATION_UNREAD_COUNT, { count: await model.countUnread(row.user_id) });
    }));
    return rows;
  } catch (error) {
    console.error('[notifications] failed:', error.message);
    return [];
  }
}

async function pushUnreadCount(userId) {
  emitToUser(userId, SocketEvents.NOTIFICATION_UNREAD_COUNT, { count: await model.countUnread(userId) });
}

export async function list(user, q) {
  const page = paginationOf(q);
  const rows = await model.list(user.id, { unreadOnly: q.unread_only, type: q.type, ...page });
  return paginated(rows, page);
}

export const unreadCount = async (user) => ({ count: await model.countUnread(user.id) });

export async function markRead(user, id) {
  const row = await model.markRead(user.id, id);
  if (!row) throw ApiError.notFound('Notification introuvable');
  await pushUnreadCount(user.id);
  return row;
}

export async function markAllRead(user) {
  const updated = await model.markAllRead(user.id);
  await pushUnreadCount(user.id);
  return { updated };
}

export async function remove(user, id) {
  if (!(await model.remove(user.id, id))) throw ApiError.notFound('Notification introuvable');
  await pushUnreadCount(user.id);
}

export const removeAllRead = async (user) => ({ deleted: await model.removeAllRead(user.id) });
