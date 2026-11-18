/**
 * Upload storage on the local filesystem (backend/upload/ by default).
 * Swap this model for S3 / Cloudinary later without touching the routes.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const UPLOAD_DIR = path.resolve(backendRoot, process.env.UPLOAD_DIR || 'upload');
export const PUBLIC_PREFIX = '/upload';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

/** `<userId-8>-<timestamp>-<random>.<ext>` — the prefix lets us check ownership on delete. */
export function newFilename(userId, mimetype) {
  return `${userId.slice(0, 8)}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}${EXTENSIONS[mimetype]}`;
}

export const ownerPrefixOf = (userId) => `${userId.slice(0, 8)}-`;

/** Only plain generated names are accepted (no path traversal). */
export const isSafeName = (name) => /^[a-f0-9]{8}-\d{13}-[a-f0-9]{10}\.(jpg|png|webp|gif)$/.test(name);

export function remove(name) {
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}
