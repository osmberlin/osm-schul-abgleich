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

/** Where the effective Schulform rule came from for Explorer / pipeline. */
export type SchoolFormSignalSource = 'official' | 'osm' | 'none'

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
  if (v.includes('integrierte sekundarschule')) return 'gymnasium'
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

/** Name tags scanned for OSM-only Schulform heuristics (match order). */
export const OSM_HEURISTIC_NAME_TAGS = ['official_name', 'name', 'name:de'] as const

/** Website tags scanned for OSM-only Schulform heuristics. */
export const OSM_HEURISTIC_URL_TAGS = ['website', 'contact:website', 'url', 'contact:url'] as const

/** Distinct form-family tokens used for compound-name rejection. */
const OSM_FORM_FAMILY_PATTERNS: readonly { family: string; re: RegExp }[] = [
  { family: 'grundschule', re: /grundschule/i },
  { family: 'gymnasium', re: /gymnasium/i },
  { family: 'gesamtschule', re: /gesamtschule/i },
  { family: 'gemeinschaftsschule', re: /gemeinschaftsschule/i },
  { family: 'realschule', re: /realschule/i },
  { family: 'hauptschule', re: /hauptschule/i },
  { family: 'foerderschule', re: /f[öo]rderschule/i },
  { family: 'oberschule', re: /oberschule/i },
  { family: 'mittelschule', re: /mittelschule/i },
  { family: 'stadtteilschule', re: /stadtteilschule/i },
  { family: 'beruf', re: /beruf(s|liche|skolleg|sfach)/i },
  { family: 'waldorf', re: /waldorf/i },
]

/** Priority-ordered single-form resolvers for OSM name/URL text (Tier A). */
const OSM_TEXT_RULE_PATTERNS: readonly {
  re: RegExp
  rule: SchoolFormRule
  token: string
}[] = [
  { re: /gesamtschule/i, rule: 'gesamtschule', token: 'gesamtschule' },
  { re: /gemeinschaftsschule/i, rule: 'gesamtschule', token: 'gemeinschaftsschule' },
  { re: /gymnasium/i, rule: 'gymnasium', token: 'gymnasium' },
  { re: /hauptschule/i, rule: 'hauptReal', token: 'hauptschule' },
  { re: /realschule/i, rule: 'hauptReal', token: 'realschule' },
  // `oberschule` omitted: in Berlin often ISS/Gymnasium-equivalent; ambiguous nationwide.
  { re: /mittelschule/i, rule: 'hauptReal', token: 'mittelschule' },
  { re: /grundschule/i, rule: 'grundschule', token: 'grundschule' },
]

const COMPOUND_PHRASE_RES: readonly RegExp[] = [
  /grund[\s-]*und[\s-]*(haupt|real|gemeinschaft|förder|foerder)/i,
  /grund[-/](real|haupt)/i,
]

/** Join OSM name-like tags into one blob for heuristic matching. */
export function osmHeuristicNameBlob(tags: Record<string, string> | null | undefined): string {
  if (!tags) return ''
  return OSM_HEURISTIC_NAME_TAGS.map((k) => tags[k] ?? '')
    .filter(Boolean)
    .join(' ')
}

/** Join OSM website-like tags into one blob for heuristic matching. */
export function osmHeuristicUrlBlob(tags: Record<string, string> | null | undefined): string {
  if (!tags) return ''
  return OSM_HEURISTIC_URL_TAGS.map((k) => tags[k] ?? '')
    .filter(Boolean)
    .join(' ')
}

/** True when text names more than one Schulform family (unsafe for auto Tag Fix). */
export function isCompoundOsmSchoolFormText(text: string | null | undefined): boolean {
  if (typeof text !== 'string' || !text.trim()) return false
  if (COMPOUND_PHRASE_RES.some((re) => re.test(text))) return true
  let hit = 0
  for (const { re } of OSM_FORM_FAMILY_PATTERNS) {
    if (re.test(text)) hit += 1
    if (hit > 1) return true
  }
  return false
}

function resolveSingleOsmTextRule(text: string): { rule: SchoolFormRule; token: string } | null {
  if (!text.trim() || isCompoundOsmSchoolFormText(text)) return null
  for (const { re, rule, token } of OSM_TEXT_RULE_PATTERNS) {
    if (re.test(text)) return { rule, token }
  }
  return null
}

export type OsmTextFormSource = 'name' | 'url'

export type OsmTextFormResolution = {
  rule: SchoolFormRule
  source: OsmTextFormSource
  matchedToken: string
}

/**
 * Infer Schulform from OSM name/URL text only (no official data).
 * Prefers name over URL. A compound multi-form **name** blocks URL fallback entirely
 * (combined campuses must not get a single-form Tag Fix from the website).
 */
export function resolveSchoolFormRuleFromOsmText(input: {
  nameBlob?: string | null | undefined
  urlBlob?: string | null | undefined
}): OsmTextFormResolution | null {
  const nameBlob = input.nameBlob ?? ''
  if (isCompoundOsmSchoolFormText(nameBlob)) return null

  const fromName = resolveSingleOsmTextRule(nameBlob)
  if (fromName) {
    return { rule: fromName.rule, source: 'name', matchedToken: fromName.token }
  }
  const urlBlob = input.urlBlob ?? ''
  const fromUrl = resolveSingleOsmTextRule(urlBlob)
  if (fromUrl) {
    return { rule: fromUrl.rule, source: 'url', matchedToken: fromUrl.token }
  }
  return null
}

/** Single-value `school:de` → SchoolFormRule (multi-value / unknown → null). */
const SCHOOL_DE_TO_RULE: Record<string, SchoolFormRule> = {
  Grundschule: 'grundschule',
  Gymnasium: 'gymnasium',
  Gesamtschule: 'gesamtschule',
  Gemeinschaftsschule: 'gesamtschule',
  Stadtteilschule: 'gesamtschule',
  Realschule: 'hauptReal',
  Hauptschule: 'hauptReal',
  Oberschule: 'hauptReal',
  Mittelschule: 'hauptReal',
}

/**
 * Map a clean single-segment `school:de=*` to a SchoolFormRule.
 * Composite values (`Hauptschule;Förderschule`) are rejected.
 */
export function resolveSchoolFormRuleFromSchoolDe(
  schoolDe: string | null | undefined,
): SchoolFormRule | null {
  if (typeof schoolDe !== 'string' || !schoolDe.trim()) return null
  const trimmed = schoolDe.trim()
  if (/[;,|/]/.test(trimmed)) return null
  return SCHOOL_DE_TO_RULE[trimmed] ?? null
}

export type OsmHeuristicFormSource = OsmTextFormSource | 'school:de'

export type OsmHeuristicFormResolution = {
  rule: SchoolFormRule
  source: OsmHeuristicFormSource
  matchedToken: string
}

/**
 * Shared OSM-only Schulform sniff (same order as MapRoulette / collectOsmHeuristicTagSuggestions):
 * name → URL → single-value `school:de`. Compound multi-form names suppress all heuristics.
 */
export function resolveSchoolFormRuleFromOsmHeuristic(
  tags: Record<string, string> | null | undefined,
): OsmHeuristicFormResolution | null {
  const nameBlob = osmHeuristicNameBlob(tags)
  if (isCompoundOsmSchoolFormText(nameBlob)) return null

  const textRes = resolveSchoolFormRuleFromOsmText({
    nameBlob,
    urlBlob: osmHeuristicUrlBlob(tags),
  })
  if (textRes) {
    return {
      rule: textRes.rule,
      source: textRes.source,
      matchedToken: textRes.matchedToken,
    }
  }

  const schoolDe = tags?.['school:de']
  const fromDe = resolveSchoolFormRuleFromSchoolDe(schoolDe)
  if (fromDe && typeof schoolDe === 'string' && schoolDe.trim()) {
    return {
      rule: fromDe,
      source: 'school:de',
      matchedToken: schoolDe.trim(),
    }
  }
  return null
}

/** Recommended Tag Fix specs for a SchoolFormRule (Gesamtschule keeps isced alternatives for UI). */
export function suggestTagsForSchoolFormRule(rule: SchoolFormRule): readonly OSMTagSuggestSpec[] {
  if (rule === 'grundschule') return PRIMARY_SUGGEST_TAGS
  return SECONDARY_SUGGEST_TAGS_BY_KIND[rule]
}

/**
 * Tier B: complete the other half of a primary form pair when one side is already set.
 * Does not invent `isced:level` for bare `school=secondary`.
 */
export function partialPrimaryFormTagCompletions(
  tags: Record<string, string> | null | undefined,
): OSMTagSuggestSpec[] {
  const out: OSMTagSuggestSpec[] = []
  if (!tags) return out
  const school = tags.school?.trim()
  const isced = tags['isced:level']?.trim()
  if (isced === '1' && school !== 'primary') {
    out.push({ key: TAG_SCHOOL, value: 'primary' })
  }
  if (school === 'primary' && isced !== '1') {
    out.push({ key: TAG_ISCED, value: '1' })
  }
  return out
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

function comboFromOsmRuleMatch(
  rule: SchoolFormRule,
  tags: Record<string, string> | null | undefined,
  signalSource: Exclude<SchoolFormSignalSource, 'none'>,
): {
  schoolFormRule: SchoolFormRule
  schoolFormFamily: SchoolFormFamily
  schoolFormCombo: SchoolFormCombo
  schoolFormComboReason: 'none' | 'school' | 'isced' | 'both'
  schoolFormSignalSource: Exclude<SchoolFormSignalSource, 'none'>
} {
  const evalRes = evaluateOsmRuleMatch(rule, tags)
  if (!evalRes.isEquivalentMatch) {
    return {
      schoolFormRule: rule,
      schoolFormFamily: schoolFormFamilyFromRule(rule)!,
      schoolFormCombo: 'missing_osm',
      schoolFormComboReason: evalRes.reason,
      schoolFormSignalSource: signalSource,
    }
  }
  return {
    schoolFormRule: rule,
    schoolFormFamily: schoolFormFamilyFromRule(rule)!,
    schoolFormCombo: evalRes.hasFullRecommendedTags ? 'matching_tags' : 'matching_but_lacking_tags',
    schoolFormComboReason: evalRes.reason,
    schoolFormSignalSource: signalSource,
  }
}

/**
 * Effective Schulform for pipeline / Explorer:
 * 1. Official (`school_type` then name)
 * 2. Else OSM heuristic (name → URL → `school:de`)
 * 3. Else OSM form tags already present (`only_osm`)
 */
export function classifySchoolFormCombo(input: {
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  osmTags: Record<string, string> | null | undefined
}): {
  schoolFormRule: SchoolFormRule | null
  schoolFormFamily: SchoolFormFamily | null
  schoolFormCombo: SchoolFormCombo
  schoolFormComboReason: 'none' | 'school' | 'isced' | 'both'
  schoolFormSignalSource: SchoolFormSignalSource
} {
  const officialRule = resolveSchoolFormRuleFromOfficial(input)
  if (officialRule != null) {
    return comboFromOsmRuleMatch(officialRule, input.osmTags, 'official')
  }

  const osmHeuristic = resolveSchoolFormRuleFromOsmHeuristic(input.osmTags)
  if (osmHeuristic != null) {
    return comboFromOsmRuleMatch(osmHeuristic.rule, input.osmTags, 'osm')
  }

  const osmFamily = detectSchoolFormFamilyFromOsm(input.osmTags)
  const osmRule = inferSchoolFormRuleFromOsm(input.osmTags)
  if (osmFamily == null) {
    return {
      schoolFormRule: null,
      schoolFormFamily: null,
      schoolFormCombo: 'none',
      schoolFormComboReason: 'none',
      schoolFormSignalSource: 'none',
    }
  }
  return {
    schoolFormRule: osmRule,
    schoolFormFamily: osmFamily,
    schoolFormCombo: 'only_osm',
    schoolFormComboReason: 'none',
    schoolFormSignalSource: 'osm',
  }
}
