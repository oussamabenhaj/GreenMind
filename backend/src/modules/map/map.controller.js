import * as service from './map.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  markers: async (req, res) => res.json(await service.markers(req.user, req.query)),
  nearby: async (req, res) => res.json(await service.nearby(req.user, req.query)),
});
