/**
 * Reverse geocode lat/lng to a "City, State" label using Nominatim (OpenStreetMap).
 * Returns null on failure.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TypeFast/1.0' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const addr = data.address
    if (!addr) return null

    const city =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? null
    const state = addr.state ?? null

    if (city && state) return `${city}, ${state}`
    if (city) return city
    if (state) return state
    return null
  } catch {
    return null
  }
}
