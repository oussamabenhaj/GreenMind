import * as service from './requests.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  list: async (req, res) => res.json(await service.list(req.user, req.query)),
  listMine: async (req, res) => res.json(await service.listMine(req.user, req.query)),
  listReceived: async (req, res) => res.json(await service.listReceived(req.user, req.query)),
  getById: async (req, res) => res.json({ data: await service.getById(req.user, req.params.id) }),
  create: async (req, res) => res.status(201).json({ data: await service.create(req.user, req.body) }),
  update: async (req, res) => res.json({ data: await service.update(req.user, req.params.id, req.body) }),
  changeStatus: async (req, res) => res.json({ data: await service.changeStatus(req.user, req.params.id, req.body.status) }),
  listResponses: async (req, res) => res.json({ data: await service.listResponses(req.user, req.params.id) }),
  respond: async (req, res) => res.status(201).json({ data: await service.respond(req.user, req.params.id, req.body) }),
  updateResponse: async (req, res) => res.json({
    data: await service.updateResponse(req.user, req.params.id, req.params.responseId, req.body),
  }),
});
