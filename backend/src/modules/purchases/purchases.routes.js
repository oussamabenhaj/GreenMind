import { Router } from 'express';
import controller from './purchases.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, uuid, intId, paginationQuery, positiveQty, money, dateTime, text } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate, authorize('collector', 'seller'));

const statuses = ['pending', 'confirmed', 'received', 'cancelled'];

const listQuery = z.object({
  ...paginationQuery,
  status: z.enum(statuses).optional(),
  collection_point_id: uuid.optional(),
  seller_id: uuid.optional(),
  category_id: intId.optional(),
  from: dateTime.optional(),
  to: dateTime.optional(),
});

const editable = {
  label: text(200).min(1).optional(),
  quantity_kg: positiveQty,
  unit_price: money.nullable().optional(),
  scheduled_at: dateTime.nullable().optional(),
  notes: text(2000).nullable().optional(),
};

const createBody = z.object({
  collection_point_id: uuid,
  seller_id: uuid.optional(),
  product_id: uuid.optional(),
  category_id: intId.optional(),
  stock_item_id: uuid.optional(),
  ...editable,
});

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('collector'), validate({ body: createBody }), controller.create);
router.patch('/:id', authorize('collector'), validate({ params: idParams, body: z.object(editable).partial() }), controller.update);
router.patch('/:id/status', validate({
  params: idParams,
  body: z.object({ status: z.enum(['confirmed', 'received', 'cancelled']), stock_item_id: uuid.optional() }),
}), controller.changeStatus);

export default router;
