export const STATE_ORDER = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
] as const

export type StateCode = (typeof STATE_ORDER)[number]

/** JedeSchule id prefix before the first hyphen, e.g. `HB-352` → `HB`. */
export function stateCodeFromSchoolId(id: string): StateCode | null {
  const dash = id.indexOf('-')
  const state = dash > 0 ? id.slice(0, dash) : ''
  if (state.length === 2 && STATE_ORDER.includes(state as StateCode)) return state as StateCode
  return null
}

/** Canonical German state names; keys are exactly `STATE_ORDER` / `StateCode`. */
export const STATE_LABEL_DE: Record<StateCode, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
}

/**
 * Optional display overrides for a Bundesland (same keys as {@link STATE_LABEL_DE}). Empty by default;
 * use when UI needs a shorter or alternate label without changing the canonical table.
 */
export const STATE_LABEL_DE_OVERRIDES: Partial<Record<StateCode, string>> = {}

/**
 * German label for `params.stateKey` on `/bundesland/$stateKey/...`. The state route’s `beforeLoad` only
 * allows codes in {@link STATE_ORDER}, aligned with {@link STATE_LABEL_DE}. Override via
 * {@link STATE_LABEL_DE_OVERRIDES} when the UI needs a different string than the canonical name.
 */
export function stateLabelDeFromRouteCode(code: string): string {
  const c = code as StateCode
  return STATE_LABEL_DE_OVERRIDES[c] ?? STATE_LABEL_DE[c] ?? code
}

/**
 * Approximate WGS84 bbox [west, south, east, north] per Bundesland for map framing
 * when there is no geometry yet (fallback; prefer fitting to loaded school data).
 */
export const STATE_BOUNDS: Record<StateCode, [number, number, number, number]> = {
  BW: [7.4, 47.5, 10.6, 49.9],
  BY: [8.9, 47.2, 13.9, 50.6],
  BE: [13.0, 52.3, 13.8, 52.7],
  BB: [11.2, 51.3, 15.0, 53.6],
  HB: [8.4, 53.0, 8.9, 53.2],
  HH: [9.8, 53.4, 10.3, 53.7],
  HE: [7.7, 49.3, 10.3, 51.7],
  MV: [10.5, 53.0, 14.4, 54.5],
  NI: [6.5, 51.2, 11.6, 53.9],
  NW: [5.8, 50.3, 9.5, 52.6],
  RP: [6.1, 48.9, 8.6, 50.9],
  SL: [6.3, 49.1, 7.4, 49.6],
  SN: [11.8, 50.1, 15.0, 51.7],
  ST: [10.5, 50.9, 12.7, 53.0],
  SH: [8.0, 53.3, 11.5, 55.1],
  TH: [9.8, 50.1, 12.7, 51.7],
}

/** Approximate map marker [lon, lat] for federal overview. */
export const STATE_MAP_CENTER: Record<StateCode, [number, number]> = {
  BW: [9.2, 48.6],
  BY: [11.5, 48.9],
  BE: [13.4, 52.52],
  BB: [13.4, 52.85],
  HB: [8.8, 53.08],
  HH: [10.0, 53.55],
  HE: [9.0, 50.65],
  MV: [12.45, 53.75],
  NI: [9.3, 52.7],
  NW: [7.55, 51.45],
  RP: [7.6, 49.9],
  SL: [6.95, 49.35],
  SN: [13.2, 51.05],
  ST: [11.7, 51.95],
  SH: [9.75, 54.2],
  TH: [11.35, 50.9],
}
