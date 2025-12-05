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
  // CORS: for public GET endpoints we can return permissive headers.
  // Note: Browsers enforce CORS; "disabling" it isn't possible client-side. Using '*' avoids preflight for simple GETs.
  app.use((req, res, next) => {
    // Only apply permissive CORS for safe methods; auth-protected routes still require Bearer tokens.
    const isSafeMethod = req.method === 'GET' || req.method === 'HEAD';
    if (isSafeMethod) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD');
    }
    // Handle preflight if any
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');
      return res.sendStatus(204);
    }
    next();
  });

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
