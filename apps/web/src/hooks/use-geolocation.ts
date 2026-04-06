import { useCallback, useEffect, useRef, useState } from 'react'

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export type GeoState = {
  status: GeoStatus
  position: { lat: number; lng: number } | null
  accuracy: number | null
  error: string | null
}

type UseGeolocationOptions = {
  watch?: boolean
}

const STORAGE_KEY = 'typefast-geo'

function loadCached(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return null
}

function saveCache(pos: { lat: number; lng: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
}

export function clearGeoCache() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { watch = false } = options
  const [state, setState] = useState<GeoState>(() => {
    const cached = loadCached()

    return {
      status: cached ? 'granted' : 'idle',
      position: cached,
      accuracy: null,
      error: null,
    }
  })
  const watchRef = useRef<number | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: 'Geolocation not supported',
      }))
      return
    }

    setState((s) => ({ ...s, status: 'requesting', error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        saveCache(position)
        setState({
          status: 'granted',
          position,
          accuracy: pos.coords.accuracy,
          error: null,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState((s) => ({
            ...s,
            status: 'denied',
            error: 'Location permission denied',
          }))
        } else {
          setState((s) => ({ ...s, status: 'error', error: err.message }))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const resetLocation = useCallback(() => {
    clearGeoCache()
    setState({
      status: 'idle',
      position: null,
      accuracy: null,
      error: null,
    })
  }, [])

  // Start watching after initial grant
  useEffect(() => {
    if (!watch || state.status !== 'granted' || !navigator.geolocation) return

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        saveCache(position)
        setState((s) => ({
          ...s,
          position,
          accuracy: pos.coords.accuracy,
        }))
      },
      () => {
        // silently ignore watch errors
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    )

    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
    }
  }, [state.status, watch])

  return { ...state, requestLocation, resetLocation }
}
