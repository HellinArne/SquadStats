
// web/src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { getUsers, getStats, getCoverageDirect, getCoverageDirectCached } from './api';
import { sanitizeFeatureCollection } from './mapUtils';
import type { User, SquadratsStats, CoveragePayload } from './types';
// ranking retrieval removed
import { UsersToggle } from './components/UsersToggle';
import { Leaderboard } from './components/Leaderboard';
import { MapView } from './components/Map';
import { makeUserColors, type UserColors } from './colors';
import { computeAllround } from './allround';
import { auth, signInWithGoogle, signOut, signInWithEmailPassword } from './auth';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [stats, setStats] = useState<SquadratsStats[]>([]);
  const [coverageByUser, setCoverageByUser] = useState<Record<string, CoveragePayload | undefined>>({});
  const [signedIn, setSignedIn] = useState<boolean>(false);
  // Removed tier selection; we always show full coverage now
  // Default: hide yard and yardinho; show others
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'squadratinhos', 'squadrats', 'ubersquadratinho', 'ubersquadrat'
  ]);
  const [styleKey, setStyleKey] = useState<string>('maptiler_dataviz');

  // Build distinct colors per user (Steven lighter)
  const userColors: UserColors = useMemo(() => makeUserColors(users), [users]);

  // track auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setSignedIn(!!u));
    return () => unsub();
  }, []);

  // UI page: 'map' or 'leaderboard'
  const [page, setPage] = useState<'map' | 'leaderboard'>('map');

  // overall standings (derived allround score)
  const overall = useMemo(() => {
    const enhanced = computeAllround(stats || []);
    const rows = enhanced.map(s => ({ name: s.name ?? s.id, score: Number(s.allround ?? 0), full: Number((s.allroundFull ?? 0).toFixed(2)) }));
    return rows.sort((a, b) => b.score - a.score);
  }, [stats]);

  // Log detailed overall mapping for verification
  useEffect(() => {
    if (!overall || !overall.length) return;
    console.debug('Overall standings (name -> score, full):', overall.map(r => `${r.name} -> ${r.score} (${r.full})`));
  }, [overall]);

  // Prefetch coverage for configured users (default: 'steven') so the UI is snappy
  useEffect(() => {
    if (!signedIn || !users.length) return;
    const raw = String(import.meta.env.VITE_PREFETCH_USERS || 'steven');
    const wanted = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!wanted.length) return;

    (async () => {
      for (const u of users) {
        try {
          if (!u.name) continue;
          if (!wanted.includes(u.name.toLowerCase())) continue;
          if (coverageByUser[u.name]) continue; // already loaded
          // call cached fetch (will return from cache if available)
          const payload = await getCoverageDirectCached(u.name);
          if (!payload) continue;
          if (payload?.featureCollection && !(payload as any).__sanitized) {
            try { payload.featureCollection = sanitizeFeatureCollection(payload.featureCollection); (payload as any).__sanitized = true; } catch {}
          }
          setCoverageByUser(prev => ({ ...prev, [u.name]: payload }));
          console.debug('Prefetched coverage for', u.name);
        } catch (e) {
          console.debug('Prefetch failed for', u.name, e);
        }
      }
    })();
  }, [signedIn, users]);

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
          const payload = await getCoverageDirectCached(name);
          // sanitize once on receipt to avoid re-processing on each render
          if (payload?.featureCollection) {
            try {
              payload.featureCollection = sanitizeFeatureCollection(payload.featureCollection);
              (payload as any).__sanitized = true;
            } catch {}
          }
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
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar__brand">SQUADSTATS</div>

          <SidebarUser />

          <nav className="sidebar__nav">
            <button className={`sidebar__item ${page === 'map' ? 'active' : ''}`} onClick={() => setPage('map')}>Map</button>
            <button className={`sidebar__item ${page === 'leaderboard' ? 'active' : ''}`} onClick={() => setPage('leaderboard')}>Leaderboards</button>
          </nav>

          <div className="sidebar__standings">
            <div style={{ fontWeight: 700, color: 'var(--color-primary-deep)', marginBottom: '.5rem' }}>Overall</div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.35rem' }}>
              {overall.slice(0, 6).map((r, i) => {
                  const color = userColors[r.name]?.text ?? 'inherit';
                  return (
                    <li key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flex: 1, minWidth: 0 }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{i + 1}.</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color }}>{r.name}</span>
                      </div>
                      <span style={{ color: 'var(--color-primary-deep)', fontWeight: 700, marginLeft: '.5rem' }}>{r.score}</span>
                    </li>
                  );
                })}
            </ol>
          </div>

          <div className="sidebar__auth">
            <AuthControls />
          </div>
        </aside>

        {/* Main content */}
        <main style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: '1fr', gap: '1rem' }}>

          <div style={{ padding: '0 0 2rem' }}>
            {page === 'map' ? (
              <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: '1rem' }}>
                <div style={{ width: '100%', height: 'calc(100vh - 160px)' }}>
                  <MapView
                    enabledUsers={enabled}
                    coverageByUser={coverageByUser}
                    userColors={userColors}
                    selectedFeatures={selectedFeatures}
                    styleKey={styleKey}
                  />
                </div>

                {/* Controls moved below map */}
                <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: '1rem' }}>
                  {!!users.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <UsersToggle users={users} enabled={enabled} onChange={setEnabled} userColors={userColors} />
                      <FeatureToggle selected={selectedFeatures} onChange={setSelectedFeatures} />
                      <StyleToggle value={styleKey} onChange={setStyleKey} />
                    </div>
                  ) : (
                    <div style={{ marginTop: '.5rem', color: '#b45309', background: '#fff7ed', padding: '.5rem .75rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
                      {'No users configured. Add SQUADRATS_USER_<Name>=<ID> entries in your backend .env and restart.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                <h2 style={{ margin: '0 0 .5rem', color: 'var(--color-primary)' }}>Leaderboards</h2>
                <div style={{ width: '100%', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '1.5rem' }}>
                  <Leaderboard stats={stats} userColors={userColors} />
                </div>
              </div>
            )}
          </div>
        </main>
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
function StyleToggle({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const styles: { key: string; label: string }[] = [
    { key: 'voyager', label: 'Voyager' },
    { key: 'streets', label: 'Streets' },
    { key: 'maptiler_outdoor', label: 'MapTiler Outdoor' },
    { key: 'maptiler_dataviz', label: 'MapTiler Dataviz' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '.5rem 1rem', alignItems: 'start', justifyContent: 'center' }}>
      <span style={{ gridColumn: '1 / -1', color: 'var(--color-primary-deep)', fontWeight: 600, justifySelf: 'center' }}>Basemap</span>
      {styles.map(s => (
        <label key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.25rem .5rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
          <input
            type="radio"
            name="basemap-style"
            checked={value === s.key}
            onChange={() => onChange(s.key)}
          />
          <span style={{ color: 'var(--color-primary)' }}>{s.label}</span>
        </label>
      ))}
    </div>
  );
}
function FeatureToggle({ selected, onChange }: { selected: string[]; onChange: (features: string[]) => void }) {
  // Note: order is defined inline in layout below
  function toggle(name: string) {
    const set = new Set(selected.map(s => s.toLowerCase()));
    const key = name.toLowerCase();
    if (set.has(key)) set.delete(key); else set.add(key);
    onChange(Array.from(set));
  }
  // Labels: capitalize, and use Ü for Uber categories
  const LABELS: Record<string, string> = {
    squadrats: 'Squadrats',
    yard: 'Yard',
    ubersquadrat: 'Übersquadrat',
    squadratinhos: 'Squadratinhos',
    yardinho: 'Yardinho',
    ubersquadratinho: 'Übersquadratinho'
  };
  const isChecked = (key: string) => selected.map(s => s.toLowerCase()).includes(key);

  // Arrange in 3 columns, two rows: child under parent
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '.5rem 1rem', alignItems: 'start', justifyContent: 'center' }}>
      <span style={{ gridColumn: '1 / -1', color: 'var(--color-primary-deep)', fontWeight: 600, justifySelf: 'center' }}>Features</span>

      {/* Row 1: parents */}
      {['squadrats', 'yard', 'ubersquadrat'].map(f => (
        <label key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.25rem .5rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
          <input type="checkbox" checked={isChecked(f)} onChange={() => toggle(f)} />
          <span style={{ color: 'var(--color-primary)' }}>{LABELS[f]}</span>
        </label>
      ))}

      {/* Row 2: children under corresponding parents */}
      {['squadratinhos', 'yardinho', 'ubersquadratinho'].map(f => (
        <label key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.25rem .5rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
          <input type="checkbox" checked={isChecked(f)} onChange={() => toggle(f)} />
          <span style={{ color: 'var(--color-primary)' }}>{LABELS[f]}</span>
        </label>
      ))}
    </div>
  );
}
// TierToggle removed: we always display full coverage now

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
    <div title={displayName || undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)', display: 'grid', placeItems: 'center', background: '#fff' }}>
        {photoURL ? (
          <img src={photoURL} alt="avatar" referrerPolicy="no-referrer" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem' }}>{initials}</span>
        )}
      </div>
      {/* name will be displayed by parent where needed */}
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

function titleCaseName(input?: string | null) {
  if (!input) return '';
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function SidebarUser() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => setDisplayName(user?.displayName ?? user?.email ?? null));
    return () => unsub();
  }, []);
  if (!displayName) return null;
  return (
    <div className="sidebar__user" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      <Avatar />
      <div style={{ fontWeight: 700, color: 'var(--color-primary-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleCaseName(displayName.replace(/@.+$/, ''))}</div>
    </div>
  );
}
