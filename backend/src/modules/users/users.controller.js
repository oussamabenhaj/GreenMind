import * as service from './users.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  getMe: async (req, res) => res.json({ data: await service.getMe(req.user) }),
  updateMe: async (req, res) => res.json({ data: await service.updateMe(req.user, req.body) }),
  getById: async (req, res) => res.json({ data: await service.getPublicProfile(req.params.id) }),
  listSellers: async (req, res) => res.json(await service.listSellers(req.query)),
  listBuyers: async (req, res) => res.json(await service.listBuyers(req.user, req.query)),
  listCollectors: async (req, res) => res.json(await service.listCollectors(req.query)),
});
