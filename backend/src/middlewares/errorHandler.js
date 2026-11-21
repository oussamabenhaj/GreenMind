import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { tr } from '../i18n/index.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: tr(req.lang, 'Route introuvable : {{method}} {{url}}', { method: req.method, url: req.originalUrl }) } });
}

// Express recognises error handlers by their 4 arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // messages are written in French and translated to the request language (template matching handles dynamic parts)
  const t = (message) => tr(req.lang, message);
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: t('Données invalides'),
        details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: t(issue.message) })),
      },
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: t(err.message), details: err.details } });
  }
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Image trop lourde (5 Mo maximum)',
      LIMIT_FILE_COUNT: '3 images maximum',
      LIMIT_UNEXPECTED_FILE: '3 images maximum (champ "images")',
    };
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: t(messages[err.code] ?? err.message) } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: t('Corps JSON invalide') } });
  }
  // PostgreSQL errors
  const pgErrors = {
    23505: [409, 'CONFLICT', 'Cette ressource existe déjà'],
    23503: [400, 'INVALID_REFERENCE', 'Une ressource référencée est introuvable'],
    23514: [400, 'CONSTRAINT_VIOLATION', 'Valeur hors des limites autorisées'],
    '22P02': [400, 'BAD_REQUEST', 'Format de donnée invalide'],
  };
  if (pgErrors[err.code]) {
    const [status, code, message] = pgErrors[err.code];
    return res.status(status).json({ error: { code, message: t(message), details: env.isProduction ? undefined : err.detail } });
  }

  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: t('Erreur interne du serveur'), details: env.isProduction ? undefined : err.message },
  });
}
