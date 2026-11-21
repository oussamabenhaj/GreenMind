import * as model from './requests.model.js';
import * as productsModel from '../products/products.model.js';
import { findAuthById } from '../users/users.model.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToUsers } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { transaction } from '../../config/db.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';
import { withDefaultCoordinates } from '../../utils/geo.js';
import { quantityDiscountPercentage, quantityDiscountedPrice } from '../../utils/pricing.js';

import { translatedWrite } from '../../i18n/write.js';
const OPEN = ['open', 'in_progress'];
const STATUS_LABELS = { fulfilled: 'satisfaite', closed: 'clôturée', cancelled: 'annulée', open: 'ré-ouverte', in_progress: 'en cours' };

const toKg = (qty, unit) => Number(qty) * (unit === 't' ? 1000 : 1);

/** Keeps a request inside the listing's available quantity and minimum order. */
function assertListingQuantity(product, quantity, unit = 'kg') {
  if (!product) return;
  const sameUnit = unit === product.unit;
  const qty = sameUnit ? Number(quantity) : (unit === 'unit' || product.unit === 'unit' ? null : toKg(quantity, unit));
  const available = sameUnit ? Number(product.quantity_available)
    : (product.unit === 'unit' ? null : toKg(product.quantity_available, product.unit));
  if (qty !== null && available !== null && qty > available) {
    throw ApiError.conflict(`Quantité supérieure au stock annoncé (${product.quantity_available} ${product.unit})`);
  }
  if (product.min_order_quantity != null) {
    const min = sameUnit ? Number(product.min_order_quantity)
      : (product.unit === 'unit' ? null : toKg(product.min_order_quantity, product.unit));
    if (qty !== null && min !== null && qty < min) {
      throw ApiError.conflict(`Quantité inférieure au minimum de commande (${product.min_order_quantity} ${product.unit})`);
    }
  }
}

/**
 * The seller enables the volume discount on the listing, so the buyer never
 * chooses it: an order above half the stock gets -10 %, the whole stock -15 %.
 * The buyer's declared maximum is then capped at the discounted unit price.
 */
function applyQuantityDiscount(product, data) {
  const percentage = quantityDiscountPercentage(product, data.quantity, data.unit ?? product?.unit);
  data.quantity_discount = percentage > 0;
  if (!percentage) return data;
  const discounted = quantityDiscountedPrice(product, percentage);
  if (discounted == null) return data;
  if (data.max_price_per_unit == null || Number(data.max_price_per_unit) > discounted) {
    data.max_price_per_unit = discounted;
  }
  return data;
}

async function getOwned(user, id) {
  const request = found(await model.findById(id, user.id), 'Demande introuvable');
  if (user.role !== 'admin' && request.buyer_id !== user.id) throw ApiError.forbidden('Cette demande ne vous appartient pas');
  return request;
}

/** US-G04 / US-G07 — browse requests. */
export async function list(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, user.id), page);
}

export async function listMine(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.listByBuyer(user.id, filters, page), page);
}

/** US-S07 / US-PC04 — requests received by a seller or a collection point. */
export async function listReceived(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.listReceived(user.id, filters, page), page);
}

export async function getById(user, id) {
  const request = found(await model.findById(id, user.id), 'Demande introuvable');
  const isOwner = request.buyer_id === user.id || user.role === 'admin';
  if (request.target_user_id && !isOwner && request.target_user_id !== user.id) throw ApiError.notFound('Demande introuvable');
  request.responses = await model.listResponses(id, { responderId: isOwner ? null : user.id });
  return request;
}

/** US-B03 — a buyer sends a request (needs + quantity); concerned sellers/collectors are notified live. */
const FIELDS = ['title', 'description'];

export async function create(user, data) {
  if (data.target_user_id) {
    const target = await findAuthById(data.target_user_id);
    if (!target?.is_active || !['seller', 'collector'].includes(target.role)) {
      throw ApiError.badRequest('target_user_id doit être un vendeur ou un point de collecte actif');
    }
  }
  if (data.product_id) {
    const product = found(await productsModel.findById(data.product_id), 'Produit introuvable');
    if (!product.is_active) throw ApiError.conflict('Annonce désactivée : demande impossible');
    assertListingQuantity(product, data.quantity, data.unit ?? 'kg');
    applyQuantityDiscount(product, data);
    data.category_id ??= product.category_id;
    data.target_user_id ??= product.seller_id;
  } else {
    data.quantity_discount = false;
  }
  if (!data.category_id && !data.target_user_id) throw ApiError.badRequest('category_id, product_id ou target_user_id est requis');

  const request = await model.findById(await translatedWrite('buy_requests', FIELDS, null, withDefaultCoordinates(data), (d) => model.create(user.id, d)), user.id);
  const recipients = data.target_user_id ? [data.target_user_id] : await model.idsConcernedByCategory(data.category_id, user.id);
  emitToUsers(recipients, SocketEvents.REQUEST_NEW, request);
  await notify(recipients, {
    type: NotificationTypes.REQUEST_NEW,
    title: data.target_user_id ? 'Nouvelle demande qui vous est adressée' : 'Nouvelle demande d\'achat',
    message: `${request.buyer.company_name || request.buyer.name} recherche ${request.quantity} ${request.unit} — ${request.title}`,
    data: { request_id: request.id, category_id: request.category_id },
    link: `/requests/${request.id}`,
  });
  return request;
}

export async function update(user, id, data) {
  const request = await getOwned(user, id);
  if (!OPEN.includes(request.status)) throw ApiError.conflict('Une demande clôturée ne peut plus être modifiée');
  const quantity = data.quantity ?? request.quantity;
  const unit = data.unit ?? request.unit;
  const quantityChanged = data.quantity !== undefined || data.unit !== undefined;
  const product = request.product_id ? await productsModel.findById(request.product_id) : null;
  if (product) {
    if (quantityChanged) assertListingQuantity(product, quantity, unit);
    const discount = applyQuantityDiscount(product, { quantity, unit, max_price_per_unit: data.max_price_per_unit });
    data.quantity_discount = discount.quantity_discount;
    if (discount.max_price_per_unit !== data.max_price_per_unit) data.max_price_per_unit = discount.max_price_per_unit;
  } else {
    data.quantity_discount = false;
  }
  await translatedWrite('buy_requests', FIELDS, id, data, (d) => model.update(id, d));
  return model.findById(id, user.id);
}

export async function changeStatus(user, id, status) {
  const request = await getOwned(user, id);
  if (request.status === status) return request;
  if (!OPEN.includes(request.status) && status !== 'open') throw ApiError.conflict('Cette demande est déjà clôturée');
  await model.update(id, { status });
  await notify(await model.activeResponderIds(id), {
    type: NotificationTypes.REQUEST_STATUS,
    title: `Demande ${STATUS_LABELS[status]}`,
    message: `La demande « ${request.title} » est ${STATUS_LABELS[status]}.`,
    data: { request_id: id, status },
    link: `/requests/${id}`,
  });
  return model.findById(id, user.id);
}

/* ---------------- responses ---------------- */

export async function listResponses(user, requestId) {
  const request = found(await model.findById(requestId, user.id), 'Demande introuvable');
  const isOwner = request.buyer_id === user.id || user.role === 'admin';
  return model.listResponses(requestId, { responderId: isOwner ? null : user.id });
}

/** A seller / collection point answers a request (price & quantity proposal). */
export async function respond(user, requestId, data) {
  const request = found(await model.findById(requestId, user.id), 'Demande introuvable');
  if (request.status !== 'open') throw ApiError.conflict('Cette demande n\'accepte plus de réponses');
  if (data.proposed_quantity != null && Number(data.proposed_quantity) > Number(request.quantity)) {
    throw ApiError.conflict(`Quantité proposée supérieure à la quantité demandée (${request.quantity} ${request.unit})`);
  }
  if (request.buyer_id === user.id) throw ApiError.badRequest('Vous ne pouvez pas répondre à votre propre demande');
  if (request.target_user_id && request.target_user_id !== user.id) throw ApiError.forbidden('Cette demande est adressée à un autre acteur');
  if (data.product_id) {
    const product = found(await productsModel.findOwner(data.product_id), 'Produit introuvable');
    if (product.seller_id !== user.id) throw ApiError.forbidden('Ce produit ne vous appartient pas');
  }
  const response = await model.findResponse(requestId, await model.createResponse(requestId, user.id, data));
  await notify(request.buyer_id, {
    type: NotificationTypes.REQUEST_RESPONSE,
    title: 'Nouvelle réponse à votre demande',
    message: `${response.responder.company_name || response.responder.name} a répondu à « ${request.title} »`,
    data: { request_id: requestId, response_id: response.id },
    link: `/requests/${requestId}`,
  });
  return response;
}

/**
 * Accepts a single proposal. The request row is locked so two concurrent
 * acceptances serialise; uq_request_responses_one_accepted (migration 003)
 * then rejects the second one with 23505.
 */
async function acceptExclusively(requestId, responseId) {
  try {
    await transaction(async (db) => {
      await model.lockRequest(requestId, db);
      await model.updateResponse(responseId, { status: 'accepted' }, db);
      await model.markInProgress(requestId, db);
    });
  } catch (error) {
    if (error.code === '23505') throw ApiError.conflict('Une autre proposition a déjà été acceptée pour cette demande');
    throw error;
  }
}

/**
 * Buyer: accept / reject. Responder: edit its proposal or withdraw it.
 */
export async function updateResponse(user, requestId, responseId, data) {
  const request = found(await model.findById(requestId, user.id), 'Demande introuvable');
  const response = found(await model.findResponse(requestId, responseId), 'Réponse introuvable');
  const isBuyer = request.buyer_id === user.id || user.role === 'admin';
  const isResponder = response.responder_id === user.id;

  if (data.status && ['accepted', 'rejected'].includes(data.status)) {
    if (!isBuyer) throw ApiError.forbidden('Seul l\'acheteur peut accepter ou refuser une réponse');
    if (response.status === 'withdrawn') throw ApiError.conflict('Cette réponse a été retirée');
    if (data.status === 'accepted' && response.status !== 'accepted') await acceptExclusively(requestId, responseId);
    else await model.updateResponse(responseId, { status: data.status });
    await notify(response.responder_id, {
      type: NotificationTypes.REQUEST_RESPONSE_STATUS,
      title: data.status === 'accepted' ? 'Votre proposition est acceptée 🎉' : 'Votre proposition a été refusée',
      message: `Demande « ${request.title} »`,
      data: { request_id: requestId, response_id: responseId, status: data.status },
      link: `/requests/${requestId}`,
    });
  } else {
    if (!isResponder) throw ApiError.forbidden('Seul l\'auteur peut modifier sa réponse');
    if (response.status !== 'pending') throw ApiError.conflict('Seule une réponse en attente peut être modifiée');
    await model.updateResponse(responseId, data);
  }
  return model.findResponse(requestId, responseId);
}
