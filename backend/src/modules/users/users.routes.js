import { Router } from 'express';
import controller from './users.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  z, idParams, paginationQuery, geoQuery, bothCoordinates, gouvernorat, lat, lng, intArray, intId, url, text, boolQuery,
} from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

const directoryQuery = z.object({
  ...paginationQuery,
  ...geoQuery,
  q: text(120).optional(),
  gouvernorat: gouvernorat.optional(),
  category_id: intId.optional(),
  verified: boolQuery.optional(),
  sort: z.enum(['recent', 'name', 'distance']).optional(),
}).refine(...bothCoordinates);

const updateMeBody = z.object({
  name: text(255).min(1).optional(),
  company_name: text(255).nullable().optional(),
  phone: text(30).nullable().optional(),
  bio: text(2000).nullable().optional(),
  avatar_url: url.nullable().optional(),
  gouvernorat: gouvernorat.optional(),
  address: text(500).nullable().optional(),
  lat: lat.nullable().optional(),
  lng: lng.nullable().optional(),
  category_ids: intArray.optional(),
}).strict().refine((d) => (d.lat === undefined) === (d.lng === undefined), bothCoordinates[1]);

router.get('/me', controller.getMe);
router.patch('/me', validate({ body: updateMeBody }), controller.updateMe);
router.get('/sellers', validate({ query: directoryQuery }), controller.listSellers);
router.get('/buyers', authorize('seller', 'collector'), validate({ query: directoryQuery }), controller.listBuyers);
router.get('/collectors', validate({ query: directoryQuery }), controller.listCollectors);
router.get('/:id', validate({ params: idParams }), controller.getById);

export default router;
