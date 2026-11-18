import { Router } from 'express';
import controller from './chat.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, idParams, uuid, url, paginationQuery, dateTime, text, boolQuery } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const messageBody = z.object({
  body: text(4000).min(1),
  attachments: z.array(url).max(5).optional(),
  context_type: z.enum(['product', 'request', 'offer', 'purchase']).optional(),
  context_id: uuid.optional(),
}).refine((d) => !d.context_type === !d.context_id, { message: 'context_type et context_id vont ensemble', path: ['context_id'] });

router.get('/', validate({ query: z.object({ ...paginationQuery, q: text(120).optional(), unread_only: boolQuery.optional() }) }), controller.list);
router.get('/unread-count', controller.unreadCount);
router.post('/', validate({ body: z.object({ participant_id: uuid, message: messageBody.optional() }) }), controller.start);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.get('/:id/messages', validate({
  params: idParams,
  query: z.object({ before: dateTime.optional(), limit: z.coerce.number().int().min(1).max(100).optional() }),
}), controller.listMessages);
router.post('/:id/messages', validate({ params: idParams, body: messageBody }), controller.sendMessage);
router.post('/:id/read', validate({ params: idParams }), controller.markRead);

export default router;
