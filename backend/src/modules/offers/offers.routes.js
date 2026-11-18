import { Router } from 'express';
import controller from './offers.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  z, idParams, uuid, intId, paginationQuery, geoQuery, bothCoordinates, gouvernorat, lat, lng,
  unit, money, positiveQty, dateTime, text,
} from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const listQuery = z.object({
  ...paginationQuery,
  ...geoQuery,
  q: text(120).optional(),
  timing: z.enum(['upcoming', 'ongoing', 'ended']).optional(),
  status: z.enum(['draft', 'published', 'closed', 'cancelled']).optional(),
  category_id: intId.optional(),
  market_id: intId.optional(),
  gouvernorat: gouvernorat.optional(),
  collection_point_id: uuid.optional(),
  publisher_id: uuid.optional(),
  min_quantity: positiveQty.optional(),
  max_price: money.optional(),
  sort: z.enum(['recent', 'starts_at', 'price_asc', 'distance']).optional(),
}).refine(...bothCoordinates);

const fields = {
  title: text(200).min(3),
  description: text(5000).optional(),
  collection_point_id: uuid.optional(),
  category_id: intId.optional(),
  market_id: intId.nullable().optional(),
  stock_item_id: uuid.nullable().optional(),
  quantity: positiveQty,
  unit: unit.default('kg'),
  price_per_unit: money.nullable().optional(),
  gouvernorat: gouvernorat.optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  starts_at: dateTime.optional(),
  ends_at: dateTime.nullable().optional(),
};
const datesOk = [(d) => !d.ends_at || !d.starts_at || d.ends_at > d.starts_at, { message: 'ends_at doit suivre starts_at', path: ['ends_at'] }];

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/upcoming', validate({ query: listQuery }), controller.listUpcoming);
router.get('/mine', authorize('collector'), validate({ query: listQuery }), controller.listMine);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('collector'), validate({
  body: z.object({ ...fields, publish: z.boolean().optional() }).refine(...bothCoordinates).refine(...datesOk),
}), controller.create);
router.patch('/:id', authorize('collector'), validate({
  params: idParams,
  body: z.object(fields).partial().omit({ unit: true }).extend({ unit: unit.optional() }).refine(...bothCoordinates).refine(...datesOk),
}), controller.update);
router.post('/:id/publish', authorize('collector'), validate({ params: idParams }), controller.publish);
router.post('/:id/close', authorize('collector'), validate({ params: idParams }), controller.close);
router.post('/:id/cancel', authorize('collector'), validate({ params: idParams }), controller.cancel);
router.delete('/:id', authorize('collector'), validate({ params: idParams }), controller.remove);

export default router;
