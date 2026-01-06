
import express from 'express';
import { config } from '../config.js';
import { getFriends, addFriend, removeFriend, updateFriendFlags } from '../services/friends.js';
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
apiRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await getFriends();
    res.json({ users });
  } catch (err) { next(err); }
});

// --- Friends management ---
apiRouter.get('/friends', requireAuth, async (_req, res, next) => {
  try {
    const users = await getFriends();
    res.json({ users });
  } catch (err) { next(err); }
});
apiRouter.post('/friends', requireAuth, express.json(), async (req, res, next) => {
  try {
    const { name, id, show, standings } = req.body || {};
    const saved = await addFriend({ name, id, show, standings });
    res.json(saved);
  } catch (err) { next(err); }
});
apiRouter.delete('/friends/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    const out = await removeFriend(nameOrId);
    res.json(out);
  } catch (err) { next(err); }
});

// Update flags: { show?: boolean, standings?: boolean }
apiRouter.patch('/friends/:nameOrId', requireAuth, express.json(), async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    const { show, standings } = req.body || {};
    const out = await updateFriendFlags(nameOrId, { show, standings });
    res.json(out);
  } catch (err) { next(err); }
});

// --- Stats (batch) ---
apiRouter.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const names = (req.query.names ? String(req.query.names).split(',').map(s => s.trim()) : null);
    const all = await getFriends();
    const users = names ? all.filter(u => names.includes(u.name)) : all;
    const data = await statsForUsers(users);
    res.json({ count: users.length, data });
  } catch (err) { next(err); }
});

// --- Stats (single): accepts NAME or raw ID ---
apiRouter.get('/stats/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    const all = await getFriends();
    let user = all.find(u => u.name === nameOrId);
    if (!user) user = { name: nameOrId, id: nameOrId };
    const data = await fetchUserStatsCached(user);
    res.json(data);
  } catch (err) { next(err); }
});

// --- Coverage (batch) ---
apiRouter.get('/coverage', requireAuth, async (req, res, next) => {
  try {
    const names = (req.query.names ? String(req.query.names).split(',').map(s => s.trim()) : null);
    const all = await getFriends();
    const users = names ? all.filter(u => names.includes(u.name)) : all;
    const data = await coverageForUsers(users);
    res.json({ count: users.length, data });
  } catch (err) { next(err); }
});

// --- Coverage (single): accepts NAME or raw ID ---
apiRouter.get('/coverage/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    const all = await getFriends();
    let user = all.find(u => u.name === nameOrId);
    if (!user) user = { name: nameOrId, id: nameOrId };
    const fc = await fetchUserCoverageCached(user);
    res.json(fc);
  } catch (err) { next(err); }
  
});

apiRouter.get('/coverage-direct/:nameOrId', requireAuth, async (req, res, next) => {
  try {
    const { nameOrId } = req.params;
    const all = await getFriends();
    let user = all.find(u => u.name === nameOrId);
    if (!user) user = { name: nameOrId, id: nameOrId };

  const fc = await fetchCoverageViaServer(user);
    res.json({ name: user.name, id: user.id, featureCollection: fc });
  } catch (err) { next(err); }
});

// Standings proxy removed: ranking retrieval is not supported via this backend.

