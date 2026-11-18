import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) => jwt.sign(
  { sub: user.id, role: user.role },
  env.jwt.secret,
  { expiresIn: env.jwt.expiresIn },
);

export const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

function readCookie(cookieHeader, name) {
  const part = cookieHeader?.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  if (!part) return null;
  try { return decodeURIComponent(part.slice(name.length + 1)); } catch { return null; }
}

/** Token from "Authorization: Bearer <token>" or from the HttpOnly session cookie. */
export function tokenFromHeaders(headers = {}) {
  const auth = headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return readCookie(headers.cookie, env.cookieName);
}

export const sessionCookie = (token, maxAgeSeconds = 7 * 24 * 3600) =>
  `${env.cookieName}=${token ? encodeURIComponent(token) : ''}; Path=/; Max-Age=${token ? maxAgeSeconds : 0}; HttpOnly; SameSite=Lax${env.isProduction ? '; Secure' : ''}`;
