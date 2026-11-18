import { Router } from 'express';
import controller from './admin.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, paginationQuery, boolQuery, text } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/stats', controller.stats);
router.get('/users', validate({
  query: z.object({
    ...paginationQuery,
    role: z.enum(['seller', 'buyer', 'collector', 'admin']).optional(),
    is_verified: boolQuery.optional(),
    is_active: boolQuery.optional(),
    q: text(120).optional(),
  }),
}), controller.listUsers);
router.patch('/users/:id', validate({
  params: idParams,
  body: z.object({ is_verified: z.boolean().optional(), is_active: z.boolean().optional() })
    .refine((d) => d.is_verified !== undefined || d.is_active !== undefined, { message: 'is_verified ou is_active requis' }),
}), controller.updateUser);
router.get('/collection-points/pending', controller.pendingCollectionPoints);
router.patch('/collection-points/:id/verify', validate({
  params: idParams, body: z.object({ is_verified: z.boolean() }),
}), controller.verifyCollectionPoint);

export default router;
