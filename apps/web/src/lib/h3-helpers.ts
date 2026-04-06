import {
  latLngToCell,
  cellToParent,
  cellToBoundary,
  gridDisk,
  polygonToCells,
} from 'h3-js'
import type { H3Index } from '../data/types'
import type { Claim } from '../data/types'
import { BASE_RESOLUTION, RESOLUTIONS } from './h3-constants'

/**
 * Get the res-7 H3 index for a lat/lng position.
 */
export function positionToH3(lat: number, lng: number): H3Index {
  return latLngToCell(lat, lng, BASE_RESOLUTION)
}

/**
 * Get the parent hex at a given resolution.
 */
export function getParent(h3Index: H3Index, resolution: number): H3Index {
  if (resolution === BASE_RESOLUTION) return h3Index
  return cellToParent(h3Index, resolution)
}

/**
 * Get all parent hex indices from res 7 up to res 0.
 * Returns array of { h3Index, resolution } from res 7 → 0.
 */
export function getAncestors(
  h3Index: H3Index,
): Array<{ h3Index: H3Index; resolution: number }> {
  const ancestors: Array<{ h3Index: H3Index; resolution: number }> = []

  for (const res of RESOLUTIONS) {
    ancestors.push({
      h3Index: res === BASE_RESOLUTION ? h3Index : cellToParent(h3Index, res),
      resolution: res,
    })
  }

  return ancestors
}

/**
 * Cache for cell boundary GeoJSON coordinates.
 * Key: H3 index, Value: closed ring of [lng, lat] pairs.
 */
const boundaryCache = new Map<H3Index, number[][]>()

function getCellBoundary(h3Index: H3Index): number[][] {
  let coords = boundaryCache.get(h3Index)
  if (coords) return coords

  const boundary = cellToBoundary(h3Index)
  coords = boundary.map(([lat, lng]) => [lng, lat])

  // Fix antimeridian crossings: if consecutive vertices jump > 180° in longitude,
  // normalize by shifting negative longitudes up by 360°
  let crossesAntimeridian = false
  for (let i = 1; i < coords.length; i++) {
    if (Math.abs(coords[i][0] - coords[i - 1][0]) > 180) {
      crossesAntimeridian = true
      break
    }
  }
  if (crossesAntimeridian) {
    coords = coords.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat])
  }

  coords.push(coords[0]) // close the ring
  boundaryCache.set(h3Index, coords)
  return coords
}

/**
 * Convert an H3 cell to a GeoJSON Feature (polygon).
 * h3-js returns [lat, lng] pairs; GeoJSON needs [lng, lat].
 * Uses cached boundary computation.
 */
export function cellToGeoJSON(
  h3Index: H3Index,
  properties: Record<string, unknown> = {},
): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { h3Index, ...properties },
    geometry: { type: 'Polygon', coordinates: [getCellBoundary(h3Index)] },
  }
}

/**
 * Convert an array of claims to a GeoJSON FeatureCollection.
 */
export function claimsToFeatureCollection(
  claims: Claim[],
  playerId?: string,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: claims.map((claim) =>
      cellToGeoJSON(claim.h3Index, {
        playerName: claim.playerName,
        wpm: claim.wpm,
        accuracy: claim.accuracy,
        message: claim.message,
        resolution: claim.resolution,
        isPlayer: playerId
          ? claim.playerName === (playerId || 'Anonymous')
          : false,
      }),
    ),
  }
}

/**
 * Map zoom level to H3 resolution.
 * Lower zoom = bigger hexes (lower resolution).
 */
export function zoomToResolution(zoom: number): number {
  if (zoom >= 15) return 7
  if (zoom >= 13) return 6
  if (zoom >= 11) return 5
  if (zoom >= 9) return 4
  if (zoom >= 7) return 3
  if (zoom >= 5) return 2
  if (zoom >= 3) return 1
  return 0
}

/**
 * Cache for viewport cell lookups.
 * Key: "res:roundedN:roundedS:roundedE:roundedW"
 */
const viewportCache = new Map<string, H3Index[]>()
const MAX_VIEWPORT_CACHE = 64

export function getViewportCacheKey(
  bounds: { north: number; south: number; east: number; west: number },
  resolution: number,
): string {
  // Round to 1 decimal place for cache hits on small pans
  const r = (v: number) => Math.round(v * 10) / 10
  return `${resolution}:${r(bounds.north)}:${r(bounds.south)}:${r(bounds.east)}:${r(bounds.west)}`
}

/**
 * Get all H3 cell indices within a map viewport at a given resolution.
 * Pads the viewport bounds so edge hexes are included.
 * Results are cached.
 */
export function getViewportCells(
  bounds: { north: number; south: number; east: number; west: number },
  resolution: number,
): H3Index[] {
  const key = getViewportCacheKey(bounds, resolution)
  const cached = viewportCache.get(key)
  if (cached) return cached

  // Pad bounds so partially-visible hexes at edges are included
  const latPad = (bounds.north - bounds.south) * 0.15
  const lngPad = (bounds.east - bounds.west) * 0.15

  const n = Math.min(bounds.north + latPad, 85)
  const s = Math.max(bounds.south - latPad, -85)
  const w = bounds.west - lngPad
  const e = bounds.east + lngPad

  // polygonToCells expects [[lat, lng], ...] rings (counter-clockwise)
  const ring = [
    [s, w],
    [n, w],
    [n, e],
    [s, e],
    [s, w],
  ]

  let cells = polygonToCells([ring], resolution, false)

  const centerLat = (n + s) / 2
  const centerLng = (e + w) / 2
  const centerCell = latLngToCell(centerLat, centerLng, resolution)

  // At coarse resolutions like Metro/Region, a tightly centered viewport can contain
  // only one or two large hexes, which makes the map look blank even though data exists.
  // Seed a small neighborhood around the viewport center so the grid always reads as a grid.
  if (cells.length < 7) {
    cells = [...new Set([...cells, ...gridDisk(centerCell, 2)])]
  }

  // Evict oldest entries if cache is full
  if (viewportCache.size >= MAX_VIEWPORT_CACHE) {
    const firstKey = viewportCache.keys().next().value
    if (firstKey) viewportCache.delete(firstKey)
  }
  viewportCache.set(key, cells)

  return cells
}

/**
 * Build a FeatureCollection of all viewport hexes, marking claimed vs unclaimed.
 * Claimed hexes get full claim properties; unclaimed hexes get { unclaimed: true }.
 */
export function buildGridFeatures(
  viewportCells: H3Index[],
  claims: Claim[],
  playerName?: string,
): GeoJSON.FeatureCollection {
  const claimMap = new Map<string, Claim>()
  for (const c of claims) {
    claimMap.set(c.h3Index, c)
  }

  const features: GeoJSON.Feature[] = []

  for (const cell of viewportCells) {
    const claim = claimMap.get(cell)
    if (claim) {
      features.push(
        cellToGeoJSON(cell, {
          playerName: claim.playerName,
          wpm: claim.wpm,
          accuracy: claim.accuracy,
          message: claim.message,
          resolution: claim.resolution,
          isPlayer: playerName
            ? claim.playerName === (playerName || 'Anonymous')
            : false,
          claimed: true,
        }),
      )
    } else {
      features.push(cellToGeoJSON(cell, { claimed: false }))
    }
  }

  return { type: 'FeatureCollection', features }
}
