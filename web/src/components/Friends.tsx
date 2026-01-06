import { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';
import { addFriend, getUsers, removeFriend, setFriendShow, setFriendFlags } from '../api';
import { auth } from '../auth';

export function Friends({ enabled, onChangeEnabled }: { enabled: string[]; onChangeEnabled: (names: string[]) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  // Load users (public endpoint mirrors friends list)
  async function refresh() {
    try {
      const list = await getUsers();
      const sorted = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(sorted);
    } catch (e: any) {
      setError(e?.message || 'Failed to load friends');
    }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setSignedIn(!!u));
    return () => unsub();
  }, []);

  async function onAdd() {
    try {
      setBusy(true); setError(null);
      const payload = { name: name.trim(), id: id.trim() };
      if (!payload.name || !payload.id) {
        setError('Please fill in both Name and ID');
        return;
      }
  if (!signedIn) { setError('Sign in required to add friends'); return; }
  await addFriend(payload);
  setName(''); setId('');
  await refresh();
  try { window.dispatchEvent(new CustomEvent('friends-updated')); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to add friend');
    } finally { setBusy(false); }
  }

  async function onRemove(target: string) {
    try {
      setBusy(true); setError(null);
  if (!signedIn) { setError('Sign in required to remove friends'); return; }
  await removeFriend(target);
  await refresh();
  try { window.dispatchEvent(new CustomEvent('friends-updated')); } catch {}
      // also remove from enabled list if present
      try {
        const removed = users.find(u => u.id === target) || null;
        const name = removed?.name;
        if (name) onChangeEnabled(enabled.filter(n => n !== name));
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to remove friend');
    } finally { setBusy(false); }
  }

  const hasUsers = useMemo(() => users && users.length > 0, [users]);

  function isEnabled(name?: string | null) {
    if (!name) return false;
    return enabled.includes(name);
  }
  function isStanding(name?: string | null) {
    if (!name) return false;
    const u = users.find(x => x.name === name);
    return (u?.standings !== false);
  }
  async function toggleShow(u: User) {
    const name = u?.name;
    if (!name) return;
    try {
      setBusy(true); setError(null);
      if (!signedIn) { setError('Sign in required to change visibility'); return; }
      const set = new Set(enabled);
      const willShow = !set.has(name);
      if (willShow) set.add(name); else set.delete(name);
      onChangeEnabled(Array.from(set));
      // persist by id (unique)
      await setFriendShow(u.id, willShow);
      try { window.dispatchEvent(new CustomEvent('friends-updated')); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to update visibility');
    } finally { setBusy(false); }
  }

  async function toggleStandings(u: User) {
    const name = u?.name;
    if (!name) return;
    try {
      setBusy(true); setError(null);
      if (!signedIn) { setError('Sign in required to change standings'); return; }
      const willStand = !(u.standings !== false);
      // Optimistically update local list for immediate UI feedback
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, standings: willStand } : x));
      await setFriendFlags(u.id, { standings: willStand });
      try { window.dispatchEvent(new CustomEvent('friends-updated')); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to update standings');
      // Revert optimistic update on failure
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, standings: u.standings } : x));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Friends</h2>
      <p style={{ margin: 0, color: 'var(--color-primary-deep)' }}>
        Add or remove Squadrats users tracked by this app. These are stored server-side (not in .env).
      </p>

      <div className="card" style={{ padding: '1rem', display: 'grid', gap: '.75rem' }}>
        <div style={{ display: 'grid', gap: '.5rem' }}>
          <label style={{ display: 'grid', gap: '.35rem' }}>
            <span style={{ color: 'var(--color-primary-deep)', fontWeight: 600 }}>Name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Arne"
              style={{ padding: '.6rem .75rem', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '.35rem' }}>
            <span style={{ color: 'var(--color-primary-deep)', fontWeight: 600 }}>ID</span>
            <input
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="e.g., 123456"
              style={{ padding: '.6rem .75rem', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
          </label>
          {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              onClick={onAdd}
              disabled={busy || !signedIn}
              style={{
                padding: '.6rem 1rem', borderRadius: 10, border: '1px solid var(--color-primary)',
                background: 'var(--color-primary)', color: '#fff', fontWeight: 600
              }}
            >Add friend</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--color-primary-deep)', marginBottom: '.5rem' }}>Current friends</div>
        {!hasUsers ? (
          <div style={{ color: '#6b7280' }}>No friends yet. Add your first friend above.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.5rem' }}>
            {users.map(u => (
              <li key={`${u.name}-${u.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                <div style={{ display: 'grid' }}>
                  <span style={{ color: 'var(--color-primary-deep)', fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '.85rem' }}>ID: {u.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <button
                    onClick={() => toggleShow(u)}
                    disabled={busy || !signedIn}
                    title="Toggle show"
                    style={{
                      padding: '.35rem .6rem', borderRadius: 10,
                      border: isEnabled(u.name) ? '1px solid var(--color-primary)' : '1px solid #d1d5db',
                      background: isEnabled(u.name) ? 'var(--color-primary)' : '#ffffff',
                      color: isEnabled(u.name) ? '#fff' : 'var(--color-primary-deep)',
                      fontWeight: 700
                    }}
                  >Show</button>
                  <button
                    onClick={() => toggleStandings(u)}
                    disabled={busy || !signedIn}
                    title="Toggle standings"
                    style={{
                      padding: '.35rem .6rem', borderRadius: 10,
                      border: isStanding(u.name) ? '1px solid var(--color-primary)' : '1px solid #d1d5db',
                      background: isStanding(u.name) ? 'var(--color-primary)' : '#ffffff',
                      color: isStanding(u.name) ? '#fff' : 'var(--color-primary-deep)',
                      fontWeight: 700
                    }}
                  >Standings</button>
                  <button
                    onClick={() => onRemove(u.id)}
                    disabled={busy || !signedIn}
                    title="Remove by ID"
                    style={{ padding: '.35rem .6rem', borderRadius: 10, border: '1px solid #ef4444', background: '#ef4444', color: '#fff', fontWeight: 600 }}
                  >Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
