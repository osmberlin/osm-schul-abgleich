import { isFachschuleOfficialName } from './compareMatchKeys'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** True if the Jedeschule `school_type` string indicates Fachschule (substring match). */
export function schoolTypeStringIndicatesFachschule(s: string | null | undefined): boolean {
  if (typeof s !== 'string' || !s.trim()) return false
  return norm(s).includes('fachschule')
}

/**
 * College OSM (`amenity`/`education=college`) may pair with this official:
 * name contains "fachschule", or `school_type` indicates Fachschule.
 */
export function officialEligibleForCollegeOsmMatch(off: {
  name: string
  properties: Record<string, unknown>
}): boolean {
  if (isFachschuleOfficialName(off.name)) return true
  const st = off.properties.school_type
  return schoolTypeStringIndicatesFachschule(typeof st === 'string' ? st : null)
}
