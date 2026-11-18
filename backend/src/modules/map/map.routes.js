import { Router } from 'express';
import controller from './map.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, geoQuery, bothCoordinates, gouvernorat, intId, lat, lng, text, boolQuery } from '../../utils/schemas.js';
import { TUNISIA_BOUNDS as T } from '../../utils/geo.js';

const router = Router();
router.use(authenticate);

const TYPES = ['seller', 'collection_point', 'buyer'];

const bounds = z.string().transform((value, ctx) => {
  const b = value.split(',').map(Number);
  const valid = b.length === 4 && b.every(Number.isFinite) && b[0] < b[2] && b[1] < b[3]
    && b[0] >= T.minLng - 1 && b[2] <= T.maxLng + 1 && b[1] >= T.minLat - 1 && b[3] <= T.maxLat + 1;
  if (!valid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bounds = minLng,minLat,maxLng,maxLat (zone Tunisie)' });
    return z.NEVER;
  }
  return b;
});

const types = z.string().transform((value, ctx) => {
  const list = [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))];
  if (!list.length || list.some((t) => !TYPES.includes(t))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `types ∈ ${TYPES.join(', ')}` });
    return z.NEVER;
  }
  return list;
});

const base = {
  ...geoQuery,
  types: types.optional(),
  category_id: intId.optional(),
  gouvernorat: gouvernorat.optional(),
  q: text(120).optional(),
  open_now: boolQuery.optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
};

router.get('/', validate({ query: z.object({ ...base, bounds: bounds.optional() }).refine(...bothCoordinates) }), controller.markers);
router.get('/nearby', validate({ query: z.object({ ...base, lat, lng }) }), controller.nearby);

export default router;
