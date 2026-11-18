import { ApiError } from '../utils/ApiError.js';

/** In-memory fixed-window rate limiter (per IP). Use a shared store if you run several instances. */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits) if (record.resetAt < now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = hits.get(key);
    if (!record || record.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    record.count += 1;
    if (record.count > max) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return next(new ApiError(429, 'Trop de tentatives, réessayez plus tard', 'TOO_MANY_REQUESTS'));
    }
    next();
  };
}
