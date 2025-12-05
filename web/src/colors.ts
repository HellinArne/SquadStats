
// web/src/colors.ts

import type { User } from './types';

export type UserColors = Record<string, { fill: string; line: string; text: string }>;

const BASE_PALETTE = [
  '#FF6B6B', // strong red
  '#4D96FF', // vivid blue
//   '#6BCB77', // green
  '#B892FF', // purple
  '#FFB562', // orange
  '#00C2A8', // teal
  '#EF476F', // raspberry
  '#118AB2', // deep azure
  '#FFD166', // golden
  '#06D6A0', // mint green
  '#8338EC', // violet
  '#3A0CA3'  // indigo
];

/** Lighten an RGB hex color by `pct` (0..100) */
export function lighten(hex: string, pct = 20): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const f = (x: number) => Math.round(x + (255 - x) * (pct / 100));
  return `#${[f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/** Generate per-user colors; Steven gets a lighter shade */
export function makeUserColors(users: User[]): UserColors {
  const map: UserColors = {};
  users.forEach((u, i) => {
    const base = BASE_PALETTE[i % BASE_PALETTE.length];
    const isSteven = u.name.toLowerCase() === 'steven';

    const fill = isSteven ? lighten(base, 25) : base;   // noticeably lighter fill
    const line = isSteven ? lighten(base, 12) : base;   // slightly lighter outline too
    const text = isSteven ? lighten(base, 12) : base;   // name color in leaderboard

    map[u.name] = { fill, line, text };
  });
  return map;
}
