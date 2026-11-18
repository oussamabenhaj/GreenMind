import * as service from './admin.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  stats: async (req, res) => res.json({ data: await service.stats() }),
  listUsers: async (req, res) => res.json(await service.listUsers(req.query)),
  updateUser: async (req, res) => res.json({ data: await service.updateUser(req.params.id, req.body) }),
  pendingCollectionPoints: async (req, res) => res.json({ data: await service.pendingCollectionPoints() }),
  verifyCollectionPoint: async (req, res) => res.json({
    data: await service.verifyCollectionPoint(req.params.id, req.body.is_verified),
  }),
});
