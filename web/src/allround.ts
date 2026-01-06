import type { SquadratsStats } from './types';

// Shared weights for the Allround aggregate (raw weighted sum)
export const ALLROUND_WEIGHTS: Record<keyof SquadratsStats, number> = {
  squadratinhos: 1,
  squadrats: 15,
  yardinho: 150,
  yard: 100,
  ubersquadratinho: 300,
  ubersquadrat: 200,
  // non-scored fields
  name: 0,
  id: 0,
  aspects: 0,
  allround: 0,
  allroundFull: 0,
} as any;

const KEYS: (keyof SquadratsStats)[] = [
  'squadratinhos',
  'squadrats',
  'yardinho',
  'yard',
  'ubersquadratinho',
  'ubersquadrat',
];

// Compute as raw weighted sum: sum(stat * weight), then divide by 1000 and truncate display.
export function computeAllround(rows: SquadratsStats[]): SquadratsStats[] {
  return rows.map(r => {
    let score = 0;
    for (const k of KEYS) {
      const v = Number(r[k] ?? 0);
      const w = ALLROUND_WEIGHTS[k] as number;
      score += v * w;
    }
    const divided = score / 1000;
    const truncated = Math.floor(divided);
    return { ...r, allroundFull: divided, allround: truncated };
  });
}

/**
 * Compute a balanced Allround score without manual weights.
 *
 * Method:
 * - Normalize each category per-user to [0, 1] using min-max across the current dataset.
 * - Combine categories using a geometric mean to reward consistency across stats.
 * - Scale to the familiar display format by multiplying by 1000 and truncating the integer part.
 *
 * Notes:
 * - If a category has no variance (min == max), we assign 0.5 to avoid over/under-penalizing.
 * - Missing values are treated as 0.
 */
export function computeAllroundBalanced(rows: SquadratsStats[]): SquadratsStats[] {
  if (!rows.length) return rows;

  // Compute min/max per category across the dataset
  const statsRange: Record<string, { min: number; max: number }> = {};
  for (const k of KEYS) {
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      const v = Number(r[k] ?? 0);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    statsRange[k] = { min: isFinite(min) ? min : 0, max: isFinite(max) ? max : 0 };
  }

  const EPS = 1e-9; // guard for geometric mean

  return rows.map(r => {
    // Normalize each stat to [0,1]
    const normalized: number[] = KEYS.map(k => {
      const v = Number(r[k] ?? 0);
      const { min, max } = statsRange[k];
      if (max > min) return (v - min) / (max - min);
      // No variance: assign neutral 0.5
      return 0.5;
    });

    // Geometric mean across categories to reward balanced performance
    const logSum = normalized.reduce((acc, s) => acc + Math.log(s + EPS), 0);
    const geoMean = Math.exp(logSum / normalized.length) - EPS; // back to [0,1]

    const score1000 = geoMean * 1000;
    const truncated = Math.floor(score1000);
    return { ...r, allroundFull: score1000, allround: truncated };
  });
}

/**
 * Rank-based Allround that avoids zeros and outliers dominance.
 *
 * For each category, users are ranked by raw value (desc). Ties get the average rank.
 * We convert rank to a smooth score in (0,1] using: s = (n - rank + 0.5) / n
 * - Best possible score is ~1 - 0.5/n
 * - Worst is ~0.5/n (never 0)
 * Final score is the arithmetic mean across categories, scaled to 0–1000.
 */
export function computeAllroundRanked(rows: SquadratsStats[]): SquadratsStats[] {
  const n = rows.length;
  if (!n) return rows;

  // Initialize accumulators per user
  const byName: Record<string, SquadratsStats> = Object.create(null);
  const sums: Record<string, number> = Object.create(null);
  for (const r of rows) {
    const name = (r.name ?? r.id) as string;
    byName[name] = r;
    sums[name] = 0;
  }

  // For each category, compute tied ranks and convert to smooth (0,1]
  for (const k of KEYS) {
    const list = rows.map(r => ({ name: (r.name ?? r.id) as string, value: Number(r[k] ?? 0) }));
    // sort by value desc, then by name for stability
    list.sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name));

    // assign average ranks for ties
    let i = 0;
    while (i < list.length) {
      const start = i;
      const v = list[i].value;
      while (i + 1 < list.length && list[i + 1].value === v) i++;
      const end = i; // inclusive
      const avgRank = (start + end) / 2 + 1; // ranks are 1-based
      for (let j = start; j <= end; j++) {
        const name = list[j].name;
        // Smooth rank to (0,1]; best ~1, worst ~0 (but > 0)
        const s = (n - avgRank + 0.5) / n; // in (0,1)
        // small floor to counter tiny n artifacts
        const smooth = Math.max(s, 0.05);
        sums[name] = (sums[name] ?? 0) + smooth;
      }
      i++;
    }
  }

  const denom = KEYS.length;
  const out: SquadratsStats[] = rows.map(r => {
    const name = (r.name ?? r.id) as string;
    const avg = (sums[name] ?? 0) / denom; // [~0.05, ~1]
    const score1000 = avg * 1000;
    const truncated = Math.floor(score1000);
    return { ...r, allroundFull: score1000, allround: truncated };
  });

  return out;
}
