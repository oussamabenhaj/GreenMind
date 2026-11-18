import { Router } from 'express';
import controller from './requests.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  z, idParams, uuid, intId, paginationQuery, geoQuery, bothCoordinates, gouvernorat, lat, lng,
  unit, money, positiveQty, isoDate, text, boolQuery,
} from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const statuses = ['open', 'in_progress', 'fulfilled', 'closed', 'cancelled'];

const listQuery = z.object({
  ...paginationQuery,
  ...geoQuery,
  q: text(120).optional(),
  status: z.enum(statuses).optional(),
  category_id: intId.optional(),
  market_id: intId.optional(),
  buyer_id: uuid.optional(),
  product_id: uuid.optional(),
  gouvernorat: gouvernorat.optional(),
  min_quantity: positiveQty.optional(),
  include_closed: boolQuery.optional(),
  sort: z.enum(['recent', 'needed_by', 'quantity_desc', 'distance']).optional(),
}).refine(...bothCoordinates);

const fields = {
  title: text(200).min(3),
  description: text(5000).optional(),
  category_id: intId.optional(),
  market_id: intId.nullable().optional(),
  quantity: positiveQty,
  unit: unit.optional(),
  max_price_per_unit: money.nullable().optional(),
  gouvernorat: gouvernorat.optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  needed_by: isoDate.nullable().optional(),
};
const createBody = z.object({ ...fields, product_id: uuid.optional(), target_user_id: uuid.optional() }).refine(...bothCoordinates);

const responseBody = z.object({
  message: text(3000).optional(),
  product_id: uuid.nullable().optional(),
  proposed_quantity: positiveQty.nullable().optional(),
  proposed_price_per_unit: money.nullable().optional(),
});
const responseParams = z.object({ id: uuid, responseId: uuid });

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/mine', authorize('buyer'), validate({ query: listQuery }), controller.listMine);
router.get('/received', authorize('seller', 'collector'), validate({ query: listQuery }), controller.listReceived);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('buyer'), validate({ body: createBody }), controller.create);
router.patch('/:id', authorize('buyer'), validate({ params: idParams, body: z.object(fields).partial().refine(...bothCoordinates) }), controller.update);
router.patch('/:id/status', authorize('buyer'), validate({
  params: idParams, body: z.object({ status: z.enum(statuses) }),
}), controller.changeStatus);

router.get('/:id/responses', validate({ params: idParams }), controller.listResponses);
router.post('/:id/responses', authorize('seller', 'collector'), validate({ params: idParams, body: responseBody }), controller.respond);
router.patch('/:id/responses/:responseId', validate({
  params: responseParams,
  body: responseBody.extend({ status: z.enum(['accepted', 'rejected', 'withdrawn']).optional() }),
}), controller.updateResponse);

export default router;
