import { Router } from 'express';
import controller from './exchanges.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, uuid, intId, paginationQuery, gouvernorat, unit, positiveQty, isoDate, url, text, lat, lng, bothCoordinates } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const listQuery = z.object({
  ...paginationQuery,
  q: text(120).optional(),
  status: z.enum(['active', 'closed']).optional(),
  category_id: intId.optional(),
  gouvernorat: gouvernorat.optional(),
  author_id: uuid.optional(),
});

const fields = {
  wanted_category_id: intId.nullable().optional(),
  wanted_label: text(200).min(2),
  wanted_quantity: positiveQty,
  wanted_unit: unit.default('kg'),
  given_label: text(200).min(2),
  given_quantity: positiveQty,
  given_unit: unit.default('unit'),
  image_url: url.nullable().optional(),
  description: text(3000).optional(),
  max_total_wanted: positiveQty.nullable().optional(),
  gouvernorat: gouvernorat.optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  expires_at: isoDate.nullable().optional(),
};

const responseBody = z.object({ quantity_offered: positiveQty, message: text(2000).optional() });

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/mine', validate({ query: listQuery }), controller.listMine);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('buyer'), validate({ body: z.object(fields).refine(...bothCoordinates) }), controller.create);
router.patch('/:id', validate({
  params: idParams,
  body: z.object({ ...fields, status: z.enum(['active', 'closed']) }).partial().omit({ wanted_unit: true, given_unit: true })
    .extend({ wanted_unit: unit.optional(), given_unit: unit.optional() }),
}), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);
router.post('/:id/responses', validate({ params: idParams, body: responseBody }), controller.respond);
router.patch('/:id/responses/:responseId', validate({
  params: z.object({ id: uuid, responseId: uuid }),
  body: responseBody.partial().extend({ status: z.enum(['accepted', 'rejected', 'withdrawn']).optional() }),
}), controller.updateResponse);

export default router;
