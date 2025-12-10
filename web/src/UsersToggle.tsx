
type ToggleProps = {
  users: { name: string; id: string }[];
  enabled: string[];
  onChange(enabled: string[]): void;
};

export function UsersToggle({ users, enabled, onChange }: ToggleProps) {
  const toggle = (name: string) => {
    const set = new Set(enabled);
    if (set.has(name)) set.delete(name); else set.add(name);
    onChange(Array.from(set));
  };

  // Format display: only first letter capital, rest lowercase
  const formatName = (name: string) => {
    const n = (name || '').trim();
    if (!n) return '';
    return n[0].toUpperCase() + n.slice(1).toLowerCase();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '.5rem 1rem', alignItems: 'start' }}>
      <span style={{ gridColumn: '1 / -1', color: 'var(--color-primary-deep)', fontWeight: 600, justifySelf: 'center' }}>Users</span>
      {users.map(u => (
        <label key={u.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.25rem .5rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
          <input
            type="checkbox"
            checked={enabled.includes(u.name)}
            onChange={() => toggle(u.name)}
          />
          <span style={{ color: 'var(--color-primary)' }}>{formatName(u.name)}</span>
        </label>
      ))}
    </div>
  );
}
