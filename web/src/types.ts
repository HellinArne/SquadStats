
export type User = { name: string; id: string; show?: boolean; standings?: boolean };

export type SquadratsStats = {
  name: string;
  id: string;
  squadrats: number;
  squadratinhos: number;
  yard: number;
  yardinho: number;
  ubersquadrat: number;
  ubersquadratinho: number;
  // Derived, client-computed aggregate score across the six categories
  allround?: number; // integer part (for display)
  allroundFull?: number; // precise value before truncation
  aspects: Record<string, [[number, number], [number, number]]>;
};

// Ranking retrieval removed

export type CoveragePayload = {
  name: string;
  id: string;
  featureCollection: GeoJSON.FeatureCollection;
};
