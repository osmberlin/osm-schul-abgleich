import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'
import type { OfficialCreateTagsResult } from './officialCreateTags'
import type { OsmHeuristicTagSuggestionsResult } from './osmHeuristicTagSuggestions'
import {
  groupsWithPendingTags,
  type OsmSuggestGroup,
  type OsmSuggestGroupKind,
  type OsmTagSuggestionsResult,
} from './osmTagSuggestions'
import type { StateCode } from './stateConfig'
import { STATE_LABEL_DE } from './stateConfig'

/** MR-only H3 titles for official Tag Fix groups (in-app UI keeps de.osm.*SectionTitle). */
const OFFICIAL_MR_GROUP_TITLE: Record<OsmSuggestGroupKind, string> = {
  grundschule: 'Als "Grundschule" taggen',
  gymnasium: 'Als "Gymnasium" taggen',
  gesamtschule: 'Als "Gesamtschule" taggen',
  hauptReal: 'Als "Hauptschule/Realschule" taggen',
  oeffentlicheTraegerschaft: 'Als "in öffentlicher Trägerschaft" taggen',
  ref: 'Diese offizielle Referenz-ID taggen',
}

/** Optional lead under an H3 (only `ref` for now). */
const OFFICIAL_MR_GROUP_LEAD: Partial<Record<OsmSuggestGroupKind, string>> = {
  ref: 'Eine eindeutige `ref` macht den Datenabgleich bedeutend einfacher.',
}

const OFFICIAL_MR_CTA =
  'Auf Basis der amtlichen Daten haben wir diese Vorschläge abgeleitet. Prüfe sie und übernehme sie dann, wenn sie plausibel sind.'

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

function appendTagsCodeFence(
  lines: string[],
  tags: readonly { key: string; value: string }[],
): void {
  lines.push('```')
  for (const tag of tags) {
    lines.push(`${tag.key}=${tag.value}`)
  }
  lines.push('```', '')
}

export function buildMaprouletteTaskMarkdown(input: {
  stateKey: StateCode
  schoolKey: string
  schoolName: string | null | undefined
  /** Kept for call-site compatibility; OSM id lives in challenge Mustache `{{id}}`. */
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
  const lines: string[] = [`## ${name}, ${land}`, '', OFFICIAL_MR_CTA, '']

  const websiteHref = resolveSchoolWebsiteHref({
    officialProperties: input.officialProperties,
    osmTags: input.osmTags,
  })
  if (websiteHref) {
    lines.push(`* [Zur Website der Schule.](${websiteHref})`)
  }
  lines.push(
    `* [Zur Detailseite im Schulabgleich.](${schoolDetailUrl(input.stateKey, input.schoolKey)})`,
    '',
  )

  for (const group of pendingGroups) {
    lines.push(`### ${OFFICIAL_MR_GROUP_TITLE[group.kind]}`, '')
    const lead = OFFICIAL_MR_GROUP_LEAD[group.kind]
    if (lead) {
      lines.push(lead, '')
    }
    appendTagsCodeFence(lines, group.tags)
  }

  return lines.join('\n').trimEnd()
}

/**
 * Task markdown for OSM-only Tag Fix tasks (no official-data claims).
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

const CREATE_MR_CTA =
  'Diese Schule ist in den amtlichen Daten vorhanden und hat eine Position, fehlt aber noch in OSM. Prüfe vor Ort oder anhand von Luftbildern, ob sie dort existiert, und lege sie dann an (meist als Punkt). Übernehme die Tags, wenn sie plausibel sind; Geometrie und Position bitte selbst prüfen.'

/**
 * Task markdown for creating a missing school (no OSM object yet).
 * Layout aligned with official Tag Fix: H2 name+Land, CTA, links, code fence.
 */
export function buildMaprouletteCreateSchoolTaskMarkdown(input: {
  stateKey: StateCode
  schoolKey: string
  create: OfficialCreateTagsResult
  officialProperties?: Record<string, unknown> | null
}): string {
  const land = STATE_LABEL_DE[input.stateKey]
  const lines: string[] = [`## ${input.create.name}, ${land}`, '', CREATE_MR_CTA, '']

  const websiteHref = resolveSchoolWebsiteHref({
    officialProperties: input.officialProperties,
    osmTags: null,
  })
  if (websiteHref) {
    lines.push(`* [Zur Website der Schule.](${websiteHref})`)
  }
  lines.push(
    `* [Zur Detailseite im Schulabgleich.](${schoolDetailUrl(input.stateKey, input.schoolKey)})`,
    '',
  )

  lines.push('### Vorgeschlagene Tags', '')
  appendTagsCodeFence(
    lines,
    Object.entries(input.create.tags).map(([key, value]) => ({ key, value })),
  )

  if (input.create.addressGuidance) {
    lines.push(
      '### Adresse (Hinweis)',
      '',
      `Amtliche Adresse konnte nicht sicher in \`addr:street\`/\`addr:housenumber\` zerlegt werden: **${input.create.addressGuidance}**`,
      '',
    )
  }

  return lines.join('\n').trimEnd()
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
