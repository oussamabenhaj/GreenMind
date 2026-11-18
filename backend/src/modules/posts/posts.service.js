import * as model from './posts.model.js';
import { assertOwner as assertProductOwner } from '../products/products.service.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

async function assertAuthor(user, id) {
  const post = found(await model.findById(id), 'Publication introuvable');
  if (user.role !== 'admin' && post.author_id !== user.id) throw ApiError.forbidden('Cette publication ne vous appartient pas');
  return post;
}

/** Feed of posts (filter by author, product, category, governorate). */
export async function list(filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page), page);
}

export const getById = async (id) => found(await model.findById(id), 'Publication introuvable');

/** US-S04 — a seller (or collection point) publishes a post, optionally linked to one of its products. */
export async function create(user, data) {
  if (data.product_id) await assertProductOwner(user, data.product_id);
  return model.findById(await model.create(user.id, data));
}

export async function update(user, id, data) {
  await assertAuthor(user, id);
  if (data.product_id) await assertProductOwner(user, data.product_id);
  await model.update(id, data);
  return model.findById(id);
}

export async function remove(user, id) {
  await assertAuthor(user, id);
  await model.remove(id);
}
