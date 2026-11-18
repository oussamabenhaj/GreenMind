import { Router } from 'express';
import controller from './products.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  z, idParams, uuid, intId, paginationQuery, geoQuery, bothCoordinates, gouvernorat, lat, lng,
  unit, money, positiveQty, isoDate, url, text, boolQuery,
} from '../../utils/schemas.js';

const router = Router();
router.use(authenticate);

export const productFiltersQuery = z.object({
  ...paginationQuery,
  ...geoQuery,
  q: text(120).optional(),
  category_id: intId.optional(),
  market_id: intId.optional(),
  seller_id: uuid.optional(),
  product_id: uuid.optional(),
  gouvernorat: gouvernorat.optional(),
  min_price: money.optional(),
  max_price: money.optional(),
  min_quantity: positiveQty.optional(),
  has_discount: boolQuery.optional(),
  is_active: boolQuery.optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc', 'quantity_desc', 'popular', 'distance']).optional(),
}).refine(...bothCoordinates);

const productBody = z.object({
  title: text(200).min(2),
  description: text(5000).optional(),
  category_id: intId,
  market_id: intId.nullable().optional(),
  unit: unit.default('kg'),
  quantity_available: z.coerce.number().min(0).max(100000000),
  price_per_unit: money.nullable().optional(),
  min_order_quantity: positiveQty.nullable().optional(),
  images: z.array(url).max(10).optional(),
  gouvernorat,
  address: text(500).optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  available_from: isoDate.nullable().optional(),
  available_until: isoDate.nullable().optional(),
  is_active: z.boolean().optional(),
});

router.get('/', validate({ query: productFiltersQuery }), controller.search);
router.get('/mine', authorize('seller'), validate({ query: productFiltersQuery }), controller.listMine);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', authorize('seller'), validate({ body: productBody.refine(...bothCoordinates) }), controller.create);
router.patch('/:id', authorize('seller'), validate({
  params: idParams,
  body: productBody.partial().omit({ unit: true }).extend({ unit: unit.optional() }).refine(...bothCoordinates),
}), controller.update);
router.delete('/:id', authorize('seller'), validate({ params: idParams }), controller.remove);

export default router;
