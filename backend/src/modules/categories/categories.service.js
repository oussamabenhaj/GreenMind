import * as model from './categories.model.js';
import { ApiError, found } from '../../utils/ApiError.js';

export const list = () => model.list();
export const getById = async (id) => found(await model.findById(id), 'Catégorie introuvable');
export const create = (data) => model.create(data);
export const update = async (id, data) => found(await model.update(id, data), 'Catégorie introuvable');
export async function remove(id) {
  if (!(await model.remove(id))) throw ApiError.notFound('Catégorie introuvable');
}
