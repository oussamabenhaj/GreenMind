import multer from 'multer';
import { Router } from 'express';

import controller from './uploads.controller.js';
import { UPLOAD_DIR, EXTENSIONS, newFilename } from './uploads.model.js';
import { authenticate } from '../../middlewares/auth.js';
import { ApiError } from '../../utils/ApiError.js';

const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, newFilename(req.user.id, file.mimetype)),
  }),
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) =>
    EXTENSIONS[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest('Formats acceptés : JPG, PNG, WEBP, GIF')),
});

const router = Router();
router.use(authenticate);

/** POST /api/uploads/images — multipart field "images" (1 to 3 files, 5 MB max each). */
router.post('/images', upload.array('images', MAX_FILES), controller.images);
router.delete('/:filename', controller.remove);

export default router;
