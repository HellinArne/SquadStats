
import dotenv from 'dotenv';
dotenv.config();

// Allow multiple CORS origins via comma-separated env
function readCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || '';
  const list = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  // Add sensible defaults if none provided
  if (!list.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || '';
    const defaults = ['http://localhost:5173'];
    if (projectId) {
      defaults.push(
        `https://${projectId}.web.app`,
        `https://${projectId}.firebaseapp.com`,
        `https://europe-west1-${projectId}.cloudfunctions.net`
      );
    }
    return defaults;
  }
  return list;
}

/**
 * Read users as SQUADRATS_USER_<Name>=<ID>
 */
function readUsersFromEnv(env) {
  const users = [];
  for (const [key, val] of Object.entries(env)) {
    if (!key.startsWith('SQUADRATS_USER_')) continue;
    const name = key.replace('SQUADRATS_USER_', '');
    const id = String(val).trim();
    if (name && id) users.push({ name, id });
  }
  return users;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  corsOrigins: readCorsOrigins(),
  users: readUsersFromEnv(process.env)
};

if (!config.users.length) {
  console.warn('⚠️ No users found in .env. Add SQUADRATS_USER_<Name>=<ID> entries.');
}
