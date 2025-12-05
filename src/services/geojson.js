
const META_BASES = [
  'https://squadrats.com',
  'https://www.squadrats.com'
];
const cache = new Map(); // userId -> { ts, data }

async function fetchJsonOrThrow(url, context) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0 (Node) SquadratsDashboard/1.0',
      'referer': 'https://squadrats.com/map'
    }
  });

  // Read content-type first
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const snippet = await res.text().catch(() => '');
    throw new Error(`${context} HTTP ${res.status}: ${snippet.slice(0, 200)}`);
  }
  if (!ct.includes('application/json')) {
    const snippet = await res.text().catch(() => '');
    throw new Error(`${context}: expected JSON, got content-type "${ct}" and status ${res.status}. URL: ${url}\nSnippet: ${snippet.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Fetch per-user coverage FeatureCollection via signed URL.
 * Flow:
 * 1) GET {base}/anonymous/squadrants/{id}/geojson -> { url }
 * 2) GET {url} -> FeatureCollection
 */
export async function fetchUserCoverage(user) {
  let meta;
  let metaUrlTried = null;

  // Try both bases in order
  for (const base of META_BASES) {
    const metaUrl = `${base}/anonymous/squadrants/${user.id}/geojson`;
    metaUrlTried = metaUrl;
    try {
      meta = await fetchJsonOrThrow(metaUrl, `GeoJSON meta(${user.name})`);
      if (meta?.url) break;
    } catch (err) {
      // If first base fails, try the next; if last base, rethrow
      if (base === META_BASES[META_BASES.length - 1]) {
        // Surface the detailed error
        throw err;
      }
      // else continue loop
    }
  }

  if (!meta?.url) {
    throw new Error(`GeoJSON meta(${user.name}) missing url. Last tried: ${metaUrlTried}`);
  }

  // Fetch the actual GeoJSON
  const fc = await fetchJsonOrThrow(meta.url, `GeoJSON data(${user.name})`);
  if (fc?.type !== 'FeatureCollection') {
    throw new Error(`GeoJSON(${user.name}) not FeatureCollection`);
  }
  return { name: user.name, id: user.id, featureCollection: fc };
}

export async function fetchUserCoverageCached(user, ttlMs = 60_000) {
  const e = cache.get(user.id);
  const now = Date.now();
  if (e && now - e.ts < ttlMs) return e.data;
  const data = await fetchUserCoverage(user);
  cache.set(user.id, { ts: now, data });
  return data;
}
