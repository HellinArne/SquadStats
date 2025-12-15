import cleanCoords from '@turf/clean-coords';
import buffer from '@turf/buffer';
import type { FeatureCollection, Feature, Geometry, Polygon, MultiPolygon } from 'geojson';

export function sanitizeFeatureCollection(fc: FeatureCollection): FeatureCollection {
  try {
    const sanitizedFeatures: Feature[] = fc.features.map((f) => {
      try {
        const cleaned = cleanCoords(f as any) as Feature;
        const geomType = cleaned.geometry?.type;
        if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          const buffered = buffer(cleaned as any, 0, { units: 'meters' }) as Feature<Polygon|MultiPolygon>;
          return buffered as Feature<Geometry>;
        }
        return cleaned as Feature<Geometry>;
      } catch {
        return f as Feature<Geometry>;
      }
    });
    return { type: 'FeatureCollection', features: sanitizedFeatures };
  } catch {
    return fc;
  }
}
