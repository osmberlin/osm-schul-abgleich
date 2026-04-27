function norm(s: string): string {
  return s.trim().toLowerCase()
}

function toSchoolTypeString(raw: unknown): string | null {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string').join('; ')
  return null
}

export type SecondarySchoolKind = 'gymnasium' | 'gesamtschule' | 'hauptReal'
export type SchoolFormRule = 'grundschule' | SecondarySchoolKind
export type SchoolFormFamily = 'grundschule' | 'weiterfuehrend'
export type SchoolFormCombo =
  | 'missing_osm'
  | 'only_osm'
  | 'matching_tags'
  | 'matching_but_lacking_tags'
  | 'none'

export type OSMTagSuggestSpec = { key: string; value: string }

const TAG_SCHOOL = 'school'
const TAG_ISCED = 'isced:level'

export const PRIMARY_SUGGEST_TAGS: readonly OSMTagSuggestSpec[] = [
  { key: TAG_SCHOOL, value: 'primary' },
  { key: TAG_ISCED, value: '1' },
]

export const SECONDARY_SUGGEST_TAGS_BY_KIND: Record<
  SecondarySchoolKind,
  readonly OSMTagSuggestSpec[]
> = {
  gymnasium: [
    { key: TAG_SCHOOL, value: 'secondary' },
    { key: TAG_ISCED, value: '2;3' },
  ],
  gesamtschule: [
    { key: TAG_SCHOOL, value: 'secondary' },
    { key: TAG_ISCED, value: '2;3' },
    { key: TAG_ISCED, value: '2' },
  ],
  hauptReal: [
    { key: TAG_SCHOOL, value: 'secondary' },
    { key: TAG_ISCED, value: '2' },
  ],
}

export function schoolTypeStringIndicatesGrundschule(s: string | null | undefined): boolean {
  if (typeof s !== 'string' || !s.trim()) return false
  return norm(s).includes('grundschule')
}

export function resolveSecondarySchoolKindFromSchoolType(
  s: string | null | undefined,
): SecondarySchoolKind | null {
  if (typeof s !== 'string' || !s.trim()) return null
  const v = norm(s)
  if (v.includes('gesamtschule')) return 'gesamtschule'
  if (v.includes('gymnasium') || v.includes('gymnasien')) return 'gymnasium'
  if (v.includes('hauptschule') || v.includes('realschule')) return 'hauptReal'
  return null
}

export function resolveSchoolFormRuleFromOfficial(input: {
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
}): SchoolFormRule | null {
  const schoolType = toSchoolTypeString(input.officialProperties?.school_type)
  const fromType = resolveSecondarySchoolKindFromSchoolType(schoolType)
  if (fromType) return fromType
  if (schoolTypeStringIndicatesGrundschule(schoolType)) return 'grundschule'

  const fromName = resolveSecondarySchoolKindFromSchoolType(input.officialName)
  if (fromName) return fromName
  if (typeof input.officialName === 'string' && norm(input.officialName).includes('grundschule')) {
    return 'grundschule'
  }
  return null
}

function isTag(
  tags: Record<string, string> | null | undefined,
  key: string,
  value: string,
): boolean {
  const current = tags?.[key]
  return (current?.trim() ?? '') === value.trim()
}

type OsmRuleSignals = {
  hasPrimary: boolean
  hasIsced1: boolean
  hasSecondary: boolean
  hasIsced2: boolean
  hasIsced23: boolean
}

function osmRuleSignals(tags: Record<string, string> | null | undefined): OsmRuleSignals {
  return {
    hasPrimary: isTag(tags, TAG_SCHOOL, 'primary'),
    hasIsced1: isTag(tags, TAG_ISCED, '1'),
    hasSecondary: isTag(tags, TAG_SCHOOL, 'secondary'),
    hasIsced2: isTag(tags, TAG_ISCED, '2'),
    hasIsced23: isTag(tags, TAG_ISCED, '2;3'),
  }
}

export function detectSchoolFormFamilyFromOsm(
  tags: Record<string, string> | null | undefined,
): SchoolFormFamily | null {
  const s = osmRuleSignals(tags)
  if (s.hasPrimary || s.hasIsced1) return 'grundschule'
  if (s.hasSecondary || s.hasIsced2 || s.hasIsced23) return 'weiterfuehrend'
  return null
}

export function inferSchoolFormRuleFromOsm(
  tags: Record<string, string> | null | undefined,
): SchoolFormRule | null {
  const s = osmRuleSignals(tags)
  if (s.hasPrimary || s.hasIsced1) return 'grundschule'
  if (s.hasIsced23) return 'gymnasium'
  if (s.hasIsced2) return 'hauptReal'
  return null
}

export function schoolFormFamilyFromRule(rule: SchoolFormRule | null): SchoolFormFamily | null {
  if (rule == null) return null
  return rule === 'grundschule' ? 'grundschule' : 'weiterfuehrend'
}

export function evaluateOsmRuleMatch(
  rule: SchoolFormRule,
  tags: Record<string, string> | null | undefined,
): {
  isEquivalentMatch: boolean
  hasFullRecommendedTags: boolean
  reason: 'none' | 'school' | 'isced' | 'both'
} {
  const s = osmRuleSignals(tags)
  if (rule === 'grundschule') {
    const isEquivalentMatch = s.hasPrimary || s.hasIsced1
    const hasFullRecommendedTags = s.hasPrimary && s.hasIsced1
    const reason =
      s.hasPrimary && s.hasIsced1
        ? 'both'
        : s.hasPrimary
          ? 'school'
          : s.hasIsced1
            ? 'isced'
            : 'none'
    return { isEquivalentMatch, hasFullRecommendedTags, reason }
  }

  const hasSecondary = s.hasSecondary
  const hasIsced23 = s.hasIsced23
  const hasIsced2 = s.hasIsced2
  const hasIsced = hasIsced2 || hasIsced23
  let isEquivalentMatch = false
  if (rule === 'gymnasium') isEquivalentMatch = hasSecondary || hasIsced23
  else if (rule === 'gesamtschule') isEquivalentMatch = hasSecondary || hasIsced23 || hasIsced2
  else isEquivalentMatch = hasSecondary || hasIsced2

  const hasFullRecommendedTags = isEquivalentMatch && hasSecondary && hasIsced
  const reason =
    hasSecondary && hasIsced ? 'both' : hasSecondary ? 'school' : hasIsced ? 'isced' : 'none'
  return { isEquivalentMatch, hasFullRecommendedTags, reason }
}

export function classifySchoolFormCombo(input: {
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  osmTags: Record<string, string> | null | undefined
}): {
  schoolFormRule: SchoolFormRule | null
  schoolFormFamily: SchoolFormFamily | null
  schoolFormCombo: SchoolFormCombo
  schoolFormComboReason: 'none' | 'school' | 'isced' | 'both'
} {
  const officialRule = resolveSchoolFormRuleFromOfficial(input)
  const osmFamily = detectSchoolFormFamilyFromOsm(input.osmTags)
  const osmRule = inferSchoolFormRuleFromOsm(input.osmTags)

  if (officialRule == null) {
    if (osmFamily == null) {
      return {
        schoolFormRule: null,
        schoolFormFamily: null,
        schoolFormCombo: 'none',
        schoolFormComboReason: 'none',
      }
    }
    return {
      schoolFormRule: osmRule,
      schoolFormFamily: osmFamily,
      schoolFormCombo: 'only_osm',
      schoolFormComboReason: 'none',
    }
  }

  const evalRes = evaluateOsmRuleMatch(officialRule, input.osmTags)
  if (!evalRes.isEquivalentMatch) {
    return {
      schoolFormRule: officialRule,
      schoolFormFamily: schoolFormFamilyFromRule(officialRule),
      schoolFormCombo: 'missing_osm',
      schoolFormComboReason: evalRes.reason,
    }
  }
  return {
    schoolFormRule: officialRule,
    schoolFormFamily: schoolFormFamilyFromRule(officialRule),
    schoolFormCombo: evalRes.hasFullRecommendedTags ? 'matching_tags' : 'matching_but_lacking_tags',
    schoolFormComboReason: evalRes.reason,
  }
}
