import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { getMapStyle } from '../lib/map-style'

const MIN_MAP_ZOOM = 2.99
const MAX_MAP_ZOOM = 9
const DEFAULT_MAP_ZOOM = MAX_MAP_ZOOM

type MapCallbacks = {
  onMoveEnd?: (bounds: maplibregl.LngLatBounds, zoom: number) => void
  onClick?: (
    features: maplibregl.MapGeoJSONFeature[],
    lngLat: maplibregl.LngLat,
  ) => void
}

export function useMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  callbacks: MapCallbacks,
) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const callbacksRef = useRef(callbacks)
  const [isReady, setIsReady] = useState(false)
  callbacksRef.current = callbacks

  const emitMoveEnd = useCallback(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    callbacksRef.current.onMoveEnd?.(map.getBounds(), map.getZoom())
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      center: [-98.5, 39.8], // Center of US
      zoom: DEFAULT_MAP_ZOOM,
      minZoom: MIN_MAP_ZOOM,
      maxZoom: MAX_MAP_ZOOM,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    )
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© OpenFreeMap · © OpenMapTiles · © OpenStreetMap',
      }),
      'bottom-left',
    )

    // Collapse attribution (i) button on load — it starts expanded
    map.once('load', () => {
      const attrib = container.querySelector('.maplibregl-ctrl-attrib')
      if (attrib) attrib.classList.remove('maplibregl-compact-show')
    })

    map.on('load', () => {
      // Single source for entire hex grid (claimed + unclaimed)
      map.addSource('hexes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Unclaimed hex fill — very subtle
      map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'hexes',
        filter: ['!=', ['get', 'claimed'], true],
        paint: {
          'fill-color': isDark ? '#1a2c35' : '#ffffff',
          'fill-opacity': isDark ? 0.26 : 0.16,
        },
      })

      // Unclaimed hex border — faint grid lines
      map.addLayer({
        id: 'grid-line',
        type: 'line',
        source: 'hexes',
        filter: ['!=', ['get', 'claimed'], true],
        paint: {
          'line-color': isDark ? '#2a4050' : '#d4cec4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.1, 9, 1.8],
          'line-opacity': isDark ? 0.88 : 0.82,
        },
      })

      // Claimed hex fill
      map.addLayer({
        id: 'hexes-fill',
        type: 'fill',
        source: 'hexes',
        filter: ['==', ['get', 'claimed'], true],
        paint: {
          'fill-color': ['case', ['get', 'isPlayer'], '#1cb0f6', '#58cc02'],
          'fill-opacity': ['case', ['get', 'isPlayer'], 0.35, 0.22],
        },
      })

      // Claimed hex border
      map.addLayer({
        id: 'hexes-line',
        type: 'line',
        source: 'hexes',
        filter: ['==', ['get', 'claimed'], true],
        paint: {
          'line-color': ['case', ['get', 'isPlayer'], '#1cb0f6', '#58cc02'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.2, 10, 2.5],
          'line-opacity': 0.7,
        },
      })

      // User location dot
      map.addSource('user-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'user-dot-pulse',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 22,
          'circle-color': '#1cb0f6',
          'circle-opacity': 0.08,
        },
      })

      map.addLayer({
        id: 'user-dot-glow',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 14,
          'circle-color': '#1cb0f6',
          'circle-opacity': 0.15,
        },
      })

      map.addLayer({
        id: 'user-dot',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 6,
          'circle-color': '#1cb0f6',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      })

      setIsReady(true)
      emitMoveEnd()
    })

    let moveTimer: ReturnType<typeof setTimeout> | null = null
    map.on('moveend', () => {
      if (moveTimer) clearTimeout(moveTimer)
      moveTimer = setTimeout(() => {
        const bounds = map.getBounds()
        const zoom = map.getZoom()
        callbacksRef.current.onMoveEnd?.(bounds, zoom)
      }, 80)
    })

    map.on('click', 'hexes-fill', (e) => {
      if (e.features && e.features.length > 0) {
        callbacksRef.current.onClick?.(e.features, e.lngLat)
      }
    })

    map.on('mouseenter', 'hexes-fill', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'hexes-fill', () => {
      map.getCanvas().style.cursor = ''
    })

    mapRef.current = map

    return () => {
      setIsReady(false)
      map.remove()
      mapRef.current = null
    }
  }, [emitMoveEnd])

  const updateHexes = useCallback((geojson: GeoJSON.FeatureCollection) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('hexes') as
      | maplibregl.GeoJSONSource
      | undefined
    source?.setData(geojson)
  }, [])

  const setUserLocation = useCallback((lat: number, lng: number) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('user-location') as
      | maplibregl.GeoJSONSource
      | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [lng, lat] },
        },
      ],
    })
  }, [])

  const focusOn = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      const map = mapRef.current
      const targetZoom = Math.max(
        MIN_MAP_ZOOM,
        Math.min(MAX_MAP_ZOOM, zoom ?? DEFAULT_MAP_ZOOM),
      )

      if (!map) {
        return
      }

      const currentCenter = map.getCenter()
      const currentZoom = map.getZoom()
      const sameCenter =
        Math.abs(currentCenter.lat - lat) < 0.0001 &&
        Math.abs(currentCenter.lng - lng) < 0.0001
      const sameZoom = Math.abs(currentZoom - targetZoom) < 0.01

      if (sameCenter && sameZoom) {
        emitMoveEnd()
        return
      }

      let settled = false
      const settle = () => {
        if (settled) {
          return
        }
        settled = true
        emitMoveEnd()
      }

      map.once('moveend', settle)
      map.once('idle', settle)
      map.flyTo({
        center: [lng, lat],
        zoom: targetZoom,
        duration: 1500,
        essential: true,
      })
    },
    [emitMoveEnd],
  )

  return { updateHexes, setUserLocation, focusOn, isReady }
}
