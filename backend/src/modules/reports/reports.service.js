import * as model from './reports.model.js';
import { ApiError } from '../../utils/ApiError.js';

function period({ from, to }) {
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 365 * 24 * 3600 * 1000);
  if (start > end) throw ApiError.badRequest('from doit précéder to');
  return [start, end];
}

/** US-S06 — performance report of the signed-in actor (seller / collector / buyer). */
export async function overview(user, q) {
  const [from, to] = period(q);
  const builders = { seller: model.sellerOverview, collector: model.collectorOverview, buyer: model.buyerOverview };
  const build = builders[user.role];
  if (!build) throw ApiError.badRequest('Rapport disponible pour les vendeurs, acheteurs et points de collecte');
  return { role: user.role, period: { from, to }, ...(await build(user.id, from, to)) };
}

export const timeline = (user, q) => model.timeline(user, q.months ?? 12);
