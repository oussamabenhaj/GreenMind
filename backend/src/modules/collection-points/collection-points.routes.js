import { Router } from 'express';
import controller from './collection-points.controller.js';
import storageRoutes from '../storage/storage.routes.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  z, idParams, intId, intArray, paginationQuery, geoQuery, bothCoordinates, gouvernorat, lat, lng, text, boolQuery,
} from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:MM');
const scheduleDay = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  opens_at: time.optional(),
  closes_at: time.optional(),
  is_closed: z.boolean().optional(),
}).refine((d) => d.is_closed || (d.opens_at && d.closes_at && d.closes_at > d.opens_at), {
  message: 'opens_at < closes_at requis (ou is_closed = true)',
});
const schedule = z.array(scheduleDay).max(7);

const listQuery = z.object({
  ...paginationQuery,
  ...geoQuery,
  q: text(120).optional(),
  gouvernorat: gouvernorat.optional(),
  category_id: intId.optional(),
  open_now: boolQuery.optional(),
}).refine(...bothCoordinates);

const fields = {
  name: text(255).min(2),
  description: text(2000).optional(),
  address: text(500).optional(),
  gouvernorat,
  lat,
  lng,
  phone: text(30).optional(),
  email: z.string().email().max(255).optional(),
  storage_capacity_kg: z.coerce.number().min(0).max(1000000000).optional(),
  category_ids: intArray.optional(),
  is_active: z.boolean().optional(),
};

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/mine', authorize('collector'), validate({ query: listQuery }), controller.listMine);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('collector'), validate({ body: z.object({ ...fields, schedule: schedule.optional() }) }), controller.create);
router.patch('/:id', authorize('collector'), validate({
  params: idParams, body: z.object(fields).partial().refine(...bothCoordinates),
}), controller.update);
router.patch('/:id/location', authorize('collector'), validate({
  params: idParams, body: z.object({ lat, lng, address: text(500).optional() }),
}), controller.updateLocation);
router.delete('/:id', authorize('collector'), validate({ params: idParams }), controller.remove);

router.get('/:id/schedule', validate({ params: idParams }), controller.getSchedule);
router.put('/:id/schedule', authorize('collector'), validate({
  params: idParams, body: z.object({ days: schedule }),
}), controller.replaceSchedule);

// US-PC06 — storage management, nested under the point.
router.use('/:pointId/storage', storageRoutes);

export default router;
