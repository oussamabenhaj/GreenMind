import * as service from './products.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  search: async (req, res) => res.json(await service.search(req.query)),
  listMine: async (req, res) => res.json(await service.listMine(req.user, req.query)),
  getById: async (req, res) => res.json({ data: await service.getById(req.user, req.params.id) }),
  create: async (req, res) => res.status(201).json({ data: await service.create(req.user, req.body) }),
  update: async (req, res) => res.json({ data: await service.update(req.user, req.params.id, req.body) }),
  remove: async (req, res) => {
    await service.remove(req.user, req.params.id);
    res.status(204).end();
  },
});
