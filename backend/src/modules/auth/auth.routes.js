import { Router } from 'express';
import controller from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { rateLimit } from '../../middlewares/rateLimit.js';
import { z, gouvernorat, lat, lng, intArray, text, bothCoordinates } from '../../utils/schemas.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const password = z.string().min(8, 'Au moins 8 caractères').max(128);

const registerBody = z.object({
  email: z.string().trim().email('Email invalide').max(255),
  password,
  role: z.enum(['seller', 'buyer', 'collector']),
  name: text(255).min(1),
  company_name: text(255).optional(),
  phone: text(30).optional(),
  gouvernorat,
  address: text(500).optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  category_ids: intArray.optional(),
}).refine(...bothCoordinates);

const loginBody = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const passwordBody = z.object({ current_password: z.string().min(1), new_password: password });

router.post('/register', authLimiter, validate({ body: registerBody }), controller.register);
router.post('/login', authLimiter, validate({ body: loginBody }), controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.patch('/password', authenticate, validate({ body: passwordBody }), controller.changePassword);

export default router;
