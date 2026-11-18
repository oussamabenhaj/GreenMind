import * as model from './collection-points.model.js';
import { transaction } from '../../config/db.js';
import { ApiError, found } from '../../utils/ApiError.js';
import { paginated, paginationOf } from '../../utils/pagination.js';

/** Throws unless `user` manages the collection point (admins bypass). */
export async function assertManager(user, pointId) {
  const point = found(await model.findOwner(pointId), 'Point de collecte introuvable');
  if (user.role !== 'admin' && point.manager_id !== user.id) throw ApiError.forbidden('Vous ne gérez pas ce point de collecte');
  return point;
}

/** US-G01 / US-G02 — public directory (verified & active points only). */
export async function list(filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page), page);
}

export async function listMine(user, filters) {
  const page = paginationOf(filters);
  return paginated(await model.list(filters, page, { managerId: user.id }), page);
}

export async function getById(user, id) {
  const point = found(await model.findById(id), 'Point de collecte introuvable');
  const visible = point.is_active && point.is_verified;
  if (!visible && point.manager_id !== user.id && user.role !== 'admin') throw ApiError.notFound('Point de collecte introuvable');
  return point;
}

export async function create(user, { schedule, ...data }) {
  const id = await model.create(user.id, data);
  if (schedule) await transaction((db) => model.replaceSchedule(id, schedule, db));
  return model.findById(id);
}

/** Changing the address / coordinates sends the point back to admin review. */
export async function update(user, id, data) {
  await assertManager(user, id);
  const moved = data.lat !== undefined || data.lng !== undefined;
  await model.update(id, moved && user.role !== 'admin' ? { ...data, is_verified: false } : data);
  return model.findById(id);
}

/** US-PC08 — set the GPS position of the point (from the device geolocation). */
export const updateLocation = (user, id, location) => update(user, id, location);

export async function remove(user, id) {
  await assertManager(user, id);
  await model.remove(id);
}

export async function getSchedule(user, id) {
  await getById(user, id);
  return model.getSchedule(id);
}

/** US-PC07 — working hours. */
export async function replaceSchedule(user, id, days) {
  await assertManager(user, id);
  const seen = new Set();
  for (const d of days) {
    if (seen.has(d.day_of_week)) throw ApiError.badRequest(`Jour ${d.day_of_week} en double`);
    seen.add(d.day_of_week);
  }
  await transaction((db) => model.replaceSchedule(id, days, db));
  return model.getSchedule(id);
}
