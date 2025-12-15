
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
  styleKey?: string; // basemap style selection key
};

// Use a neutral, monochrome basemap to reduce country colors
const apiKey = import.meta.env.VITE_MAP_TILER_API_KEY;
export const MAP_STYLES: Record<string, { label: string; url: string }> = {
  positron: { label: 'Carto Positron (Light)', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  voyager: { label: 'Carto Voyager', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  darkmatter: { label: 'Carto Dark Matter', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  streets: { label: 'MapLibre Streets', url: 'https://demotiles.maplibre.org/style.json' },
  maptiler_basic: { label: 'MapTiler Basic', url: `https://api.maptiler.com/maps/basic/style.json?key=${apiKey}` },
  maptiler_outdoor: { label: 'MapTiler Outdoor', url: `https://api.maptiler.com/maps/outdoor-v4/style.json?key=${apiKey}` },
  maptiler_base: { label: 'MapTiler Base', url: `https://api.maptiler.com/maps/base-v4/style.json?key=${apiKey}` },
  maptiler_streets: { label: 'MapTiler Streets', url: `https://api.maptiler.com/maps/streets-v4/style.json?key=${apiKey}` },
  maptiler_dataviz: { label: 'MapTiler Dataviz', url: `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${apiKey}` },
};

export function MapView({ enabledUsers, coverageByUser, userColors, selectedFeatures, styleKey = 'maptiler_dataviz' }: Props) {
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

  // Helper: add/update all coverage overlays for enabled users
  function applyCoverageLayers(map: Map) {
    enabledUsers.forEach(name => {
      try {
        const cov = coverageByUser[name];
        if (!cov?.featureCollection) return;

        const sourceId = `cov-src-${name}`;
        const fillId   = `cov-${name}-fill`;
        const lineId   = `cov-${name}-outline`;
        const colors   = userColors[name] ?? { fill: '#FF6B6B', line: '#FF6B6B', text: '#FF6B6B' };

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

        if (!map.getLayer(fillId)) {
          map.addLayer({
            id: fillId,
            type: 'fill',
            source: sourceId,
            filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
            paint: {
              'fill-color': colors.fill,
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
              'fill-outline-color': colors.line
            }
          });
        } else {
          map.setLayoutProperty(fillId, 'visibility', 'visible');
        }

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
  }

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const styleUrl = MAP_STYLES[styleKey]?.url || MAP_STYLES.positron.url;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [3.72, 50.88],
      zoom: 8
    });
    map.on('load', () => { loadedRef.current = true; });
    map.on('error', e => console.error('MapLibre error:', e?.error || e));
    mapRef.current = map;
    return () => { try { map.remove(); } catch {} mapRef.current = null; };
  }, []);

  // Switch basemap style when styleKey changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const styleUrl = MAP_STYLES[styleKey]?.url || MAP_STYLES.positron.url;
    try {
      loadedRef.current = false;
      map.setStyle(styleUrl);
      // Wait until the new style is fully applied and idle before re-adding overlays
      map.once('idle', () => {
        loadedRef.current = true;
        applyCoverageLayers(map);
      });
    } catch (e) {
      console.error('Failed to set basemap style', e);
    }
  }, [styleKey]);

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
    if (!map) return;
    if (!loadedRef.current) {
      map.once('idle', () => applyCoverageLayers(map));
      return;
    }
    applyCoverageLayers(map);
  }, [enabledUsers, coverageByUser, userColors, selectedFeatures, styleKey]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0
      }}
    />
  );
}
