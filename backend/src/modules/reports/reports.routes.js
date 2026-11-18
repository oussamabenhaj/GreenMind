import { Router } from 'express';
import controller from './reports.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, dateTime } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate, authorize('seller', 'collector', 'buyer'));

router.get('/overview', validate({ query: z.object({ from: dateTime.optional(), to: dateTime.optional() }) }), controller.overview);
router.get('/timeline', validate({ query: z.object({ months: z.coerce.number().int().min(1).max(36).optional() }) }), controller.timeline);

export default router;
