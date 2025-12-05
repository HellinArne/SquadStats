
export type User = { name: string; id: string };

export type SquadratsStats = {
  name: string;
  id: string;
  squadrats: number;
  squadratinhos: number;
  yard: number;
  yardinho: number;
  ubersquadrat: number;
  ubersquadratinho: number;
  aspects: Record<string, [[number, number], [number, number]]>;
};

export type CoveragePayload = {
  name: string;
  id: string;
  featureCollection: GeoJSON.FeatureCollection;
};
