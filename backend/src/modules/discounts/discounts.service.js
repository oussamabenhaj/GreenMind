import * as model from './discounts.model.js';
import { assertOwner as assertProductOwner } from '../products/products.service.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { idsInterestedIn } from '../users/users.model.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

async function assertOwner(user, id) {
  const discount = found(await model.findById(id), 'Remise introuvable');
  if (user.role !== 'admin' && discount.seller_id !== user.id) throw ApiError.forbidden('Cette remise ne vous appartient pas');
  return discount;
}

/** US-B07 — discounts offered by sellers (active by default). */
export async function list(filters) {
  const page = paginationOf(filters);
  return paginated(await model.list({ state: 'active', ...filters }, page), page);
}

export async function listMine(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, { sellerId: user.id }), page);
}

export const getById = async (id) => found(await model.findById(id), 'Remise introuvable');

/** US-S10 — a seller creates a discount on one of its products; interested buyers are notified. */
export async function create(user, data) {
  const product = await assertProductOwner(user, data.product_id);
  const discount = await model.findById(await model.create(product.seller_id, data));
  const buyers = await idsInterestedIn(product.category_id, ['buyer', 'collector'], user.id);
  await notify(buyers, {
    type: NotificationTypes.DISCOUNT_NEW,
    title: `-${discount.percentage}% sur ${product.title}`,
    message: `${discount.seller.company_name || discount.seller.name} propose une remise : ${discount.title}`,
    data: { discount_id: discount.id, product_id: product.id },
    link: `/discounts/${discount.id}`,
  });
  return discount;
}

export async function update(user, id, data) {
  const current = await assertOwner(user, id);
  const startsAt = data.starts_at ?? new Date(current.starts_at);
  const endsAt = data.ends_at ?? new Date(current.ends_at);
  if (endsAt <= startsAt) throw ApiError.badRequest('ends_at doit être postérieur à starts_at');
  await model.update(id, data);
  return model.findById(id);
}

export async function remove(user, id) {
  await assertOwner(user, id);
  await model.remove(id);
}
