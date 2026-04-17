import type { StateCode } from './stateConfig'

/**
 * Order for point-in-polygon checks (small city-states first — same as former bbox heuristic).
 * When boundaries touch, the first match wins.
 */
export const PIPELINE_LAND_POLYGON_ORDER: readonly StateCode[] = [
  'BE',
  'HH',
  'HB',
  'SL',
  'BW',
  'BY',
  'BB',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SN',
  'ST',
  'SH',
  'TH',
]
