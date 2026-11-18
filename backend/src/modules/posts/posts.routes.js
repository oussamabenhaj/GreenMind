import { Router } from 'express';
import controller from './posts.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, uuid, intId, paginationQuery, gouvernorat, url, text } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const listQuery = z.object({
  ...paginationQuery,
  author_id: uuid.optional(),
  product_id: uuid.optional(),
  category_id: intId.optional(),
  gouvernorat: gouvernorat.optional(),
  q: text(120).optional(),
});

const body = z.object({
  content: text(5000).min(1),
  images: z.array(url).max(10).optional(),
  product_id: uuid.nullable().optional(),
});

router.get('/', validate({ query: listQuery }), controller.list);
router.get('/mine', validate({ query: listQuery }), controller.listMine);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('seller', 'collector'), validate({ body }), controller.create);
router.patch('/:id', authorize('seller', 'collector'), validate({ params: idParams, body: body.partial() }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
