
import express from 'express';
import { config } from '../config.js';
import { statsForUsers } from '../services/batch.js';
import { coverageForUsers } from '../services/batch.js';
import { fetchUserStatsCached } from '../services/trophies.js';
import { fetchUserCoverageCached } from '../services/geojson.js';
import { fetchCoverageViaServer } from '../services/geojson-server.js';
import { requireAuth } from '../middleware/auth.js';
import fetch from 'node-fetch';

export const apiRouter = express.Router();

// --- Sanity: simple health ping ---
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

// --- USERS: this is the one you were missing ---
apiRouter.get('/users', (_req, res) => {
  res.json({ users: config.users });
});

// --- Stats (batch) ---
apiRouter.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const names = (req.query.names ? String(req.query.names).split(',').map(s => s.trim()) : null);
    const users = names ? config.users.filter(u => names.includes(u.name)) : config.users;
    const data = await statsForUsers(users);
    res.json({ count: users.length, data });
  } catch (err) { next(err); }
});

// --- Stats (single): accepts NAME or raw ID ---
apiRouter.get('/stats/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    let user = config.users.find(u => u.name === nameOrId);
    if (!user) user = { name: nameOrId, id: nameOrId };
    const data = await fetchUserStatsCached(user);
    res.json(data);
  } catch (err) { next(err); }
});

// --- Coverage (batch) ---
apiRouter.get('/coverage', requireAuth, async (req, res, next) => {
  try {
    const names = (req.query.names ? String(req.query.names).split(',').map(s => s.trim()) : null);
    const users = names ? config.users.filter(u => names.includes(u.name)) : config.users;
    const data = await coverageForUsers(users);
    res.json({ count: users.length, data });
  } catch (err) { next(err); }
});

// --- Coverage (single): accepts NAME or raw ID ---
apiRouter.get('/coverage/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    let user = config.users.find(u => u.name === nameOrId);
    if (!user) user = { name: nameOrId, id: nameOrId };
    const fc = await fetchUserCoverageCached(user);
    res.json(fc);
  } catch (err) { next(err); }
  
});

apiRouter.get('/coverage-direct/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    let user = config.users.find(u => u.name === nameOrId);
    if (!user) user = { name: nameOrId, id: nameOrId };

    const fc = await fetchCoverageViaServer(user);
    res.json({ name: user.name, id: user.id, featureCollection: fc });
  } catch (err) { next(err); }
});

// Standings proxy removed: ranking retrieval is not supported via this backend.

