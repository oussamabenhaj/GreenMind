import * as model from './users.model.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

/** US-S12 — full private profile of the signed-in user. */
export const getMe = async (user) => found(await model.findPrivateById(user.id), 'Utilisateur introuvable');

export async function updateMe(user, data) {
  if (user.role === 'admin' && data.category_ids) delete data.category_ids;
  return model.update(user.id, data);
}

export const getPublicProfile = async (id) => found(await model.findPublicById(id), 'Utilisateur introuvable');

/** US-B04 — directory of sellers. */
export async function listSellers(filters) {
  const page = paginationOf(filters);
  return paginated(await model.listByRole('seller', filters, page), page);
}

/** US-S09 — directory of buyers (potential customers). */
export async function listBuyers(user, filters) {
  if (user.role === 'buyer') throw ApiError.forbidden('La liste des acheteurs est réservée aux vendeurs et points de collecte');
  const page = paginationOf(filters);
  return paginated(await model.listByRole('buyer', filters, page), page);
}

export async function listCollectors(filters) {
  const page = paginationOf(filters);
  return paginated(await model.listByRole('collector', filters, page), page);
}
