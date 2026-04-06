import type { StyleSpecification } from 'maplibre-gl'

/**
 * Custom MapLibre style for TypeFast.
 * Uses OpenFreeMap vector tiles with a minimal, gamified aesthetic
 * that matches the Arcade Joy design system.
 */

const light: StyleSpecification = {
  version: 8,
  name: 'TypeFast Light',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    // ── Background ──────────────────────────────────
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f5f0e8',
      },
    },

    // ── Landcover (forests, grass) ──────────────────
    {
      id: 'landcover-grass',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'grass'],
      paint: {
        'fill-color': '#e8f0d8',
        'fill-opacity': 0.5,
      },
    },
    {
      id: 'landcover-wood',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'wood'],
      paint: {
        'fill-color': '#dde8cc',
        'fill-opacity': 0.4,
      },
    },

    // ── Parks ────────────────────────────────────────
    {
      id: 'park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      paint: {
        'fill-color': '#e2efd0',
        'fill-opacity': 0.5,
      },
    },

    // ── Water ────────────────────────────────────────
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#c8e4f4',
      },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: {
        'line-color': '#c8e4f4',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 2],
      },
    },

    // ── Boundaries ──────────────────────────────────
    {
      id: 'boundary-country',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', 'admin_level', 2],
      paint: {
        'line-color': '#d4cec4',
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.8, 8, 1.5],
        'line-dasharray': [4, 2],
      },
    },
    {
      id: 'boundary-state',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', 'admin_level', 4],
      minzoom: 4,
      paint: {
        'line-color': '#e0dbd2',
        'line-width': 0.6,
        'line-dasharray': [3, 2],
      },
    },

    // ── Roads ────────────────────────────────────────
    {
      id: 'road-motorway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'motorway'],
      minzoom: 5,
      paint: {
        'line-color': '#e8e2d8',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          0.5,
          12,
          3,
          16,
          8,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },
    {
      id: 'road-trunk',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'trunk'],
      minzoom: 7,
      paint: {
        'line-color': '#ece6dc',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          0.3,
          12,
          2,
          16,
          6,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', 'class', 'primary'],
      minzoom: 9,
      paint: {
        'line-color': '#ece6dc',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          0.3,
          14,
          2,
          16,
          5,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'secondary', 'tertiary'],
      minzoom: 11,
      paint: {
        'line-color': '#ede8df',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          0.2,
          14,
          1.5,
          16,
          4,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'minor', 'service'],
      minzoom: 13,
      paint: {
        'line-color': '#f0ebe2',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.2, 16, 2],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },

    // ── Labels: Countries ───────────────────────────
    {
      id: 'label-country',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'country'],
      layout: {
        'text-field': '{name:latin}',
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 14],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#9a9286',
        'text-halo-color': '#f5f0e8',
        'text-halo-width': 1.5,
      },
    },

    // ── Labels: States ──────────────────────────────
    {
      id: 'label-state',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'state'],
      minzoom: 4,
      maxzoom: 8,
      layout: {
        'text-field': '{name:latin}',
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 8, 7, 11],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#b5ada2',
        'text-halo-color': '#f5f0e8',
        'text-halo-width': 1,
      },
    },

    // ── Labels: Cities ──────────────────────────────
    {
      id: 'label-city-major',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: [
        'all',
        ['==', 'class', 'city'],
        ['>=', 'rank', 1],
        ['<=', 'rank', 6],
      ],
      minzoom: 4,
      layout: {
        'text-field': '{name:latin}',
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 10, 14],
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#7a7268',
        'text-halo-color': '#f5f0e8',
        'text-halo-width': 1.2,
      },
    },
    {
      id: 'label-city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['all', ['==', 'class', 'city'], ['>', 'rank', 6]],
      minzoom: 7,
      layout: {
        'text-field': '{name:latin}',
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 8, 12, 12],
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#9a9286',
        'text-halo-color': '#f5f0e8',
        'text-halo-width': 1,
      },
    },

    // ── Labels: Towns (high zoom) ───────────────────
    {
      id: 'label-town',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'town'],
      minzoom: 9,
      layout: {
        'text-field': '{name:latin}',
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 8, 14, 11],
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#ada69c',
        'text-halo-color': '#f5f0e8',
        'text-halo-width': 1,
      },
    },

    // ── Water labels ────────────────────────────────
    {
      id: 'label-water',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'water_name',
      layout: {
        'text-field': '{name:latin}',
        'text-font': ['Noto Sans Italic'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 14],
        'text-letter-spacing': 0.15,
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#8ab4d0',
        'text-halo-color': '#c8e4f4',
        'text-halo-width': 1,
      },
    },
  ],
}

const dark: StyleSpecification = {
  ...light,
  name: 'TypeFast Dark',
  layers: light.layers.map((layer) => {
    const l = { ...layer } as Record<string, unknown>
    const paint = { ...(l.paint as Record<string, unknown> | undefined) }

    switch (layer.id) {
      case 'background':
        paint['background-color'] = '#111c22'
        break
      case 'landcover-grass':
        paint['fill-color'] = '#16262e'
        paint['fill-opacity'] = 0.4
        break
      case 'landcover-wood':
        paint['fill-color'] = '#14232a'
        paint['fill-opacity'] = 0.3
        break
      case 'park':
        paint['fill-color'] = '#162a20'
        paint['fill-opacity'] = 0.3
        break
      case 'water':
        paint['fill-color'] = '#0d2a3a'
        break
      case 'waterway':
        paint['line-color'] = '#0d2a3a'
        break
      case 'boundary-country':
        paint['line-color'] = '#2a4050'
        break
      case 'boundary-state':
        paint['line-color'] = '#1e3440'
        break
      case 'road-motorway':
        paint['line-color'] = '#1a3040'
        break
      case 'road-trunk':
        paint['line-color'] = '#182c3a'
        break
      case 'road-primary':
        paint['line-color'] = '#182c3a'
        break
      case 'road-secondary':
        paint['line-color'] = '#162838'
        break
      case 'road-minor':
        paint['line-color'] = '#152636'
        break
      case 'label-country':
        paint['text-color'] = '#6b7c85'
        paint['text-halo-color'] = '#111c22'
        break
      case 'label-state':
        paint['text-color'] = '#4a5c65'
        paint['text-halo-color'] = '#111c22'
        break
      case 'label-city-major':
        paint['text-color'] = '#8a9aa2'
        paint['text-halo-color'] = '#111c22'
        break
      case 'label-city':
        paint['text-color'] = '#6b7c85'
        paint['text-halo-color'] = '#111c22'
        break
      case 'label-town':
        paint['text-color'] = '#5a6c75'
        paint['text-halo-color'] = '#111c22'
        break
      case 'label-water':
        paint['text-color'] = '#1a4a6a'
        paint['text-halo-color'] = '#0d2a3a'
        break
    }

    return { ...l, paint } as StyleSpecification['layers'][number]
  }),
}

export function getMapStyle(): StyleSpecification {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? dark : light
}
