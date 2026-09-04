import {
  BUNDESLAND_OFFICIAL_SOURCES,
  type OsmLicenseCompatibility,
} from './bundeslandOfficialSources'
import { schoolCreatesChallengeId, schoolTagFixesChallengeId } from './maprouletteIds.const'
import { collectOfficialCreateTags } from './officialCreateTags'
import { type StateCode, STATE_ORDER } from './stateConfig'

/** Same licence gate as official Tag Fix tasks (yes_licence / yes_waiver). */
export function isOsmLicenceCompatibleForTagFix(compat: OsmLicenseCompatibility): boolean {
  return compat === 'yes_licence' || compat === 'yes_waiver'
}

export function osmCompatibleStateCodes(): StateCode[] {
  return STATE_ORDER.filter((code) =>
    isOsmLicenceCompatibleForTagFix(BUNDESLAND_OFFICIAL_SOURCES[code].osmCompatible),
  )
}

function stateIsOsmLicenceCompatible(stateKey: string): boolean {
  if (!STATE_ORDER.includes(stateKey as StateCode)) return false
  return isOsmLicenceCompatibleForTagFix(
    BUNDESLAND_OFFICIAL_SOURCES[stateKey as StateCode].osmCompatible,
  )
}

/** True when the Tag Fix challenge is configured (nationwide: official + OSM-only sources). */
export function stateHasMaproulette(stateKey: string): boolean {
  if (schoolTagFixesChallengeId == null) return false
  return STATE_ORDER.includes(stateKey as StateCode)
}

/** True when the create-school challenge is configured for this licence-OK Land. */
export function stateHasMaprouletteCreates(stateKey: string): boolean {
  if (schoolCreatesChallengeId == null) return false
  return stateIsOsmLicenceCompatible(stateKey)
}

/**
 * True when this match row is emitted into the create-school MapRoulette feed
 * (official_only + strong tag package + licence-OK Land + challenge id set).
 */
export function schoolInMaprouletteCreates(input: {
  stateKey: string
  category: string | null | undefined
  officialId: string | null | undefined
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  if (!stateHasMaprouletteCreates(input.stateKey)) return false
  if (input.category !== 'official_only') return false
  return collectOfficialCreateTags({
    officialId: input.officialId,
    officialName: input.officialName,
    officialProperties: input.officialProperties,
  }).ok
}
