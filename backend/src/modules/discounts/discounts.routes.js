import { Router } from 'express';
import controller from './discounts.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, uuid, intId, paginationQuery, gouvernorat, positiveQty, dateTime, text } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const listQuery = z.object({
  ...paginationQuery,
  state: z.enum(['active', 'upcoming', 'expired', 'all']).optional(),
  seller_id: uuid.optional(),
  product_id: uuid.optional(),
  category_id: intId.optional(),
  market_id: intId.optional(),
  gouvernorat: gouvernorat.optional(),
  min_percentage: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['recent', 'percentage', 'ending_soon']).optional(),
});

const fields = {
  title: text(200).min(2),
  description: text(2000).optional(),
  percentage: z.coerce.number().gt(0).max(100),
  min_quantity: positiveQty.nullable().optional(),
  starts_at: dateTime.optional(),
  ends_at: dateTime,
  is_active: z.boolean().optional(),
};

const createBody = z.object({ product_id: uuid, ...fields })
  .refine((d) => d.ends_at > (d.starts_at ?? new Date()), { message: 'ends_at doit être dans le futur et après starts_at', path: ['ends_at'] });

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/mine', authorize('seller'), validate({ query: listQuery }), controller.listMine);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('seller'), validate({ body: createBody }), controller.create);
router.patch('/:id', authorize('seller'), validate({ params: idParams, body: z.object(fields).partial() }), controller.update);
router.delete('/:id', authorize('seller'), validate({ params: idParams }), controller.remove);

export default router;
