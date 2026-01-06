import type { SquadratsStats } from '../types';
import { computeAllround, computeAllroundBalanced } from '../allround';

const CATEGORIES = [
  { key: 'allround', label: 'Allround' },
  { key: 'squadrats', label: 'Squadrats' },
  { key: 'squadratinhos', label: 'Squadratinhos' },
  { key: 'yard', label: 'Yard' },
  { key: 'yardinho', label: 'Yardinho' },
  { key: 'ubersquadrat', label: 'Übersquadrat' },
  { key: 'ubersquadratinho', label: 'Übersquadratinho' },
];

function withAllround(rows: SquadratsStats[]): SquadratsStats[] {
  return computeAllround(rows);
}

function withAllroundBalanced(rows: SquadratsStats[]): SquadratsStats[] {
  return computeAllroundBalanced(rows);
}

export function StatsTable({ rows }: { rows: SquadratsStats[] }) {
  const enhanced = withAllroundBalanced(rows);
  const users = enhanced.map(r => r.name);

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
              {enhanced.map(r => (
                <td key={r.name}>{(r as any)[cat.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
