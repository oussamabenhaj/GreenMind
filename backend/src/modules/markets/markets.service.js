import * as model from './markets.model.js';
import { ApiError, found } from '../../utils/ApiError.js';

import { translatedWrite } from '../../i18n/write.js';
import { invalidateReferenceCache } from '../../i18n/localize.js';
export const list = () => model.list();
export const getById = async (id) => found(await model.findById(id), 'Marché introuvable');
const FIELDS = ['name', 'description'];

export async function create(data) {
  const row = await translatedWrite('markets', FIELDS, null, data, (d) => model.create(d));
  invalidateReferenceCache();
  return model.findById(row.id);
}
export async function update(id, data) {
  found(await model.findById(id), 'Marché introuvable');
  await translatedWrite('markets', FIELDS, id, data, (d) => model.update(id, d));
  invalidateReferenceCache();
  return model.findById(id);
}
export async function remove(id) {
  if (!(await model.remove(id))) throw ApiError.notFound('Marché introuvable');
}
