import * as model from './exchanges.model.js';
import { notify, NotificationTypes } from '../notifications/notifications.service.js';
import { emitToAll } from '../../socket/index.js';
import { SocketEvents } from '../../socket/events.js';
import { transaction } from '../../config/db.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';
import { withDefaultCoordinates } from '../../utils/geo.js';
import { findPrivateById } from '../users/users.model.js';

import { translatedWrite } from '../../i18n/write.js';
const ratio = (e) => `${Number(e.wanted_quantity)} ${e.wanted_unit} de ${e.wanted_label} → ${Number(e.given_quantity)} ${e.given_unit} de ${e.given_label}`;

const isExpired = (e) => !!e.expires_at && String(e.expires_at) < new Date().toISOString().slice(0, 10);

/** Remaining room under the author's total collection target (if any). */
function assertUnderCap(exchange, accepted, extraQuantity) {
  if (exchange.max_total_wanted == null) return;
  const max = Number(exchange.max_total_wanted);
  if (accepted >= max) throw ApiError.conflict('L’objectif de cette proposition est déjà atteint');
  if (accepted + Number(extraQuantity) > max) {
    throw ApiError.conflict(`Quantité supérieure à l’objectif restant (${max - accepted} ${exchange.wanted_unit})`);
  }
}

async function getOwned(user, id) {
  const exchange = found(await model.findById(id, user.id), 'Proposition d’échange introuvable');
  if (user.role !== 'admin' && exchange.author_id !== user.id) throw ApiError.forbidden('Cette proposition ne vous appartient pas');
  return exchange;
}

/** Market feed: active exchange proposals. */
export async function list(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, user.id), page);
}

export async function listMine(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, user.id, { authorId: user.id }), page);
}

/** Detail: the author sees every response, others only their own. */
export async function getById(user, id) {
  const exchange = found(await model.findById(id, user.id), 'Proposition d’échange introuvable');
  const isAuthor = exchange.author_id === user.id || user.role === 'admin';
  exchange.responses = await model.listResponses(id, isAuthor ? null : user.id);
  return exchange;
}

/** A buyer publishes "for every X of A you bring, I give Y of B" (optional image). */
const FIELDS = ['wanted_label', 'given_label', 'description'];

export async function create(user, data) {
  const me = await findPrivateById(user.id);
  const located = data.lat != null ? data : { ...data, lat: me.lat ?? undefined, lng: me.lng ?? undefined };
  const id = await translatedWrite('exchange_offers', FIELDS, null, withDefaultCoordinates({ gouvernorat: me.gouvernorat ?? undefined, ...located }), (d) => model.create(user.id, d));
  const exchange = await model.findById(id, user.id);
  emitToAll(SocketEvents.EXCHANGE_PUBLISHED, exchange);
  await notify(await model.idsConcerned(exchange.wanted_category_id, user.id), {
    type: NotificationTypes.EXCHANGE_NEW,
    title: 'Nouvelle proposition d’échange',
    message: `${exchange.author.company_name || exchange.author.name} : ${ratio(exchange)}`,
    data: { exchange_id: id },
    link: `/market?exchange=${id}`,
  });
  return exchange;
}

export async function update(user, id, data) {
  await getOwned(user, id);
  await translatedWrite('exchange_offers', FIELDS, id, data, (d) => model.update(id, d));
  return model.findById(id, user.id);
}

export async function remove(user, id) {
  await getOwned(user, id);
  await model.remove(id);
}

/* ---------------- responses ---------------- */

export async function respond(user, id, data) {
  const exchange = found(await model.findById(id, user.id), 'Proposition d’échange introuvable');
  if (exchange.status !== 'active') throw ApiError.conflict('Cette proposition est clôturée');
  if (isExpired(exchange)) throw ApiError.conflict('Cette proposition a expiré');
  if (exchange.author_id === user.id) throw ApiError.badRequest('Vous ne pouvez pas répondre à votre propre proposition');
  assertUnderCap(exchange, Number(exchange.accepted_quantity ?? 0), data.quantity_offered);
  const responseId = await model.createResponse(id, user.id, data);
  if (!responseId) throw ApiError.conflict('Vous avez déjà une proposition en cours sur cet échange');
  const response = await model.findResponse(id, responseId);
  const units = Math.floor(Number(data.quantity_offered) / Number(exchange.wanted_quantity));
  await notify(exchange.author_id, {
    type: NotificationTypes.EXCHANGE_RESPONSE,
    title: 'Nouvelle réponse à votre échange',
    message: `${response.responder.company_name || response.responder.name} propose ${data.quantity_offered} ${exchange.wanted_unit} de ${exchange.wanted_label}${units ? ` (soit ${units * Number(exchange.given_quantity)} ${exchange.given_unit} de ${exchange.given_label})` : ''}`,
    data: { exchange_id: id, response_id: response.id },
    link: `/market?exchange=${id}`,
  });
  return response;
}

/**
 * Accepts one response while honouring the author's total target. The exchange
 * row is locked so concurrent acceptances serialise; the cap trigger from
 * migration 003 is the database-level backstop and surfaces as 23514.
 */
async function acceptUnderCap(exchangeId, responseId) {
  try {
    await transaction(async (db) => {
      const locked = found(await model.lock(exchangeId, db), 'Proposition d’échange introuvable');
      const accepted = await model.acceptedQuantity(exchangeId, db);
      const response = found(await model.findResponse(exchangeId, responseId, db), 'Réponse introuvable');
      assertUnderCap(locked, accepted, response.quantity_offered);
      await model.updateResponse(responseId, { status: 'accepted' }, db);
    });
  } catch (error) {
    if (error.code === '23514') throw ApiError.conflict('Quantité supérieure à l’objectif de cette proposition');
    throw error;
  }
}

/** Author: accept / reject. Responder: edit pending proposal or withdraw it. */
export async function updateResponse(user, id, responseId, data) {
  const exchange = found(await model.findById(id, user.id), 'Proposition d’échange introuvable');
  const response = found(await model.findResponse(id, responseId), 'Réponse introuvable');
  const isAuthor = exchange.author_id === user.id || user.role === 'admin';

  if (data.status === 'accepted' || data.status === 'rejected') {
    if (!isAuthor) throw ApiError.forbidden('Seul l’auteur de l’échange peut accepter ou refuser');
    if (response.status === 'withdrawn') throw ApiError.conflict('Cette réponse a été retirée');
    if (data.status === 'accepted' && response.status !== 'accepted') await acceptUnderCap(id, responseId);
    else await model.updateResponse(responseId, { status: data.status });
    await notify(response.responder_id, {
      type: NotificationTypes.EXCHANGE_RESPONSE_STATUS,
      title: data.status === 'accepted' ? 'Échange accepté 🤝' : 'Échange refusé',
      message: ratio(exchange),
      data: { exchange_id: id, response_id: responseId, status: data.status },
      link: `/market?exchange=${id}`,
    });
  } else {
    if (response.responder_id !== user.id) throw ApiError.forbidden('Seul l’auteur de la réponse peut la modifier');
    if (response.status !== 'pending') throw ApiError.conflict('Seule une réponse en attente peut être modifiée');
    await model.updateResponse(responseId, data);
  }
  return model.findResponse(id, responseId);
}
