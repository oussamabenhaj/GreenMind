import * as model from './categories.model.js';
import { ApiError, found } from '../../utils/ApiError.js';

import { translatedWrite } from '../../i18n/write.js';
import { invalidateReferenceCache } from '../../i18n/localize.js';
export const list = () => model.list();
export const getById = async (id) => found(await model.findById(id), 'Catégorie introuvable');
const FIELDS = ['name', 'description'];

export async function create(data) {
  const row = await translatedWrite('categories', FIELDS, null, data, (d) => model.create(d));
  invalidateReferenceCache();
  return model.findById(row.id);
}
export async function update(id, data) {
  found(await model.findById(id), 'Catégorie introuvable');
  await translatedWrite('categories', FIELDS, id, data, (d) => model.update(id, d));
  invalidateReferenceCache();
  return model.findById(id);
}
export async function remove(id) {
  if (!(await model.remove(id))) throw ApiError.notFound('Catégorie introuvable');
}
