
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

  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {users.map(u => (
        <label key={u.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.25rem .5rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
          <input
            type="checkbox"
            checked={enabled.includes(u.name)}
            onChange={() => toggle(u.name)}
          />
          <span style={{ color: 'var(--color-primary)' }}>{u.name}</span>
        </label>
      ))}
    </div>
  );
}
