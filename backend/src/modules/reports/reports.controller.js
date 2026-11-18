import * as service from './reports.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  overview: async (req, res) => res.json({ data: await service.overview(req.user, req.query) }),
  timeline: async (req, res) => res.json({ data: await service.timeline(req.user, req.query) }),
});
