import {
  osmHeuristicNameBlob,
  osmHeuristicUrlBlob,
  resolveSchoolFormRuleFromOfficial,
  resolveSchoolFormRuleFromOsmText,
  type SchoolFormRule,
} from './schoolFormRules'

export type OsmHeuristicAgreementRow = {
  key: string
  stateKey: string
  officialRule: SchoolFormRule
  osmRule: SchoolFormRule
  osmSource: 'name' | 'url'
  matchedToken: string
  agree: boolean
}

export type OsmHeuristicAgreementSummary = {
  compared: number
  agree: number
  disagree: number
  agreementRate: number
  skippedNoOfficial: number
  skippedNoOsmText: number
  skippedCompoundOrEmpty: number
  disagreements: OsmHeuristicAgreementRow[]
}

/**
 * Compare OSM text heuristic vs official Schulform rule for one match row.
 * Returns null when either side has no rule (not a disagreement).
 */
export function compareOsmHeuristicToOfficial(input: {
  key: string
  stateKey: string
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  osmTags: Record<string, string> | null | undefined
}): OsmHeuristicAgreementRow | 'no_official' | 'no_osm_text' {
  const officialRule = resolveSchoolFormRuleFromOfficial({
    officialName: input.officialName,
    officialProperties: input.officialProperties,
  })
  if (officialRule == null) return 'no_official'

  const osmRes = resolveSchoolFormRuleFromOsmText({
    nameBlob: osmHeuristicNameBlob(input.osmTags),
    urlBlob: osmHeuristicUrlBlob(input.osmTags),
  })
  if (osmRes == null) return 'no_osm_text'

  return {
    key: input.key,
    stateKey: input.stateKey,
    officialRule,
    osmRule: osmRes.rule,
    osmSource: osmRes.source,
    matchedToken: osmRes.matchedToken,
    agree: officialRule === osmRes.rule,
  }
}

/** Aggregate agreement over match rows (typically matched + licence-compatible Länder). */
export function summarizeOsmHeuristicOfficialAgreement(
  rows: Iterable<{
    key: string
    stateKey: string
    officialName: string | null | undefined
    officialProperties: Record<string, unknown> | null | undefined
    osmTags: Record<string, string> | null | undefined
  }>,
): OsmHeuristicAgreementSummary {
  let agree = 0
  let disagree = 0
  let skippedNoOfficial = 0
  let skippedNoOsmText = 0
  const disagreements: OsmHeuristicAgreementRow[] = []

  for (const row of rows) {
    const result = compareOsmHeuristicToOfficial(row)
    if (result === 'no_official') {
      skippedNoOfficial += 1
      continue
    }
    if (result === 'no_osm_text') {
      skippedNoOsmText += 1
      continue
    }
    if (result.agree) agree += 1
    else {
      disagree += 1
      disagreements.push(result)
    }
  }

  const compared = agree + disagree
  return {
    compared,
    agree,
    disagree,
    agreementRate: compared === 0 ? 1 : agree / compared,
    skippedNoOfficial,
    skippedNoOsmText,
    skippedCompoundOrEmpty: skippedNoOsmText,
    disagreements,
  }
}

/** Default CI threshold: keep disagreement under ~3% after compound filter. */
export const OSM_HEURISTIC_MIN_AGREEMENT_RATE = 0.97
