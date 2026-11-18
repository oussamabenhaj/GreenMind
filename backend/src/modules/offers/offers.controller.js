import * as service from './offers.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  list: async (req, res) => res.json(await service.list(req.query)),
  listUpcoming: async (req, res) => res.json(await service.listUpcoming(req.query)),
  listMine: async (req, res) => res.json(await service.listMine(req.user, req.query)),
  getById: async (req, res) => res.json({ data: await service.getById(req.user, req.params.id) }),
  create: async (req, res) => res.status(201).json({ data: await service.create(req.user, req.body) }),
  update: async (req, res) => res.json({ data: await service.update(req.user, req.params.id, req.body) }),
  publish: async (req, res) => res.json({ data: await service.publish(req.user, req.params.id) }),
  close: async (req, res) => res.json({ data: await service.setStatus(req.user, req.params.id, 'closed') }),
  cancel: async (req, res) => res.json({ data: await service.setStatus(req.user, req.params.id, 'cancelled') }),
  remove: async (req, res) => {
    await service.remove(req.user, req.params.id);
    res.status(204).end();
  },
});
