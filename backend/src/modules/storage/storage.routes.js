/** Mounted at /api/collection-points/:pointId/storage (US-PC06). */
import { Router } from 'express';
import controller from './storage.controller.js';
import { authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { z, uuid, intId, paginationQuery, positiveQty, dateTime, text } from '../../utils/schemas.js';

const router = Router({ mergeParams: true });
router.use(authorize('collector'));

const pointParams = z.object({ pointId: uuid });
const itemParams = z.object({ pointId: uuid, itemId: uuid });
const kg = z.coerce.number().min(0).max(1000000000);

const itemBody = z.object({
  label: text(200).min(1),
  category_id: intId.nullable().optional(),
  min_threshold_kg: kg.nullable().optional(),
});

router.get('/', validate({ params: pointParams }), controller.overview);
router.patch('/capacity', validate({ params: pointParams, body: z.object({ storage_capacity_kg: kg }) }), controller.updateCapacity);

router.get('/items', validate({ params: pointParams }), controller.listItems);
router.post('/items', validate({
  params: pointParams, body: itemBody.extend({ initial_quantity_kg: positiveQty.optional() }),
}), controller.createItem);
router.patch('/items/:itemId', validate({ params: itemParams, body: itemBody.partial() }), controller.updateItem);
router.delete('/items/:itemId', validate({ params: itemParams }), controller.removeItem);

router.get('/movements', validate({
  params: pointParams,
  query: z.object({
    ...paginationQuery,
    stock_item_id: uuid.optional(),
    type: z.enum(['in', 'out', 'adjust']).optional(),
    from: dateTime.optional(),
    to: dateTime.optional(),
  }),
}), controller.listMovements);
router.post('/movements', validate({
  params: pointParams,
  body: z.object({
    stock_item_id: uuid,
    type: z.enum(['in', 'out', 'adjust']),
    quantity_kg: kg,
    reason: text(500).optional(),
  }).refine((d) => d.type === 'adjust' || d.quantity_kg > 0, { message: 'quantity_kg doit être > 0', path: ['quantity_kg'] }),
}), controller.addMovement);

export default router;
