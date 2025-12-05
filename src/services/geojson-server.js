
// src/services/geojson-server.js
// No server-side ID token fetching: frontend handles Firebase auth.

const META_BASES = [
  'https://squadrats.com',
  'https://www.squadrats.com',
  'https://mainframe-api.squadrats.com' // extra fallback
];

// ---- helpers -------------------------------------------------

function isJsonContentType(ct = '') {
  // Accept application/json, application/geo+json, and any application/*+json
  const c = ct.toLowerCase();
  return (
    c.includes('application/json') ||
    c.includes('application/geo+json') ||
    /application\/[a-z0-9.+-]*\+json/.test(c)
  );
}

async function fetchJson(url, ctx) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      // Prefer GeoJSON if the server distinguishes; fall back to JSON
      'accept': 'application/geo+json, application/json;q=0.9',
      'user-agent': 'Mozilla/5.0 (Node) SquadratsDashboard/1.0',
      'referer': 'https://squadrats.com/map',
      'origin': 'https://squadrats.com'
    }
  });

  const ct = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    throw new Error(`${ctx} HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  // If server labels the payload as GeoJSON (or any +json), accept it.
  if (!isJsonContentType(ct)) {
    // Last chance: content-type is wrong but body *looks* like JSON. Try parsing.
    const trimmed = (text || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // fall through to error below
      }
    }
    throw new Error(
      `${ctx}: expected JSON, got "${ct}" (status ${res.status}). URL: ${url}\n` +
      `Snippet: ${text.slice(0, 300)}`
    );
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${ctx}: failed to parse JSON: ${(e && e.message) || e}\nSnippet: ${text.slice(0, 300)}`);
  }
}

// Simple wrapper retained for future enhancements
async function fetchJsonWithRefresh(url, ctx) {
  return await fetchJson(url, ctx);
}

// ---- main entry ----------------------------------------------

export async function fetchCoverageViaServer(user) {
  // 1) META -> { url }
  let meta;
  const tried = [];
  for (const base of META_BASES) {
    const metaUrl = `${base}/anonymous/squadrants/${user.id}/geojson`;
    tried.push(metaUrl);
    try {
      meta = await fetchJsonWithRefresh(metaUrl, `GeoJSON meta(${user.name})`);
      if (meta?.url) break;
    } catch (err) {
      if (base === META_BASES[META_BASES.length - 1]) {
        throw new Error(`${err.message}\nTried: ${tried.join(' , ')}`);
      }
      // else continue to next base
    }
  }
  if (!meta?.url) {
    throw new Error(`Meta missing url for ${user.name}. Tried: ${tried.join(' , ')}`);
  }

  // 2) Signed URL -> FeatureCollection (often on squadrats.org; content-type can be application/geo+json)
  const fc = await fetchJsonWithRefresh(meta.url, `GeoJSON data(${user.name})`);
  if (fc?.type !== 'FeatureCollection') {
    throw new Error(`Not a FeatureCollection for ${user.name}`);
  }
  return fc;
}
