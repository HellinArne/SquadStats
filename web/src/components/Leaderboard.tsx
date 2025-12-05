
import React, { useMemo } from 'react';
import type { SquadratsStats } from '../types';
import type { UserColors } from '../colors';

type Props = {
  stats: SquadratsStats[];
  userColors: UserColors; // ⬅️ new prop
};

const CATEGORIES: { key: keyof SquadratsStats; label: string }[] = [
  { key: 'squadrats',         label: 'Squadrats' },
  { key: 'squadratinhos',     label: 'Squadratinhos' },
  { key: 'yard',              label: 'Yard' },
  { key: 'yardinho',          label: 'Yardinho' },
  { key: 'ubersquadrat',      label: 'Übersquadrat' },
  { key: 'ubersquadratinho',  label: 'Übersquadratinho' }
];

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function addRanks(rows: { name: string; value: number }[]) {
  const sorted = rows
    .map((r, i) => ({ ...r, _i: i }))
    .sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name) || (a._i - b._i));
  let prevVal: number | null = null;
  let prevRank = 0;
  return sorted.map((r, idx) => {
    const rank = (prevVal !== null && r.value === prevVal) ? prevRank : (idx + 1);
    prevVal = r.value;
    prevRank = rank;
    return { rank, name: r.name, value: r.value };
  });
}

export const Leaderboard: React.FC<Props> = ({ stats, userColors }) => {
  const byCategory = useMemo(() => {
    return CATEGORIES.map(cat => {
      const rows = stats.map(s => ({
        name: s.name ?? s.id,
        value: Number(s[cat.key] ?? 0)
      }));
      return { ...cat, rows: addRanks(rows) };
    });
  }, [stats]);

  return (
    <section className="leaderboards">
      {byCategory.map(cat => (
        <div key={String(cat.key)} className="lb-card">
          <header className="lb-card__header">
            <h3 className="lb-card__title">{cat.label}</h3>
          </header>
          <div className="lb-card__body">
            <table className="lb-table" aria-label={`${cat.label} leaderboard`}>
              <thead>
                <tr>
                  <th className="col-rank">Place</th>
                  <th className="col-user">User</th>
                  <th className="col-value">Value</th>
                </tr>
              </thead>
              <tbody>
                {cat.rows.map(row => {
                  const color = userColors[row.name]?.text ?? 'inherit';
                  return (
                    <tr key={cat.label + '::' + row.name}>
                      <td className="col-rank" data-title="Place">{row.rank}</td>
                      <td className="col-user" data-title="User">
                        <span className="lb-dot" style={{ backgroundColor: color }} />
                        <span style={{ color }}>{row.name}</span>
                      </td>
                      <td className="col-value" data-title="Value">{nf.format(row.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
};
