
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


