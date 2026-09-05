import { de } from '../i18n/de'
import { isOfficialGrundschule, tagValueEqualsProposed } from './officialGrundschule'
import { officialRefCandidateFromSchoolId } from './officialRefCandidate'
import { officialLegalStatusIndicatesPublic } from './propertyCompare'
import {
  PRIMARY_SUGGEST_TAGS,
  SECONDARY_SUGGEST_TAGS_BY_KIND,
  resolveSchoolFormRuleFromOfficial,
  type OSMTagSuggestSpec,
  type SecondarySchoolKind,
} from './schoolFormRules'

export type OsmSuggestGroupKind =
  | 'grundschule'
  | 'gymnasium'
  | 'gesamtschule'
  | 'hauptReal'
  | 'ref'
  | 'oeffentlicheTraegerschaft'

export type OsmSuggestGroup = {
  kind: OsmSuggestGroupKind
  title: string
  lead: string
  /** Tags shown in the UI (may include alternative values for the same key). */
  tags: readonly OSMTagSuggestSpec[]
}

export type OsmTagSuggestionsResult = {
  groups: OsmSuggestGroup[]
  /**
   * Tags still missing on OSM — MapRoulette Tag Fix `setTags`.
   * Never replaces an existing `operator` / `operator:type` (school page can still offer a confirm).
   */
  pendingTags: Record<string, string>
}

export type OsmTagSuggestionInput = {
  officialId: string | null | undefined
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  osmTags: Record<string, string> | null | undefined
}

const OPERATOR_TYPE_TAG: OSMTagSuggestSpec = { key: 'operator:type', value: 'government' }

const SECONDARY_UI_CONFIG: Record<
  SecondarySchoolKind,
  { kind: OsmSuggestGroupKind; title: string; lead: string }
> = {
  gymnasium: {
    kind: 'gymnasium',
    title: de.osm.gymnasiumSectionTitle,
    lead: de.osm.gymnasiumSectionLead,
  },
  gesamtschule: {
    kind: 'gesamtschule',
    title: de.osm.gesamtschuleSectionTitle,
    lead: de.osm.gesamtschuleSectionLead,
  },
  hauptReal: {
    kind: 'hauptReal',
    title: de.osm.hauptRealSectionTitle,
    lead: de.osm.hauptRealSectionLead,
  },
}

function officialProviderValue(
  officialProperties: Record<string, unknown> | null | undefined,
): string | null {
  const raw = officialProperties?.provider
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

function isGenericKommunalProvider(provider: string): boolean {
  return /^öffentlich\s*\(\s*kommune\s*\)$/i.test(provider.trim())
}

function iscedAlreadyAcceptable(current: string | undefined): boolean {
  const v = current?.trim() ?? ''
  return v === '2' || v === '2;3'
}

function osmHasNonEmptyTag(
  osmTags: Record<string, string> | null | undefined,
  key: string,
): boolean {
  return (osmTags?.[key]?.trim() ?? '') !== ''
}

/**
 * Build pending setTags from UI specs. For duplicate keys (Gesamtschule isced alternatives),
 * keep the first pending value only; skip isced when OSM already has 2 or 2;3.
 * Do not auto-replace an existing `operator` or `operator:type`.
 */
export function pendingTagsFromSuggestSpecs(
  osmTags: Record<string, string> | null | undefined,
  specs: readonly OSMTagSuggestSpec[],
): Record<string, string> {
  const pending: Record<string, string> = {}
  for (const spec of specs) {
    if (tagValueEqualsProposed(osmTags?.[spec.key], spec.value)) continue
    if (
      (spec.key === 'operator' || spec.key === 'operator:type') &&
      osmHasNonEmptyTag(osmTags, spec.key)
    ) {
      continue
    }
    if (spec.key === 'isced:level') {
      if (iscedAlreadyAcceptable(osmTags?.[spec.key])) continue
      if (pending[spec.key] != null) continue
    } else if (pending[spec.key] != null) {
      continue
    }
    pending[spec.key] = spec.value
  }
  return pending
}

function collectGroups(input: OsmTagSuggestionInput): OsmSuggestGroup[] {
  const groups: OsmSuggestGroup[] = []

  if (
    isOfficialGrundschule({
      officialName: input.officialName ?? null,
      officialProperties: input.officialProperties ?? null,
    })
  ) {
    groups.push({
      kind: 'grundschule',
      title: de.osm.grundschuleSectionTitle,
      lead: de.osm.grundschuleSectionLead,
      tags: PRIMARY_SUGGEST_TAGS,
    })
  } else {
    const rule = resolveSchoolFormRuleFromOfficial({
      officialName: input.officialName,
      officialProperties: input.officialProperties ?? null,
    })
    if (rule === 'gymnasium' || rule === 'gesamtschule' || rule === 'hauptReal') {
      const ui = SECONDARY_UI_CONFIG[rule]
      groups.push({
        kind: ui.kind,
        title: ui.title,
        lead: ui.lead,
        tags: SECONDARY_SUGGEST_TAGS_BY_KIND[rule],
      })
    }
  }

  const refCandidate = officialRefCandidateFromSchoolId(input.officialId)
  if (refCandidate) {
    groups.push({
      kind: 'ref',
      title: de.osm.refSectionTitle,
      lead: de.osm.refSectionLead,
      tags: [{ key: 'ref', value: refCandidate }],
    })
  }

  const legalStatusRaw = input.officialProperties?.legal_status
  const legalStatus = typeof legalStatusRaw === 'string' ? legalStatusRaw : null
  if (officialLegalStatusIndicatesPublic(legalStatus)) {
    const provider = officialProviderValue(input.officialProperties)
    const tags: OSMTagSuggestSpec[] = [OPERATOR_TYPE_TAG]
    if (provider && !isGenericKommunalProvider(provider)) {
      tags.push({ key: 'operator', value: provider })
    }
    groups.push({
      kind: 'oeffentlicheTraegerschaft',
      title: de.osm.oeffentlicheTraegerschaftSectionTitle,
      lead: de.osm.oeffentlicheTraegerschaftSectionLead,
      tags,
    })
  }

  return groups
}

/** Collect UI suggestion groups and MapRoulette/upload pending tag deltas for one school. */
export function collectOsmTagSuggestions(input: OsmTagSuggestionInput): OsmTagSuggestionsResult {
  const groups = collectGroups(input)
  const allSpecs = groups.flatMap((g) => g.tags)
  const pendingTags = pendingTagsFromSuggestSpecs(input.osmTags, allSpecs)
  return { groups, pendingTags }
}

export type MaprouletteTagFixPriority = 'prio1' | 'prio2' | 'prio3'

/** Priority for MapRoulette challenge rules (Schulform > ref > operator). */
export function maproulettePriorityFromPendingTags(
  pendingTags: Record<string, string>,
): MaprouletteTagFixPriority {
  if (pendingTags.school != null || pendingTags['isced:level'] != null) return 'prio1'
  if (pendingTags.ref != null) return 'prio2'
  return 'prio3'
}

/** Groups that still have at least one pending tag (for task markdown). */
export function groupsWithPendingTags(
  groups: readonly OsmSuggestGroup[],
  pendingTags: Record<string, string>,
): OsmSuggestGroup[] {
  return groups
    .map((g) => ({
      ...g,
      tags: g.tags.filter((t) => pendingTags[t.key] === t.value),
    }))
    .filter((g) => g.tags.length > 0)
}
