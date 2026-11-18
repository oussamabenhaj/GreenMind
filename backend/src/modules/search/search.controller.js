import * as service from './search.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  quick: async (req, res) => res.json({ data: await service.quickSearch(req.user, req.query) }),
  smart: async (req, res) => res.json({ data: await service.smartSearch(req.user, req.query) }),
});
