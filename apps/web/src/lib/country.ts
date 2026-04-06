const CACHE_KEY = 'typefast-country'

/**
 * Detect user's country via IP geolocation.
 * Returns ISO 3166-1 alpha-2 code (e.g., "US") or null on failure.
 * Result is cached in localStorage to avoid repeated API calls.
 */
export async function detectCountry(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) return cached

    const res = await fetch('https://api.country.is/', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const country = data?.country as string | undefined
    if (country) {
      localStorage.setItem(CACHE_KEY, country)
      return country
    }
    return null
  } catch {
    return null
  }
}
