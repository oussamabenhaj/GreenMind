import * as service from './uploads.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  images: async (req, res) => res.status(201).json({ data: service.describeUploads(req) }),
  remove: async (req, res) => {
    service.removeUpload(req.user, req.params.filename);
    res.status(204).end();
  },
});
