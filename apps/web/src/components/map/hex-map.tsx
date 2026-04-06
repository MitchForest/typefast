import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '@typefast/backend/api'
import { useMap } from '../../hooks/use-map'
import { useGeolocation } from '../../hooks/use-geolocation'
import {
  zoomToResolution,
  getViewportCacheKey,
  getViewportCells,
  buildGridFeatures,
} from '../../lib/h3-helpers'
import { RESOLUTION_LABELS } from '../../lib/h3-constants'
import { getCurrentMonth } from '../../data/prompts'
import { HexPopup } from './hex-popup'

type PopupData = {
  claim: {
    playerName: string
    wpm: number
    accuracy: number
    message: string
    isPlayer: boolean
    resolution: number
  }
  x: number
  y: number
}

type ViewportState = {
  cells: string[]
  resolution: number
  month: string
  viewportKey: string
}

const METRO_ZOOM = 9

export default function HexMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const featureCacheRef = useRef<Map<string, GeoJSON.FeatureCollection>>(
    new Map(),
  )
  const lastRenderedKeyRef = useRef('')
  const updateHexesRef = useRef<(geojson: GeoJSON.FeatureCollection) => void>(
    () => {},
  )
  const autoCenteredRef = useRef(false)
  const focusTargetRef = useRef(false)
  const location = useLocation()
  const focusState = location.state as {
    h3Index?: string
    zoom?: number
  } | null
  const geo = useGeolocation({ watch: true })
  const [resolution, setResolution] = useState(4)
  const [popup, setPopup] = useState<PopupData | null>(null)
  const [viewport, setViewport] = useState<ViewportState | null>(null)

  const player = useQuery(api.players.getPlayer)
  const playerName = player?.name || 'Anonymous'

  const playerClaims = useQuery(api.claims.getPlayerClaims, {
    month: getCurrentMonth(),
  })
  const hasPlayerClaims = (playerClaims?.length ?? 0) > 0

  // Reactive query for claims in the current viewport
  const viewportClaims = useQuery(
    api.claims.getClaimsForCells,
    viewport
      ? {
          cells: viewport.cells,
          resolution: viewport.resolution,
          month: viewport.month,
        }
      : 'skip',
  )

  // When claims data arrives or changes, rebuild and render the grid
  useEffect(() => {
    if (!viewport || viewportClaims === undefined) return

    const featureKey = [
      viewport.month,
      viewport.resolution,
      playerName,
      viewportClaims.length, // Acts as a version indicator
      viewport.viewportKey,
    ].join(':')

    if (lastRenderedKeyRef.current === featureKey) return

    // Map Convex claim docs to the shape buildGridFeatures expects
    const mappedClaims = viewportClaims.map((c) => ({
      h3Index: c.h3Index,
      resolution: c.resolution,
      playerName: c.playerName,
      message: c.message,
      wpm: c.wpm,
      accuracy: c.accuracy,
      month: c.month,
    }))

    let geojson = featureCacheRef.current.get(featureKey)
    if (!geojson) {
      geojson = buildGridFeatures(viewport.cells, mappedClaims, playerName)
      featureCacheRef.current.set(featureKey, geojson)

      if (featureCacheRef.current.size > 48) {
        const firstKey = featureCacheRef.current.keys().next().value
        if (firstKey) featureCacheRef.current.delete(firstKey)
      }
    }

    lastRenderedKeyRef.current = featureKey
    updateHexesRef.current(geojson)
  }, [viewport, viewportClaims, playerName])

  const handleMoveEnd = useCallback(
    (
      bounds: {
        getNorth(): number
        getSouth(): number
        getEast(): number
        getWest(): number
      },
      zoom: number,
    ) => {
      const res = zoomToResolution(zoom)
      setResolution((current) => (current === res ? current : res))

      const month = getCurrentMonth()
      const viewportBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      }
      const viewportKey = getViewportCacheKey(viewportBounds, res)
      const viewportCells = getViewportCells(viewportBounds, res)

      setViewport({ cells: viewportCells, resolution: res, month, viewportKey })
    },
    [],
  )

  const pendingLocateRef = useRef(false)

  function handleLocate() {
    // Always request fresh position — repairs stale/corrupt cache
    pendingLocateRef.current = true
    geo.resetLocation()
    geo.requestLocation()
  }

  const handleClick = useCallback(
    (
      features: Array<{ properties?: Record<string, unknown> }>,
      lngLat: { lng: number; lat: number },
    ) => {
      const props = features[0]?.properties
      if (!props) return

      setPopup({
        claim: {
          playerName: String(props.playerName ?? ''),
          wpm: Number(props.wpm ?? 0),
          accuracy: Number(props.accuracy ?? 0),
          message: String(props.message ?? ''),
          isPlayer: props.isPlayer === true || props.isPlayer === 'true',
          resolution: Number(props.resolution ?? 0),
        },
        x: lngLat.lng,
        y: lngLat.lat,
      })
    },
    [],
  )

  const { updateHexes, setUserLocation, focusOn, isReady } = useMap(
    containerRef,
    {
      onMoveEnd: handleMoveEnd,
      onClick: handleClick,
    },
  )
  updateHexesRef.current = updateHexes

  useEffect(() => {
    if (geo.status === 'idle' && !geo.position) {
      geo.requestLocation()
    }
  }, [geo.position, geo.requestLocation, geo.status])

  // Focus on a specific hex passed via route state (e.g. from post-game celebration)
  useEffect(() => {
    if (!isReady || focusTargetRef.current || !focusState?.h3Index) return
    focusTargetRef.current = true
    autoCenteredRef.current = true // skip geo auto-center

    import('h3-js').then(({ cellToLatLng }) => {
      const [lat, lng] = cellToLatLng(focusState.h3Index!)
      focusOn(lat, lng, focusState.zoom ?? METRO_ZOOM)
    })
  }, [isReady, focusOn, focusState])

  // Set user location dot on map
  useEffect(() => {
    if (!isReady || !geo.position) return

    setUserLocation(geo.position.lat, geo.position.lng)

    if (!autoCenteredRef.current) {
      autoCenteredRef.current = true
      focusOn(geo.position.lat, geo.position.lng, METRO_ZOOM)
    }

    if (pendingLocateRef.current) {
      pendingLocateRef.current = false
      focusOn(geo.position.lat, geo.position.lng, METRO_ZOOM)
    }
  }, [focusOn, geo.position, isReady, setUserLocation])

  return (
    <div className="map-page">
      <div ref={containerRef} className="map-container" />

      {/* Resolution badge */}
      <div className="map-resolution-badge chip chip-speed">
        {RESOLUTION_LABELS[resolution] ?? `Res ${resolution}`}
      </div>

      {/* Locate me */}
      <button
        className="map-locate-btn btn-3d btn-speed btn-sm"
        onClick={handleLocate}
        type="button"
        aria-label="Go to my location"
      >
        &#x1F4CD;
      </button>

      {/* Empty state */}
      {!hasPlayerClaims && (
        <div className="map-claim-hint">
          <div className="card map-claim-hint-card">
            <p>Type a session to claim the hexes around you.</p>
            <Link to="/" className="btn-3d btn-go">
              Start typing
            </Link>
          </div>
        </div>
      )}

      {/* Hex popup */}
      {popup && (
        <HexPopup
          playerName={popup.claim.playerName}
          wpm={popup.claim.wpm}
          accuracy={popup.claim.accuracy}
          message={popup.claim.message}
          isPlayer={popup.claim.isPlayer}
          resolution={popup.claim.resolution}
          avatarDataUri={
            popup.claim.isPlayer ? (player?.avatarDataUri ?? null) : null
          }
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
