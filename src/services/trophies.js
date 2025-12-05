
const BASE = 'https://mainframe-api.squadrats.com/anonymous/squadrants';
const cache = new Map();

async function fetchJsonOrThrow(url, context) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0 (Node) SquadratsDashboard/1.0'
    }
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const snippet = await res.text().catch(() => '');
    throw new Error(`${context} HTTP ${res.status}: ${snippet.slice(0, 200)}`);
  }
  if (!ct.includes('application/json')) {
    const snippet = await res.text().catch(() => '');
    throw new Error(`${context}: expected JSON, got content-type "${ct}" and status ${res.status}\nSnippet: ${snippet.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Per-user counters + aspects.
 */
export async function fetchUserStats(user) {
  const url = `${BASE}/${user.id}/trophies`;
  const data = await fetchJsonOrThrow(url, `Stats(${user.name})`);
  const { stats } = data || {};
  if (!stats) throw new Error(`Stats(${user.name}) missing stats`);

  const {
    squadrats, squadratinhos, yard, yardinho, ubersquadrat, ubersquadratinho, aspects
  } = stats;

  return { name: user.name, id: user.id, squadrats, squadratinhos, yard, yardinho, ubersquadrat, ubersquadratinho, aspects };
}

export async function fetchUserStatsCached(user, ttlMs = 60_000) {
  const e = cache.get(user.id);
  const now = Date.now();
  if (e && now - e.ts < ttlMs) return e.data;
  const data = await fetchUserStats(user);
  cache.set(user.id, { ts: now, data });
  return data;
}
