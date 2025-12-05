import type { SquadratsStats } from './types';

const CATEGORIES = [
  { key: 'squadrats', label: 'Squadrats' },
  { key: 'squadratinhos', label: 'Squadratinhos' },
  { key: 'yard', label: 'Yard' },
  { key: 'yardinho', label: 'Yardinho' },
  { key: 'ubersquadrat', label: 'Übersquadrat' },
  { key: 'ubersquadratinho', label: 'Übersquadratinho' },
];

export function StatsTable({ rows }: { rows: SquadratsStats[] }) {
  // columns = users
  const users = rows.map(r => r.name);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            {users.map(name => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => (
            <tr key={cat.key}>
              <td>{cat.label}</td>
              {rows.map(r => (
                <td key={r.name}>{(r as any)[cat.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
