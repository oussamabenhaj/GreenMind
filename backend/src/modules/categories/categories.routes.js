import { Router } from 'express';
import controller from './categories.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, intIdParams, text } from '../../utils/schemas.js';

const router = Router();

const body = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,80}$/, 'slug: minuscules, chiffres et tirets'),
  name: text(120).min(1),
  description: text(1000).optional(),
  keywords: z.array(text(60)).max(50).optional(),
});

router.get('/', controller.list);
router.get('/:id', validate({ params: intIdParams }), controller.getById);
router.post('/', authenticate, authorize('admin'), validate({ body }), controller.create);
router.patch('/:id', authenticate, authorize('admin'), validate({ params: intIdParams, body: body.partial() }), controller.update);
router.delete('/:id', authenticate, authorize('admin'), validate({ params: intIdParams }), controller.remove);

export default router;
