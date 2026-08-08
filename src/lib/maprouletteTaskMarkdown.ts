import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'
import type { OsmHeuristicTagSuggestionsResult } from './osmHeuristicTagSuggestions'
import {
  groupsWithPendingTags,
  type OsmSuggestGroup,
  type OsmTagSuggestionsResult,
} from './osmTagSuggestions'
import type { StateCode } from './stateConfig'
import { STATE_LABEL_DE } from './stateConfig'

const UPLOAD_LEAD_TAIL =
  / Du kannst passende (?:OSM-Tags|Betreiber-Tags) taggen und im Hauptmenü hochladen\./g

function adaptLeadForMapRoulette(lead: string): string {
  return lead.replace(
    UPLOAD_LEAD_TAIL,
    ' Prüfe die Vorschläge und übernimm sie in MapRoulette, wenn sie passen.',
  )
}

function schoolDetailUrl(stateKey: StateCode, schoolKey: string): string {
  const enc = encodeURIComponent(schoolKey)
  return `${GITHUB_PAGES_SITE_ROOT}/bundesland/${stateKey}/schule/${enc}`
}

/** Normalize a school website string to an https URL, or null if empty. */
export function schoolWebsiteHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) return `https:${t}`
  return `https://${t}`
}

/** Prefer amtliche website, then OSM `website` / `contact:website`. */
export function resolveSchoolWebsiteHref(input: {
  officialProperties?: Record<string, unknown> | null
  osmTags?: Record<string, string> | null
}): string | null {
  const fromOfficial = schoolWebsiteHref(input.officialProperties?.website)
  if (fromOfficial) return fromOfficial
  const tags = input.osmTags
  if (!tags) return null
  return schoolWebsiteHref(tags.website) ?? schoolWebsiteHref(tags['contact:website'])
}

function appendHilfsmittel(
  lines: string[],
  input: {
    stateKey: StateCode
    schoolKey: string
    osmTypeId: string
    officialProperties?: Record<string, unknown> | null
    osmTags?: Record<string, string> | null
    /** When false, skip Schulabgleich detail link. */
    includeDetailLink?: boolean
  },
): void {
  lines.push('## Hilfsmittel', '')
  if (input.includeDetailLink !== false) {
    lines.push(`* [Schulabgleich Detailseite](${schoolDetailUrl(input.stateKey, input.schoolKey)})`)
  }
  lines.push(`* [OpenStreetMap](https://www.openstreetmap.org/${input.osmTypeId})`)

  const websiteHref = resolveSchoolWebsiteHref({
    officialProperties: input.officialProperties,
    osmTags: input.osmTags,
  })
  if (websiteHref) {
    lines.push(`* [Website der Schule](${websiteHref})`)
  }
}

export function buildMaprouletteTaskMarkdown(input: {
  stateKey: StateCode
  schoolKey: string
  schoolName: string | null | undefined
  osmTypeId: string
  suggestions: OsmTagSuggestionsResult
  officialProperties?: Record<string, unknown> | null
  osmTags?: Record<string, string> | null
}): string {
  const pendingGroups = groupsWithPendingTags(
    input.suggestions.groups,
    input.suggestions.pendingTags,
  )
  const name = input.schoolName?.trim() || 'Schule'
  const land = STATE_LABEL_DE[input.stateKey]
  const lines: string[] = [`## ${name}`, '', `${land} · OSM \`${input.osmTypeId}\``, '']

  for (const group of pendingGroups) {
    lines.push(`### ${group.title}`, '', adaptLeadForMapRoulette(group.lead), '')
    for (const tag of group.tags) {
      lines.push(`* \`${tag.key}=${tag.value}\``)
    }
    lines.push('')
  }

  appendHilfsmittel(lines, input)
  return lines.join('\n')
}

/**
 * Task markdown for the nationwide OSM-heuristic challenge (no official-data claims).
 * Prefers OSM website only in Hilfsmittel.
 */
export function buildMaprouletteOsmHeuristicTaskMarkdown(input: {
  stateKey: StateCode
  schoolKey: string
  schoolName: string | null | undefined
  osmTypeId: string
  suggestions: OsmHeuristicTagSuggestionsResult
  osmTags?: Record<string, string> | null
  includeDetailLink?: boolean
}): string {
  const name = input.schoolName?.trim() || 'Schule'
  const land = STATE_LABEL_DE[input.stateKey]
  const lines: string[] = [
    `## ${name}`,
    '',
    `${land} · OSM \`${input.osmTypeId}\``,
    '',
    '_Hinweis: Vorschläge stammen aus vorhandenen OSM-Tags (Name, URL oder `school`/`isced:level`/`school:de`), nicht aus amtlichen Schuldaten._',
    '',
  ]

  for (const group of input.suggestions.groups) {
    lines.push(`### ${group.title}`, '', group.lead, '')
    for (const tag of group.tags) {
      lines.push(`* \`${tag.key}=${tag.value}\``)
    }
    lines.push('')
  }

  appendHilfsmittel(lines, {
    stateKey: input.stateKey,
    schoolKey: input.schoolKey,
    osmTypeId: input.osmTypeId,
    officialProperties: null,
    osmTags: input.osmTags,
    includeDetailLink: input.includeDetailLink,
  })
  return lines.join('\n')
}

/** Challenge-level Mustache instruction (MapRoulette Tag Fix skill). */
export const MAPROULETTE_CHALLENGE_INSTRUCTION = [
  '## Kontext {{id}}',
  '',
  '{{task_markdown}}',
  '',
  '(Letzte Aktualisierung der Aufgabe: {{task_updated_at}})',
].join('\n')

export type { OsmSuggestGroup }
