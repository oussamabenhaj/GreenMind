import * as model from './requests.model.js';
import * as productsModel from '../products/products.model.js';
import { findAuthById } from '../users/users.model.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToUsers } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';
import { withDefaultCoordinates } from '../../utils/geo.js';

const OPEN = ['open', 'in_progress'];
const STATUS_LABELS = { fulfilled: 'satisfaite', closed: 'clôturée', cancelled: 'annulée', open: 'ré-ouverte', in_progress: 'en cours' };

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
export async function create(user, data) {
  if (data.target_user_id) {
    const target = await findAuthById(data.target_user_id);
    if (!target?.is_active || !['seller', 'collector'].includes(target.role)) {
      throw ApiError.badRequest('target_user_id doit être un vendeur ou un point de collecte actif');
    }
  }
  if (data.product_id) {
    const product = found(await productsModel.findOwner(data.product_id), 'Produit introuvable');
    data.category_id ??= product.category_id;
    data.target_user_id ??= product.seller_id;
  }
  if (!data.category_id && !data.target_user_id) throw ApiError.badRequest('category_id, product_id ou target_user_id est requis');

  const request = await model.findById(await model.create(user.id, withDefaultCoordinates(data)), user.id);
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
  await model.update(id, data);
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
  if (!OPEN.includes(request.status)) throw ApiError.conflict('Cette demande n\'accepte plus de réponses');
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
    await model.updateResponse(responseId, { status: data.status });
    if (data.status === 'accepted' && request.status === 'open') await model.update(requestId, { status: 'in_progress' });
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
