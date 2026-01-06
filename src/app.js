import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { config } from './config.js';
// Single-app static serving removed to restore separate dev (Vite:5173, API:3000)

export function createApp() {
  const app = express();
  app.use(morgan('dev'));
  app.use(express.json());
  // CORS: allow configured origins and required methods/headers
  const corsOptions = {
    origin: (origin, callback) => {
      // allow same-origin (no origin header) and configured dev/prod origins
      try {
        if (!origin) return callback(null, true);
        // Allow all localhost/127.0.0.1 origins (any port) in dev
        const url = new URL(origin);
        const host = url.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return callback(null, true);
        // Exact matches from config
        if (config.corsOrigins.includes(origin)) return callback(null, true);
      } catch {}
      return callback(null, false);
    },
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    optionsSuccessStatus: 204
  };
  app.use(cors(corsOptions));
  // Ensure preflight is handled for all routes
  app.options('*', cors(corsOptions));

  // No path normalization; keep explicit '/api' prefix for local dev

  // Mount API under '/api' for local dev separation
  app.use('/api', apiRouter);

  // Static frontend serving is disabled for local dev; use Vite at http://localhost:5173

  // Error handler (returns JSON)
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}
