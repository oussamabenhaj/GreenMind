import * as model from './map.model.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * US-G01 / US-G02 — markers for the interactive map.
 * Default layers: sellers + collection points. `buyer` is available to sellers / collectors.
 */
export async function markers(user, f) {
  const types = f.types ?? ['seller', 'collection_point'];
  if (types.includes('buyer') && user.role === 'buyer') throw ApiError.forbidden('La couche "buyer" est réservée aux vendeurs et points de collecte');
  const filters = { ...f, limit: f.limit ?? 300 };
  const jobs = types.map((type) => (type === 'collection_point' ? model.collectionPoints(filters) : model.users(type, filters)));
  const layers = await Promise.all(jobs);
  const data = layers.flat();
  if (f.lat !== undefined) data.sort((a, b) => a.distance_km - b.distance_km);
  return {
    data,
    meta: { total: data.length, by_type: Object.fromEntries(types.map((t, i) => [t, layers[i].length])) },
  };
}

/** Closest actors around a position (radius 25 km by default). */
export const nearby = (user, f) => markers(user, { radius_km: 25, limit: 50, ...f });
