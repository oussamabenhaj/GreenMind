import * as model from './products.model.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';
import { withDefaultCoordinates } from '../../utils/geo.js';
import { emitToAll } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';

/** Throws unless `user` owns the product (admins bypass). */
export async function assertOwner(user, productId) {
  const product = found(await model.findOwner(productId), 'Produit introuvable');
  if (user.role !== 'admin' && product.seller_id !== user.id) throw ApiError.forbidden('Ce produit ne vous appartient pas');
  return product;
}

export async function search(filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page), page);
}

export async function listMine(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, { ownerId: user.id }), page);
}

/** US-G07 — product detail (also counts a view when the viewer is not the owner). */
export async function getById(user, id) {
  const product = found(await model.findById(id), 'Produit introuvable');
  if (!product.is_active && product.seller_id !== user.id && user.role !== 'admin') throw ApiError.notFound('Produit introuvable');
  if (product.seller_id !== user.id) await model.incrementViews(id);
  return product;
}

export async function create(user, data) {
  const id = await model.create(user.id, withDefaultCoordinates(data));
  const product = await model.findById(id);
  // Market feed: everyone connected sees the new publication live.
  if (product.is_active) emitToAll(SocketEvents.PRODUCT_PUBLISHED, product);
  return product;
}

export async function update(user, id, data) {
  const before = await assertOwner(user, id);
  await model.update(id, data);
  const product = await model.findById(id);
  if (!before.is_active && product.is_active) emitToAll(SocketEvents.PRODUCT_PUBLISHED, product);
  return product;
}

export async function remove(user, id) {
  await assertOwner(user, id);
  await model.remove(id);
}
