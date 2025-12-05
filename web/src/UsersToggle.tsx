
type ToggleProps = {
  users: { name: string; id: string }[];
  enabled: string[];
  onChange(enabled: string[]): void;
};

export function UsersToggle({ users, enabled, onChange }: ToggleProps) {
  const toggle = (name: string) => {
    const set = new Set(enabled);
    if (set.has(name)) set.delete(name); else set.add(name);
    onChange([...set]);
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {users.map(u => (
        <label key={u.name} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <input
            type="checkbox"
            checked={enabled.includes(u.name)}
            onChange={() => toggle(u.name)}
          />
          {u.name}
        </label>
      ))}
    </div>
  );
}
