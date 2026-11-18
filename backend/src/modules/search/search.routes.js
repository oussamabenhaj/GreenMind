import { Router } from 'express';
import controller from './search.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, text } from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const TYPES = ['products', 'sellers', 'buyers', 'offers', 'collection_points', 'requests'];
const types = z.string().transform((value, ctx) => {
  const list = value.split(',').map((t) => t.trim()).filter(Boolean);
  if (list.some((t) => !TYPES.includes(t))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `types ∈ ${TYPES.join(', ')}` });
    return z.NEVER;
  }
  return list;
});

router.get('/', validate({
  query: z.object({ q: text(120).min(2), types: types.optional(), limit: z.coerce.number().int().min(1).max(20).optional() }),
}), controller.quick);

router.get('/smart', validate({
  query: z.object({ q: text(300).min(2), limit: z.coerce.number().int().min(1).max(50).optional() }),
}), controller.smart);

export default router;
