import * as model from './offers.model.js';
import * as pointsModel from '../collection-points/collection-points.model.js';
import * as storageModel from '../storage/storage.model.js';
import { assertManager } from '../collection-points/collection-points.service.js';
import { idsInterestedIn } from '../users/users.model.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToRole } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

async function getOwned(user, id) {
  const offer = found(await model.findById(id), 'Offre introuvable');
  if (user.role !== 'admin' && offer.publisher_id !== user.id) throw ApiError.forbidden('Cette offre ne vous appartient pas');
  return offer;
}

/** Inherits location from the collection point and checks the stock item. */
async function prepare(user, data, { inheritLocation = true } = {}) {
  const payload = { ...data };
  if (data.collection_point_id) {
    await assertManager(user, data.collection_point_id);
    if (inheritLocation) {
      const point = await pointsModel.findById(data.collection_point_id);
      if (payload.lat === undefined) Object.assign(payload, { lat: point.lat, lng: point.lng });
      payload.gouvernorat ??= point.gouvernorat;
    }
  }
  if (data.stock_item_id) {
    if (!data.collection_point_id) throw ApiError.badRequest('collection_point_id est requis avec stock_item_id');
    const item = found(await storageModel.findItem(data.collection_point_id, data.stock_item_id), 'Article de stock introuvable');
    payload.category_id ??= item.category_id;
    if (data.quantity !== undefined && data.unit === 'kg' && data.quantity > item.quantity_kg) {
      throw ApiError.conflict(`Quantité supérieure au stock disponible (${item.quantity_kg} kg)`);
    }
  }
  return payload;
}

async function announce(offer) {
  emitToRole('buyer', SocketEvents.OFFER_PUBLISHED, offer);
  const buyers = await idsInterestedIn(offer.category_id, ['buyer'], offer.publisher_id);
  await notify(buyers, {
    type: NotificationTypes.OFFER_PUBLISHED,
    title: offer.timing === 'upcoming' ? 'Nouvelle offre à venir' : 'Nouvelle offre disponible',
    message: `${offer.collection_point?.name || offer.publisher.company_name || offer.publisher.name} : ${offer.title} (${offer.quantity} ${offer.unit})`,
    data: { offer_id: offer.id, category_id: offer.category_id },
    link: `/offers/${offer.id}`,
  });
}

/** US-PC02 — available offers (published, ongoing or upcoming). */
export async function list(filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page), page);
}

/** US-S11 — upcoming offers. */
export const listUpcoming = (filters) => list({ ...filters, timing: 'upcoming' });

export async function listMine(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, { publisherId: user.id }), page);
}

export async function getById(user, id) {
  const offer = found(await model.findById(id), 'Offre introuvable');
  if (offer.status === 'draft' && offer.publisher_id !== user.id && user.role !== 'admin') throw ApiError.notFound('Offre introuvable');
  return offer;
}

/** US-PC03 — prepare (draft) and optionally publish immediately. */
export async function create(user, { publish = false, ...data }) {
  const payload = await prepare(user, data);
  if (publish) Object.assign(payload, { status: 'published', published_at: new Date() });
  const offer = await model.findById(await model.create(user.id, payload));
  if (publish) await announce(offer);
  return offer;
}

export async function update(user, id, data) {
  const offer = await getOwned(user, id);
  if (['closed', 'cancelled'].includes(offer.status)) throw ApiError.conflict('Offre clôturée : modification impossible');
  const payload = await prepare(
    user,
    { ...data, collection_point_id: data.collection_point_id ?? offer.collection_point_id ?? undefined },
    { inheritLocation: data.collection_point_id !== undefined },
  );
  await model.update(id, payload);
  return model.findById(id);
}

export async function publish(user, id) {
  const offer = await getOwned(user, id);
  if (offer.status !== 'draft') throw ApiError.conflict(`Seul un brouillon peut être publié (statut : ${offer.status})`);
  if (offer.ends_at && new Date(offer.ends_at) < new Date()) throw ApiError.conflict('La date de fin est dépassée');
  await model.update(id, { status: 'published', published_at: new Date() });
  const published = await model.findById(id);
  await announce(published);
  return published;
}

export async function setStatus(user, id, status) {
  const offer = await getOwned(user, id);
  if (offer.status !== 'published' && offer.status !== 'draft') throw ApiError.conflict('Offre déjà clôturée');
  await model.update(id, { status });
  return model.findById(id);
}

export async function remove(user, id) {
  await getOwned(user, id);
  await model.remove(id);
}
