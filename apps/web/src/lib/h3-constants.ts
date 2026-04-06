/** Base resolution where scores are placed */
export const BASE_RESOLUTION = 7

/** All competition resolutions, from base up to global */
export const RESOLUTIONS = [7, 6, 5, 4, 3, 2, 1, 0] as const

/** Human-readable labels for each resolution */
export const RESOLUTION_LABELS: Record<number, string> = {
  7: 'Neighborhood',
  6: 'District',
  5: 'Town',
  4: 'Metro',
  3: 'Region',
  2: 'State',
  1: 'Multi-State',
  0: 'Continental',
}

/** Average hex area in square miles per resolution (from h3 docs) */
export const RESOLUTION_AREA_SQ_MI: Record<number, number> = {
  7: 2,
  6: 14,
  5: 97,
  4: 671,
  3: 4_692,
  2: 32_744,
  1: 228_449,
  0: 1_590_958,
}

/** Zoom level to use when focusing the map on a hex at a given resolution */
export const RESOLUTION_ZOOM: Record<number, number> = {
  7: 15,
  6: 13,
  5: 11,
  4: 9,
  3: 7,
  2: 5,
  1: 3,
  0: 2,
}
