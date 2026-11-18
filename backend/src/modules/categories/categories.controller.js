import * as service from './categories.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  list: async (req, res) => res.json({ data: await service.list() }),
  getById: async (req, res) => res.json({ data: await service.getById(req.params.id) }),
  create: async (req, res) => res.status(201).json({ data: await service.create(req.body) }),
  update: async (req, res) => res.json({ data: await service.update(req.params.id, req.body) }),
  remove: async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  },
});
