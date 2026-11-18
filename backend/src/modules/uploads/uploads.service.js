import * as model from './uploads.model.js';
import { ApiError } from '../../utils/ApiError.js';

/** Public URL of a stored file, e.g. http://localhost:5001/upload/abc.jpg */
const publicUrl = (req, filename) => `${req.protocol}://${req.get('host')}${model.PUBLIC_PREFIX}/${filename}`;

export function describeUploads(req) {
  const files = req.files ?? [];
  if (!files.length) throw ApiError.badRequest('Aucune image reçue (champ "images")');
  return files.map((f) => ({ url: publicUrl(req, f.filename), filename: f.filename, size: f.size, mimetype: f.mimetype }));
}

export function removeUpload(user, filename) {
  if (!model.isSafeName(filename)) throw ApiError.badRequest('Nom de fichier invalide');
  if (user.role !== 'admin' && !filename.startsWith(model.ownerPrefixOf(user.id))) {
    throw ApiError.forbidden('Ce fichier ne vous appartient pas');
  }
  if (!model.remove(filename)) throw ApiError.notFound('Fichier introuvable');
}
