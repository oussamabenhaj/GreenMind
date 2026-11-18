import { Router } from 'express';
import controller from './notifications.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, paginationQuery, boolQuery } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({
  query: z.object({ ...paginationQuery, unread_only: boolQuery.optional(), type: z.string().max(50).optional() }),
}), controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.delete('/read', controller.removeAllRead);
router.patch('/:id/read', validate({ params: idParams }), controller.markRead);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
