import * as service from './storage.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  overview: async (req, res) => res.json({ data: await service.getOverview(req.user, req.params.pointId) }),
  updateCapacity: async (req, res) => res.json({
    data: await service.updateCapacity(req.user, req.params.pointId, req.body.storage_capacity_kg),
  }),
  listItems: async (req, res) => res.json({ data: await service.listItems(req.user, req.params.pointId) }),
  createItem: async (req, res) => res.status(201).json({ data: await service.createItem(req.user, req.params.pointId, req.body) }),
  updateItem: async (req, res) => res.json({
    data: await service.updateItem(req.user, req.params.pointId, req.params.itemId, req.body),
  }),
  removeItem: async (req, res) => {
    await service.removeItem(req.user, req.params.pointId, req.params.itemId);
    res.status(204).end();
  },
  addMovement: async (req, res) => res.status(201).json({ data: await service.addMovement(req.user, req.params.pointId, req.body) }),
  listMovements: async (req, res) => res.json(await service.listMovements(req.user, req.params.pointId, req.query)),
});
