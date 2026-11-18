import { Router } from 'express';
import controller from './print.controller.js';
import { RESOURCES } from './print.service.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, uuid, boolQuery } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

router.get('/:resource/:id', validate({
  params: z.object({ resource: z.enum(RESOURCES), id: uuid }),
  query: z.object({ autoprint: boolQuery.optional() }),
}), controller.render);

export default router;
