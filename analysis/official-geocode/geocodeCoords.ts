/** 4 decimals ≈ 11 m latitude; same as pipeline user-facing official coords. */
export const USER_FACING_COORD_DECIMALS = 4 as const

export function roundToDecimals(
  value: number,
  decimals: number = USER_FACING_COORD_DECIMALS,
): number {
  if (!Number.isFinite(value)) return value
  const scale = 10 ** decimals
  return Math.round(value * scale) / scale
}
