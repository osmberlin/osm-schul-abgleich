import { de } from '../i18n/de'
import {
  groupsWithPendingTags,
  pendingTagsFromSuggestSpecs,
  type MaprouletteTagFixPriority,
  type OsmSuggestGroup,
  type OsmSuggestGroupKind,
  type OsmTagSuggestionsResult,
} from './osmTagSuggestions'
import {
  osmHeuristicNameBlob,
  osmHeuristicUrlBlob,
  isCompoundOsmSchoolFormText,
  partialPrimaryFormTagCompletions,
  resolveSchoolFormRuleFromOsmText,
  resolveSchoolFormRuleFromSchoolDe,
  suggestTagsForSchoolFormRule,
  type OsmTextFormSource,
  type SchoolFormRule,
} from './schoolFormRules'

export type OsmHeuristicSignalSource = OsmTextFormSource | 'school:de' | 'partial'

export type OsmHeuristicTagSuggestionsResult = OsmTagSuggestionsResult & {
  signalSource: OsmHeuristicSignalSource | null
  schoolFormRule: SchoolFormRule | null
  matchedToken: string | null
}

function formLabel(rule: SchoolFormRule): string {
  return de.osm.osmHeuristicFormLabels[rule]
}

function ruleKind(rule: SchoolFormRule): OsmSuggestGroupKind {
  return rule
}

function titleLeadForSource(
  source: Exclude<OsmHeuristicSignalSource, 'partial'>,
  rule: SchoolFormRule,
  token: string,
): { title: string; lead: string } {
  const form = formLabel(rule)
  if (source === 'name') {
    return {
      title: de.osm.osmHeuristicFromNameTitle.replace('{form}', form),
      lead: de.osm.osmHeuristicFromNameLead.replaceAll('{token}', token).replaceAll('{form}', form),
    }
  }
  if (source === 'url') {
    return {
      title: de.osm.osmHeuristicFromUrlTitle.replace('{form}', form),
      lead: de.osm.osmHeuristicFromUrlLead.replaceAll('{token}', token).replaceAll('{form}', form),
    }
  }
  return {
    title: de.osm.osmHeuristicFromSchoolDeTitle.replace('{form}', form),
    lead: de.osm.osmHeuristicFromSchoolDeLead
      .replaceAll('{token}', token)
      .replaceAll('{form}', form),
  }
}

/**
 * Collect Schulform tag suggestions from raw OSM only (name/URL/`school:de`/partial pairs).
 * Never proposes `ref` or official `operator*` — safe for non-licence-compatible Länder.
 * Compound multi-form OSM names suppress all heuristic suggestions (including URL/`school:de`/partial).
 */
export function collectOsmHeuristicTagSuggestions(input: {
  osmTags: Record<string, string> | null | undefined
}): OsmHeuristicTagSuggestionsResult {
  const tags = input.osmTags ?? null
  const nameBlob = osmHeuristicNameBlob(tags)
  const empty: OsmHeuristicTagSuggestionsResult = {
    groups: [],
    pendingTags: {},
    signalSource: null,
    schoolFormRule: null,
    matchedToken: null,
  }

  if (isCompoundOsmSchoolFormText(nameBlob)) return empty

  const textRes = resolveSchoolFormRuleFromOsmText({
    nameBlob,
    urlBlob: osmHeuristicUrlBlob(tags),
  })

  let rule: SchoolFormRule | null = null
  let signalSource: OsmHeuristicSignalSource | null = null
  let matchedToken: string | null = null

  if (textRes) {
    rule = textRes.rule
    signalSource = textRes.source
    matchedToken = textRes.matchedToken
  } else {
    const schoolDe = tags?.['school:de']
    const fromDe = resolveSchoolFormRuleFromSchoolDe(schoolDe)
    if (fromDe && schoolDe) {
      rule = fromDe
      signalSource = 'school:de'
      matchedToken = schoolDe.trim()
    }
  }

  const groups: OsmSuggestGroup[] = []

  if (rule && signalSource) {
    const { title, lead } = titleLeadForSource(signalSource, rule, matchedToken ?? '')
    groups.push({
      kind: ruleKind(rule),
      title,
      lead,
      tags: suggestTagsForSchoolFormRule(rule),
    })
  } else {
    const partial = partialPrimaryFormTagCompletions(tags)
    if (partial.length > 0) {
      signalSource = 'partial'
      groups.push({
        kind: 'grundschule',
        title: de.osm.osmPartialCompletionTitle,
        lead: de.osm.osmPartialCompletionLead,
        tags: partial,
      })
    }
  }

  const allSpecs = groups.flatMap((g) => g.tags)
  const pendingTags = pendingTagsFromSuggestSpecs(tags, allSpecs)
  if (Object.keys(pendingTags).length === 0) {
    return {
      groups: [],
      pendingTags: {},
      signalSource: null,
      schoolFormRule: rule,
      matchedToken,
    }
  }

  return {
    groups: groupsWithPendingTags(groups, pendingTags),
    pendingTags,
    signalSource,
    schoolFormRule: rule,
    matchedToken,
  }
}

/** Priority: name-based form > URL/school:de/partial form completions. */
export function maproulettePriorityFromOsmHeuristic(
  result: OsmHeuristicTagSuggestionsResult,
): MaprouletteTagFixPriority {
  if (Object.keys(result.pendingTags).length === 0) return 'prio3'
  if (result.signalSource === 'name') return 'prio1'
  if (
    result.signalSource === 'url' ||
    result.signalSource === 'school:de' ||
    result.signalSource === 'partial'
  ) {
    return 'prio2'
  }
  return 'prio3'
}
