import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'
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

export function buildMaprouletteTaskMarkdown(input: {
  stateKey: StateCode
  schoolKey: string
  schoolName: string | null | undefined
  osmTypeId: string
  suggestions: OsmTagSuggestionsResult
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

  lines.push(
    '## Hilfsmittel',
    '',
    `* [Schulabgleich Detailseite](${schoolDetailUrl(input.stateKey, input.schoolKey)})`,
    `* [OpenStreetMap](https://www.openstreetmap.org/${input.osmTypeId})`,
  )

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
