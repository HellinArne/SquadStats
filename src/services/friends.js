import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'src', 'data');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');

async function ensureDataFile() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
  try {
    await fs.access(FRIENDS_FILE);
  } catch {
    const initial = { users: [] };
    await fs.writeFile(FRIENDS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export async function getFriends() {
  await ensureDataFile();
  const raw = await fs.readFile(FRIENDS_FILE, 'utf-8');
  const j = JSON.parse(raw || '{}');
  const users = Array.isArray(j.users) ? j.users : [];
  // ensure flags default to true
  return users.map(u => ({ name: u.name, id: u.id, show: u.show !== false, standings: u.standings !== false }));
}

export async function addFriend(user) {
  await ensureDataFile();
  const raw = await fs.readFile(FRIENDS_FILE, 'utf-8');
  const j = JSON.parse(raw || '{}');
  const users = Array.isArray(j.users) ? j.users : [];
  const name = String(user.name || '').trim();
  const id = String(user.id || '').trim();
  if (!name || !id) throw new Error('name and id are required');
  const existsIdx = users.findIndex(u => String(u.name).toLowerCase() === name.toLowerCase());
  const show = user.show === false ? false : true;
  const standings = user.standings === false ? false : true;
  if (existsIdx >= 0) users[existsIdx] = { name, id, show, standings }; else users.push({ name, id, show, standings });
  await fs.writeFile(FRIENDS_FILE, JSON.stringify({ users }, null, 2), 'utf-8');
  return { name, id, show, standings };
}

export async function removeFriend(nameOrId) {
  await ensureDataFile();
  const raw = await fs.readFile(FRIENDS_FILE, 'utf-8');
  const j = JSON.parse(raw || '{}');
  const users = Array.isArray(j.users) ? j.users : [];
  const key = String(nameOrId || '').trim().toLowerCase();
  const filtered = users.filter(u => String(u.name).toLowerCase() !== key && String(u.id).toLowerCase() !== key);
  await fs.writeFile(FRIENDS_FILE, JSON.stringify({ users: filtered }, null, 2), 'utf-8');
  return { ok: true };
}

export async function updateFriendFlags(nameOrId, fields) {
  await ensureDataFile();
  const raw = await fs.readFile(FRIENDS_FILE, 'utf-8');
  const j = JSON.parse(raw || '{}');
  const users = Array.isArray(j.users) ? j.users : [];
  const key = String(nameOrId || '').trim().toLowerCase();
  const idx = users.findIndex(u => String(u.name).toLowerCase() === key || String(u.id).toLowerCase() === key);
  if (idx < 0) throw new Error('friend not found');
  const cur = users[idx];
  users[idx] = {
    name: cur.name,
    id: cur.id,
    show: fields.show === undefined ? (cur.show !== false) : !!fields.show,
    standings: fields.standings === undefined ? (cur.standings !== false) : !!fields.standings
  };
  await fs.writeFile(FRIENDS_FILE, JSON.stringify({ users }, null, 2), 'utf-8');
  return users[idx];
}
