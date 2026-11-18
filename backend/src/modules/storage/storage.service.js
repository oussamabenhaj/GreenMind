import * as model from './storage.model.js';
import * as pointsModel from '../collection-points/collection-points.model.js';
import { assertManager } from '../collection-points/collection-points.service.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToUser } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { transaction } from '../../config/db.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

const ALERT_THRESHOLD = 90; // % of storage capacity

/** US-PC06 — capacity / usage overview + items. */
export async function getOverview(user, pointId) {
  await assertManager(user, pointId);
  const [summary, items] = await Promise.all([model.overview(pointId), model.listItems(pointId)]);
  return { ...summary, items };
}

export async function updateCapacity(user, pointId, capacity) {
  await assertManager(user, pointId);
  const { used_kg: used } = await model.overview(pointId);
  if (capacity < used) throw ApiError.conflict(`La capacité ne peut pas être inférieure au stock actuel (${used} kg)`);
  await pointsModel.update(pointId, { storage_capacity_kg: capacity });
  return model.overview(pointId);
}

export async function listItems(user, pointId) {
  await assertManager(user, pointId);
  return model.listItems(pointId);
}

export async function createItem(user, pointId, data) {
  await assertManager(user, pointId);
  const { initial_quantity_kg: initial, ...fields } = data;
  const item = await model.createItem(pointId, fields);
  if (initial) await applyMovement({ pointId, itemId: item.id, type: 'in', quantity: initial, reason: 'Stock initial', userId: user.id });
  return found(await model.findItem(pointId, item.id));
}

export async function updateItem(user, pointId, itemId, data) {
  await assertManager(user, pointId);
  found(await model.findItem(pointId, itemId), 'Article de stock introuvable');
  await model.updateItem(itemId, data);
  return model.findItem(pointId, itemId);
}

export async function removeItem(user, pointId, itemId) {
  await assertManager(user, pointId);
  const item = found(await model.findItem(pointId, itemId), 'Article de stock introuvable');
  if (item.quantity_kg > 0) throw ApiError.conflict('Videz le stock (mouvement "out") avant de supprimer l\'article');
  await model.removeItem(itemId);
}

/**
 * Applies a stock movement atomically. Used by the REST endpoint and by
 * purchases (status "received" ⇒ automatic stock-in).
 *  - in:     +quantity (checked against free capacity)
 *  - out:    -quantity (cannot go below 0)
 *  - adjust: sets the item quantity to `quantity` (inventory count)
 * Pass `db` to run inside an existing transaction; alerts are sent after commit by the caller.
 */
export async function applyMovement(m, db = null) {
  const run = async (client) => {
    const point = found(await model.lockPoint(m.pointId, client), 'Point de collecte introuvable');
    let item = m.itemId
      ? await model.findItem(m.pointId, m.itemId, client, { lock: true })
      : await model.findItemByLabel(m.pointId, m.label, client);
    if (!item && m.label && !m.itemId) item = await model.createItem(m.pointId, { label: m.label, category_id: m.categoryId }, client);
    if (!item) throw ApiError.notFound('Article de stock introuvable');

    const current = Number(item.quantity_kg);
    const qty = Number(m.quantity);
    const balance = m.type === 'in' ? current + qty : m.type === 'out' ? current - qty : qty;
    if (balance < 0) throw ApiError.conflict(`Stock insuffisant : ${current} kg disponibles`);
    const newUsed = Number(point.used_kg) - current + balance;
    if (point.storage_capacity_kg > 0 && newUsed > point.storage_capacity_kg) {
      throw ApiError.conflict(`Capacité de stockage dépassée (${newUsed} / ${point.storage_capacity_kg} kg)`);
    }
    await model.setItemQuantity(item.id, balance, client);
    const movement = await model.insertMovement({
      ...m, itemId: item.id, quantity: m.type === 'out' ? -qty : m.type === 'in' ? qty : balance - current, balanceAfter: balance,
    }, client);
    return { movement, point, item: { ...item, quantity_kg: balance }, newUsed };
  };
  const result = db ? await run(db) : await transaction(run);
  if (!db) await afterMovement(result);
  return result;
}

/** Real-time refresh + alerts (call after the transaction committed). */
export async function afterMovement({ point, item, newUsed }) {
  emitToUser(point.manager_id, SocketEvents.STOCK_UPDATED, {
    collection_point_id: point.id, stock_item_id: item.id, quantity_kg: item.quantity_kg, used_kg: newUsed,
  });
  const usage = point.storage_capacity_kg > 0 ? (newUsed / point.storage_capacity_kg) * 100 : 0;
  if (usage >= ALERT_THRESHOLD) {
    await notify(point.manager_id, {
      type: NotificationTypes.STOCK_ALERT,
      title: 'Stockage presque plein',
      message: `${point.name} est rempli à ${usage.toFixed(1)} %`,
      data: { collection_point_id: point.id, usage_percent: Number(usage.toFixed(1)) },
      link: `/collection-points/${point.id}/storage`,
    });
  }
  if (item.min_threshold_kg != null && item.quantity_kg < item.min_threshold_kg) {
    await notify(point.manager_id, {
      type: NotificationTypes.STOCK_ALERT,
      title: 'Stock bas',
      message: `${item.label} : ${item.quantity_kg} kg (seuil ${item.min_threshold_kg} kg)`,
      data: { collection_point_id: point.id, stock_item_id: item.id },
      link: `/collection-points/${point.id}/storage`,
    });
  }
}

export async function addMovement(user, pointId, data) {
  await assertManager(user, pointId);
  const { movement } = await applyMovement({
    pointId, itemId: data.stock_item_id, type: data.type, quantity: data.quantity_kg, reason: data.reason, userId: user.id,
  });
  return movement;
}

export async function listMovements(user, pointId, filters) {
  await assertManager(user, pointId);
  const page = paginationOf(filters);
  return paginated(await model.listMovements(pointId, filters, page), page);
}
