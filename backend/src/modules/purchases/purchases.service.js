import * as model from './purchases.model.js';
import * as productsModel from '../products/products.model.js';
import { assertManager } from '../collection-points/collection-points.service.js';
import { applyMovement, afterMovement } from '../storage/storage.service.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToUsers } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { transaction } from '../../config/db.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

/**
 * Status workflow:
 *   pending   → confirmed (seller or collector) | cancelled (both)
 *   confirmed → received  (collector — stock is added automatically) | cancelled (both)
 */
const TRANSITIONS = {
  pending: { confirmed: ['seller', 'collector'], cancelled: ['seller', 'collector'] },
  confirmed: { received: ['collector'], cancelled: ['seller', 'collector'] },
};

const STATUS_LABELS = { confirmed: 'confirmée', received: 'réceptionnée', cancelled: 'annulée' };

function partyOf(user, purchase) {
  if (user.role === 'admin') return 'admin';
  if (purchase.collection_point.manager_id === user.id) return 'collector';
  if (purchase.seller?.id === user.id) return 'seller';
  return null;
}

async function getVisible(user, id) {
  const purchase = found(await model.findById(id), 'Opération d\'achat introuvable');
  if (!partyOf(user, purchase)) throw ApiError.forbidden('Vous ne participez pas à cette opération');
  return purchase;
}

/** US-PC01 — purchase operations (collector sees its points, seller sees what is bought from it). */
export async function list(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(user, filters, page), page);
}

export const getById = (user, id) => getVisible(user, id);

export async function create(user, data) {
  await assertManager(user, data.collection_point_id);
  const payload = { ...data };
  if (data.product_id) {
    const product = found(await productsModel.findOwner(data.product_id), 'Produit introuvable');
    payload.seller_id = product.seller_id;
    payload.category_id ??= product.category_id;
    payload.label ??= product.title;
  }
  if (!payload.label) throw ApiError.badRequest('label est requis quand aucun product_id n\'est fourni');
  const purchase = await model.findById(await model.create(user.id, payload));
  if (purchase.seller) {
    await notify(purchase.seller.id, {
      type: NotificationTypes.PURCHASE_NEW,
      title: 'Nouvelle proposition d\'achat',
      message: `${purchase.collection_point.name} souhaite acheter ${purchase.quantity_kg} kg de ${purchase.label}`,
      data: { purchase_id: purchase.id },
      link: `/purchases/${purchase.id}`,
    });
  }
  return purchase;
}

export async function update(user, id, data) {
  const purchase = await getVisible(user, id);
  if (partyOf(user, purchase) === 'seller') throw ApiError.forbidden('Seul le point de collecte peut modifier l\'opération');
  if (purchase.status !== 'pending') throw ApiError.conflict('Seule une opération en attente peut être modifiée');
  await model.update(id, data);
  return model.findById(id);
}

export async function changeStatus(user, id, { status, stock_item_id: stockItemId }) {
  let movementResult = null;
  await transaction(async (db) => {
    const locked = found(await model.lock(id, db), 'Opération d\'achat introuvable');
    const purchase = await model.findById(id, db);
    const party = partyOf(user, purchase);
    if (!party) throw ApiError.forbidden('Vous ne participez pas à cette opération');
    const allowed = TRANSITIONS[locked.status]?.[status];
    if (!allowed) throw ApiError.conflict(`Transition impossible : ${locked.status} → ${status}`);
    // Without a registered seller, the collector handles confirmation alone.
    if (party !== 'admin' && !allowed.includes(party)) throw ApiError.forbidden(`Action réservée à : ${allowed.join(', ')}`);

    const changes = { status };
    if (status === 'received') {
      movementResult = await applyMovement({
        pointId: locked.collection_point_id,
        itemId: stockItemId ?? locked.stock_item_id ?? undefined,
        label: locked.label,
        categoryId: locked.category_id,
        type: 'in',
        quantity: locked.quantity_kg,
        reason: `Achat ${locked.id}`,
        purchaseId: locked.id,
        userId: user.id,
      }, db);
      changes.received_at = new Date();
      changes.stock_item_id = movementResult.item.id;
      if (locked.product_id) await model.consumeProductQuantity(locked.product_id, locked.quantity_kg, db);
    }
    await model.update(id, changes, db);
  });
  if (movementResult) await afterMovement(movementResult);

  const purchase = await model.findById(id);
  const participants = [purchase.collection_point.manager_id, purchase.seller?.id];
  emitToUsers(participants, SocketEvents.PURCHASE_UPDATED, purchase);
  await notify(participants.filter((uid) => uid !== user.id), {
    type: NotificationTypes.PURCHASE_STATUS,
    title: `Opération d'achat ${STATUS_LABELS[status]}`,
    message: `${purchase.label} — ${purchase.quantity_kg} kg (${purchase.collection_point.name})`,
    data: { purchase_id: id, status },
    link: `/purchases/${id}`,
  });
  return purchase;
}
