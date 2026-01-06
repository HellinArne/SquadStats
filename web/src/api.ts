
import type { User, SquadratsStats, CoveragePayload } from './types';
import { getIdToken } from './auth';

// Resolve API base: use VITE_API_BASE if provided, otherwise default to relative '/api'
const API = import.meta.env.VITE_API_BASE?.toString() || '/api';

export async function getUsers(): Promise<User[]> {
  const r = await fetch(`${API}/users`);
  if (!r.ok) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`getUsers HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`getUsers non-JSON response: ${ct} \n${body.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.users as User[];
}

// Friends management (requires auth)
export async function getFriends(): Promise<User[]> {
  const token = await getIdToken();
  const r = await fetch(`${API}/friends`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`getFriends HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.users as User[];
}

export async function addFriend(input: { name: string; id: string }): Promise<User> {
  const token = await getIdToken();
  const r = await fetch(`${API}/friends`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(input)
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`addFriend HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

export async function removeFriend(nameOrId: string): Promise<{ ok: true } | { ok: false; error?: string }> {
  const token = await getIdToken();
  const r = await fetch(`${API}/friends/${encodeURIComponent(nameOrId)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`removeFriend HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

export async function setFriendShow(nameOrId: string, show: boolean): Promise<User> {
  const token = await getIdToken();
  const r = await fetch(`${API}/friends/${encodeURIComponent(nameOrId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ show })
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`setFriendShow HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

export async function setFriendFlags(nameOrId: string, flags: { show?: boolean; standings?: boolean }): Promise<User> {
  const token = await getIdToken();
  const r = await fetch(`${API}/friends/${encodeURIComponent(nameOrId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(flags)
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<unreadable>');
    throw new Error(`setFriendFlags HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

export async function getStats(names?: string[]): Promise<SquadratsStats[]> {
  const qs = names && names.length ? `?names=${names.join(',')}` : '';
  const token = await getIdToken();
  const r = await fetch(`${API}/stats${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const j = await r.json();
  return j.data as SquadratsStats[];
}

export async function getCoverage(names?: string[]): Promise<CoveragePayload[]> {
  const qs = names && names.length ? `?names=${names.join(',')}` : '';
  const token = await getIdToken();
  const r = await fetch(`${API}/coverage${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const j = await r.json();
  return j.data as CoveragePayload[];
}

export async function getCoverageFor(name: string): Promise<CoveragePayload> {
  const token = await getIdToken();
  const r = await fetch(`${API}/coverage/${name}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  return r.json();
}


export async function getCoverageDirect(nameOrId: string) {
  const token = await getIdToken();
  const r = await fetch(`${API}/coverage-direct/${encodeURIComponent(nameOrId)}` , {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!r.ok) throw new Error(`coverage-direct HTTP ${r.status}`);
  return r.json(); // { name, id, featureCollection }
}

// Simple caching wrapper for coverage-direct to avoid re-fetching on toggles.
// Uses an in-memory Map and localStorage fallback with TTL (default 1 hour).
const COVERAGE_CACHE_KEY = 'coverage_direct_cache_v1';
const COVERAGE_TTL_MS = Number(import.meta.env.VITE_COVERAGE_CACHE_TTL_MS ?? 1000 * 60 * 60);
const coverageCache = new Map<string, { ts: number; value: any }>();

function loadCoverageCacheFromStorage() {
  try {
    const raw = localStorage.getItem(COVERAGE_CACHE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, { ts: number; value: any }>;
    const now = Date.now();
    for (const k of Object.keys(obj)) {
      const it = obj[k];
      if (now - (it.ts || 0) < COVERAGE_TTL_MS) coverageCache.set(k, it);
    }
  } catch (e) {
    // ignore
  }
}

function persistCoverageCacheToStorage() {
  try {
    const out: Record<string, { ts: number; value: any }> = {};
    const now = Date.now();
    for (const [k, v] of coverageCache.entries()) {
      if (now - (v.ts || 0) < COVERAGE_TTL_MS) out[k] = v;
    }
    localStorage.setItem(COVERAGE_CACHE_KEY, JSON.stringify(out));
  } catch (e) {
    // ignore
  }
}

// initialize from storage
try { loadCoverageCacheFromStorage(); } catch {}

export async function getCoverageDirectCached(nameOrId: string) {
  const key = String(nameOrId);
  const now = Date.now();
  const cached = coverageCache.get(key);
  if (cached && (now - cached.ts) < COVERAGE_TTL_MS) {
    return cached.value;
  }
  const val = await getCoverageDirect(nameOrId);
  coverageCache.set(key, { ts: now, value: val });
  // persist asynchronously
  setTimeout(persistCoverageCacheToStorage, 0);
  return val;
}


