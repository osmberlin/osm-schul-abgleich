/** Baseline fallback match modes: name/website/address, not ref or distance. */
export const BASELINE_FALLBACK_MATCH_MODES = new Set(['name', 'name_prefix', 'website', 'address'])

export const OVERLAY_OUTLIER_DISTANCE_M = 2000

export const OVERLAY_OUTLIER_REASON = 'baseline_fallback_match_farther_than_2km' as const

export function shouldDiscardOverlayPoint(opts: {
  category: string | undefined
  matchMode: string | undefined
  distanceMeters: number | null
}) {
  if (opts.category !== 'matched') return false
  if (opts.matchMode == null || !BASELINE_FALLBACK_MATCH_MODES.has(opts.matchMode)) return false
  if (opts.distanceMeters == null || !Number.isFinite(opts.distanceMeters)) return false
  return opts.distanceMeters > OVERLAY_OUTLIER_DISTANCE_M
}
