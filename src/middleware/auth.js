import { verifyIdToken } from '../services/firebase.js';

// Express middleware to authenticate requests using Firebase ID tokens
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    const idToken = match[1];
    const decoded = await verifyIdToken(idToken);
    // Attach minimal user info for downstream handlers
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null
    };
    next();
  } catch (err) {
    const code = 401;
    const detail = typeof err === 'object' && err ? (err.code || err.message || String(err)) : 'Unknown error';
    console.error('Auth verification failed:', detail);
    res.status(code).json({ error: 'Invalid or expired token', detail });
  }
}
