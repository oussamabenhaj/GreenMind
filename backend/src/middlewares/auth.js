import { ApiError } from '../utils/ApiError.js';
import { tokenFromHeaders, verifyToken } from '../utils/jwt.js';
import * as usersModel from '../modules/users/users.model.js';

/** Resolves the account behind a token, or throws 401. */
export async function userFromToken(token) {
  if (!token) throw ApiError.unauthorized();
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Session invalide ou expirée');
  }
  const user = await usersModel.findAuthById(payload.sub);
  if (!user || !user.is_active) throw ApiError.unauthorized('Compte désactivé ou introuvable');
  return user;
}

/** Requires a valid JWT. Sets req.user = { id, role, name, is_verified }. */
export async function authenticate(req, res, next) {
  try {
    req.user = await userFromToken(tokenFromHeaders(req.headers));
    next();
  } catch (error) {
    next(error);
  }
}

/** Same as authenticate but lets anonymous requests through (req.user = null). */
export async function optionalAuth(req, res, next) {
  const token = tokenFromHeaders(req.headers);
  if (!token) {
    req.user = null;
    return next();
  }
  return authenticate(req, res, next);
}

/** Restricts a route to the given roles (admin always allowed). */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'admin' && !roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Réservé aux rôles : ${roles.join(', ')}`));
  }
  next();
};
