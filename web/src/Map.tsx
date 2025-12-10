
// web/src/Map.tsx
import { useEffect, useRef } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CoveragePayload } from './types';
import type { Feature, FeatureCollection, Polygon, MultiPolygon, Geometry } from 'geojson';
import cleanCoords from '@turf/clean-coords';
import buffer from '@turf/buffer';
import type { UserColors } from './colors';

type Props = {
  enabledUsers: string[];
  coverageByUser: Record<string, CoveragePayload | undefined>;
  userColors: UserColors;  // ⬅️ changed: use structured colors
  selectedFeatures?: string[]; // feature categories to show
};

// Use a neutral, monochrome basemap to reduce country colors
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export function MapView({ enabledUsers, coverageByUser, userColors, selectedFeatures }: Props) {
  // Turf-based sanitizer: clean duplicate coords and resolve self-intersections with buffer(0)
  function sanitizeFeatureCollection(fc: FeatureCollection): FeatureCollection {
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

  // No tier filtering: always render the full feature collection (sanitized)
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [3.72, 50.88],
      zoom: 8
    });
    map.on('load', () => { loadedRef.current = true; });
    map.on('error', e => console.error('MapLibre error:', e?.error || e));
    mapRef.current = map;
    return () => { try { map.remove(); } catch {} mapRef.current = null; };
  }, []);

  // keep map resizing with container
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !containerRef.current) return;
    const ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    enabledUsers.forEach(name => {
      try {
        const cov = coverageByUser[name];
        if (!cov?.featureCollection) return;

        const sourceId = `cov-src-${name}`;
        const fillId   = `cov-${name}-fill`;
        const lineId   = `cov-${name}-outline`;
  const colors   = userColors[name] ?? { fill: '#FF6B6B', line: '#FF6B6B', text: '#FF6B6B' };

        // Add or update GeoJSON source (sanitized to avoid render artifacts)
        // Keep only features whose category name matches known coverage types
        const sanitized = sanitizeFeatureCollection(cov.featureCollection);
        const allowed = new Set(
          (selectedFeatures && selectedFeatures.length
            ? selectedFeatures
            : ['squadratinhos', 'yardinho', 'squadrats', 'yard', 'ubersquadratinho', 'ubersquadrat']
          ).map(s => s.toLowerCase())
        );
        const filtered: FeatureCollection = {
          type: 'FeatureCollection',
          features: (sanitized.features || []).filter((f: any) => {
            const c = (f?.properties?.category || f?.properties?.name || '').toString().toLowerCase();
            return allowed.has(c);
          })
        };
        const firstTierData = filtered;
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data: firstTierData });
        } else {
          (map.getSource(sourceId) as any).setData(firstTierData);
        }

        // FILL: polygons only, enable antialias to reduce artifact triangles on close zoom
        if (!map.getLayer(fillId)) {
          map.addLayer({
            id: fillId,
            type: 'fill',
            source: sourceId,
            // Render both Polygon and MultiPolygon geometries
            filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
            paint: {
              'fill-color': colors.fill,
              // Do not fill Uber categories; keep others at base opacity
              'fill-opacity': [
                'case',
                [
                  'any',
                  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'category'], ['get', 'name'], '']]] , 'ubersquadrat'],
                  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'category'], ['get', 'name'], '']]] , 'ubersquadratinho']
                ],
                0,
                0.2
              ],
              'fill-antialias': true,
              // outline color can help mask tessellation seams
              'fill-outline-color': colors.line
            }
          });
        } else {
          map.setLayoutProperty(fillId, 'visibility', 'visible');
        }

        // OUTLINE: 1px line, round joins to avoid sharp artifacts
        if (!map.getLayer(lineId)) {
          map.addLayer({
            id: lineId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-miter-limit': 2
            },
            paint: {
              'line-color': colors.line,
              // Make Uber categories stand out with thicker lines
              'line-width': [
                'case',
                [
                  'any',
                  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'category'], ['get', 'name'], '']]] , 'ubersquadrat'],
                  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'category'], ['get', 'name'], '']]] , 'ubersquadratinho']
                ],
                3.5,
                1.5
              ]
            }
          });
        } else {
          map.setLayoutProperty(lineId, 'visibility', 'visible');
        }
      } catch (e) {
        console.error('Overlay add failed for', name, e);
      }
    });

    // Hide disabled users
    Object.keys(coverageByUser).forEach(name => {
      if (enabledUsers.includes(name)) return;
      const fillId = `cov-${name}-fill`;
      const lineId = `cov-${name}-outline`;
      if (map.getLayer(fillId)) map.setLayoutProperty(fillId, 'visibility', 'none');
      if (map.getLayer(lineId)) map.setLayoutProperty(lineId, 'visibility', 'none');
    });
  }, [enabledUsers, coverageByUser, userColors, selectedFeatures]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '600px'
      }}
    />
  );
}
