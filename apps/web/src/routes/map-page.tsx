import 'maplibre-gl/dist/maplibre-gl.css'
import '../styles/map.css'
import { lazy, Suspense } from 'react'

const HexMap = lazy(() => import('../components/map/hex-map'))

function MapSkeleton() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-ink-muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
      }}
    >
      Loading map...
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <HexMap />
    </Suspense>
  )
}
