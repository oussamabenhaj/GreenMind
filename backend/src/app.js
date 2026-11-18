import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, isOriginAllowed } from './config/env.js';
import { UPLOAD_DIR, PUBLIC_PREFIX } from './modules/uploads/uploads.model.js';
import apiRoutes from './routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

// Behind nginx / ingress: use the forwarded client IP (rate limiting).
app.set('trust proxy', 1);

// Uploaded images are displayed by the web app (another origin) → allow cross-origin reads.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => (isOriginAllowed(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'))),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (!env.isProduction) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start} ms)`));
    next();
  });
}

app.use(PUBLIC_PREFIX, express.static(UPLOAD_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'tunisia-circular-api', time: new Date().toISOString() }));

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
