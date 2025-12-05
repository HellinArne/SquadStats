
// web/src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { getUsers, getStats, getCoverageDirect } from './api';
import type { User, SquadratsStats, CoveragePayload } from './types';
import { UsersToggle } from './UsersToggle';
import { Leaderboard } from './components/Leaderboard';
import { MapView } from './Map';
import { makeUserColors, type UserColors } from './colors';
import { auth, signInWithGoogle, signOut, signInWithEmailPassword } from './auth';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [stats, setStats] = useState<SquadratsStats[]>([]);
  const [coverageByUser, setCoverageByUser] = useState<Record<string, CoveragePayload | undefined>>({});
  const [signedIn, setSignedIn] = useState<boolean>(false);

  // Build distinct colors per user (Steven lighter)
  const userColors: UserColors = useMemo(() => makeUserColors(users), [users]);

  // track auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setSignedIn(!!u));
    return () => unsub();
  }, []);

  // Load users on mount (endpoint is public)
  useEffect(() => {
    (async () => {
      try {
        const list = await getUsers();
        // Sort users so Steven appears last
        const sorted = [...list].sort((a, b) => {
          const aIsSteven = a.name?.toLowerCase() === 'steven';
          const bIsSteven = b.name?.toLowerCase() === 'steven';
          if (aIsSteven && !bIsSteven) return 1;
          if (!aIsSteven && bIsSteven) return -1;
          return (a.name || '').localeCompare(b.name || '');
        });
        setUsers(sorted);
        // Default: enable all except Steven
        if (sorted.length) setEnabled(sorted.filter(u => u.name?.toLowerCase() !== 'steven').map(u => u.name));
      } catch (e) {
        console.error('Failed to load users', e);
      }
    })();
  }, []);

  // Load stats when signed in and users are available
  useEffect(() => {
    if (!signedIn || !users.length) { setStats([]); return; }
    (async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (e) {
        console.error('Failed to load stats', e);
        setStats([]);
      }
    })();
  }, [signedIn, users]);
  // lazily load coverage via backend proxy when signed in
  useEffect(() => {
    let cancel = false;
    if (!signedIn) { setCoverageByUser({}); return; }
    (async () => {
      for (const name of enabled) {
        if (cancel) break;
        if (coverageByUser[name]) continue;
        try {
          const payload = await getCoverageDirect(name);
          if (!cancel) setCoverageByUser(prev => ({ ...prev, [name]: payload }));
        } catch (e) {
          console.error('Coverage-direct failed for', name, e);
        }
      }
    })();
    return () => { cancel = true; };
  }, [signedIn, enabled]);

  return (
    signedIn ? (
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
          minHeight: '100vh',
          gap: '1rem'
        }}
      >
        <div className="container" style={{ position: 'relative', paddingTop: '1.25rem' }}>
          <h1 style={{ margin: 0, textAlign: 'center', color: 'var(--color-primary-deep)' }}>Squadrats Dashboard</h1>
          <div style={{ position: 'absolute', right: '1.5rem', top: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '.25rem' }}>
            <AuthControls />
          </div>
        </div>

        {!!users.length && (
          <div className="users-toggle-center" style={{ marginTop: '.25rem' }}>
            <UsersToggle users={users} enabled={enabled} onChange={setEnabled} />
          </div>
        )}
        {!users.length && (
          <div className="container" style={{ marginTop: '.5rem', color: '#b45309', background: '#fff7ed', padding: '.5rem .75rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
            {'No users configured. Add SQUADRATS_USER_<Name>=<ID> entries in your backend .env and restart.'}
          </div>
        )}

        {/* Map row */}
        <MapView
          enabledUsers={enabled}
          coverageByUser={coverageByUser}
          userColors={userColors}
        />

        {/* Leaderboards */}
        <div className="container">
          <h2 style={{ margin: '0 0 .5rem', color: 'var(--color-primary)' }}>Leaderboards</h2>
        </div>
        <div className="container" style={{ width: '100%', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '1.5rem' }}>
          <Leaderboard stats={stats} userColors={userColors} />
        </div>
      </div>
    ) : (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#ffffff' }}>
        <div style={{ width: '100%', maxWidth: 520, padding: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#4D96FF' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF6B6B' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFB562' }} />
              </div>
              <h1 style={{ margin: '0.4rem 0 0', fontSize: '1.85rem', color: 'var(--color-primary-deep)', fontWeight: 700 }}>Squadrats Dashboard</h1>
              <p style={{ color: 'var(--color-primary)', margin: '.25rem 0 0', fontWeight: 600 }}>Sign in to continue</p>
            </div>
            <AuthForm />
          </div>
        </div>
      </div>
    )
  );
}

function Avatar() {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setPhotoURL(user?.photoURL ?? null);
      setDisplayName(user?.displayName ?? (user?.email ?? null));
    });
    return () => unsub();
  }, []);

  const initials = (displayName || '')
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <div title={displayName || undefined} style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)', display: 'grid', placeItems: 'center', background: '#fff' }}>
      {photoURL ? (
        <img src={photoURL} alt="avatar" referrerPolicy="no-referrer" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem' }}>{initials}</span>
      )}
    </div>
  );
}

function AuthControls() {
  const [signedIn, setSignedIn] = useState<boolean>(false);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setSignedIn(!!u));
    return () => unsub();
  }, []);
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {!signedIn ? (
        <button onClick={() => signInWithGoogle()} style={{ padding: '.5rem 1rem' }}>Sign in</button>
      ) : (
        <>
          <button onClick={() => signOut()} style={{ padding: '.5rem 1rem', borderRadius: 12, border: '1px solid var(--color-primary)', background: 'var(--color-primary)', color: '#ffffff', fontWeight: 600 }}>
            Sign out
          </button>
          <Avatar />
        </>
      )}
    </div>
  );
}

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doEmailSignIn() {
    try {
      setBusy(true); setError(null);
      await signInWithEmailPassword(email.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Sign in failed');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {/* Google-branded button */}
      <button
        onClick={() => signInWithGoogle()}
        disabled={busy}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '.5rem',
          padding: '.7rem 1rem',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          color: 'var(--color-primary-deep)',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            display: 'inline-block',
            background: 'conic-gradient(from 0deg, #ea4335 0 90deg, #4285f4 90deg 180deg, #34a853 180deg 270deg, #fbbc05 270deg 360deg)',
            borderRadius: '50%'
          }}
        />
        <span style={{ color: 'var(--color-primary)' }}>Sign in</span> with Google
      </button>

      {/* Email / Password */}
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '.25rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '.7rem .8rem', borderRadius: 12, border: '1px solid #dbe3ef', background: '#ffffff', color: '#0f172a' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: '.7rem .8rem', borderRadius: 12, border: '1px solid #dbe3ef', background: '#ffffff', color: '#0f172a' }}
        />
        {error && <div style={{ color: '#b91c1c', fontSize: '.9rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            onClick={doEmailSignIn}
            disabled={busy}
            style={{
              flex: 1,
              padding: '.75rem 1rem',
              borderRadius: 12,
              border: '1px solid var(--color-primary)',
              background: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign in
          </button>
        </div>
        <div style={{ color: 'var(--color-primary-deep)', fontSize: '.85rem' }}>
          {'Note: Email/password is for your app login; Squadrats data remains public and doesn\'t require a separate Squadrats account.'}
        </div>
      </div>
    </div>
  );
}
