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
