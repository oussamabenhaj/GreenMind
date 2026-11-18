/** Reusable zod schemas. */
import { z } from 'zod';
import { GOVERNORATES, TUNISIA_BOUNDS } from './geo.js';

export { z };

export const uuid = z.string().uuid('Identifiant invalide');
export const idParams = z.object({ id: uuid });
export const intId = z.coerce.number().int().positive();
export const intIdParams = z.object({ id: intId });

export const lat = z.coerce.number().min(TUNISIA_BOUNDS.minLat).max(TUNISIA_BOUNDS.maxLat);
export const lng = z.coerce.number().min(TUNISIA_BOUNDS.minLng).max(TUNISIA_BOUNDS.maxLng);
export const gouvernorat = z.enum(GOVERNORATES, { errorMap: () => ({ message: 'Gouvernorat invalide' }) });
export const unit = z.enum(['kg', 't', 'l', 'unit']);
export const money = z.coerce.number().min(0).max(100000000);
export const positiveQty = z.coerce.number().positive().max(100000000);
export const url = z.string().url().max(2048);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : YYYY-MM-DD');
export const dateTime = z.coerce.date();
export const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
export const intArray = z.array(z.coerce.number().int().positive()).max(50);
export const text = (max) => z.string().trim().max(max);

export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

/** lat + lng + radius_km (both coordinates required together). */
export const geoQuery = {
  lat: lat.optional(),
  lng: lng.optional(),
  radius_km: z.coerce.number().positive().max(1000).optional(),
};

export const bothCoordinates = [
  (data) => (data.lat === undefined) === (data.lng === undefined),
  { message: 'lat et lng doivent être fournis ensemble', path: ['lat'] },
];
