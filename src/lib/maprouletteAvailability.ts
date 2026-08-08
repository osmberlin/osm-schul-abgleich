import {
  BUNDESLAND_OFFICIAL_SOURCES,
  type OsmLicenseCompatibility,
} from './bundeslandOfficialSources'
import { schoolTagFixesChallengeId } from './maprouletteIds.const'
import { type StateCode, STATE_ORDER } from './stateConfig'

/** Same licence gate as the MapRoulette Tag Fix feed (yes_licence / yes_waiver). */
export function isOsmLicenceCompatibleForTagFix(compat: OsmLicenseCompatibility): boolean {
  return compat === 'yes_licence' || compat === 'yes_waiver'
}

export function osmCompatibleStateCodes(): StateCode[] {
  return STATE_ORDER.filter((code) =>
    isOsmLicenceCompatibleForTagFix(BUNDESLAND_OFFICIAL_SOURCES[code].osmCompatible),
  )
}

/** True when this Land is in the Tag Fix challenge and the challenge id is configured. */
export function stateHasMaproulette(stateKey: string): boolean {
  if (schoolTagFixesChallengeId == null) return false
  if (!STATE_ORDER.includes(stateKey as StateCode)) return false
  return isOsmLicenceCompatibleForTagFix(
    BUNDESLAND_OFFICIAL_SOURCES[stateKey as StateCode].osmCompatible,
  )
}
