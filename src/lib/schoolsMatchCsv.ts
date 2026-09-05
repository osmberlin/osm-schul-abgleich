import { z } from 'zod'
import { BUNDESLAND_OFFICIAL_SOURCES } from './bundeslandOfficialSources'
import { buildOsmBrowseUrl } from './editorLinks'
import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'
import {
  jedeschuleSchoolSchema,
  stateOfficialPointsFileSchema,
  type SchoolsMatchRow,
} from './schemas'
import { parseStateColumn, STATE_LABEL_DE } from './stateConfig'

/** Stable Germany-wide CSV filename under `public/datasets/`. */
export const SCHOOLS_MATCH_CSV_FILE_NAME = 'schools_matches.csv' as const

/** Suggested `download` attribute for the Germany-wide CSV. */
export const SCHOOLS_MATCH_CSV_DOWNLOAD_FILE_NAME = 'schulabgleich_DE_schools_matches.csv' as const

/** OSM database licence short name (rows with an OSM object). */
export const OSM_CSV_LICENSE = 'ODbL 1.0' as const

export const OSM_CSV_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright' as const

/** OSM tags flattened to their own CSV columns (compare-UI first-class keys). */
export const SCHOOLS_MATCH_CSV_OSM_FLAT_TAGS = [
  'amenity',
  'education',
  'school',
  'school:de',
  'isced:level',
  'operator',
  'operator:type',
  'ref',
  'website',
  'phone',
  'email',
  'addr:street',
  'addr:housenumber',
  'addr:postcode',
  'addr:city',
] as const

export type SchoolsMatchCsvOsmFlatTag = (typeof SCHOOLS_MATCH_CSV_OSM_FLAT_TAGS)[number]

const OSM_FLAT_TAG_TO_HEADER = {
  amenity: 'osm_amenity',
  education: 'osm_education',
  school: 'osm_school',
  'school:de': 'osm_school_de',
  'isced:level': 'osm_isced_level',
  operator: 'osm_operator',
  'operator:type': 'osm_operator_type',
  ref: 'osm_ref',
  website: 'osm_website',
  phone: 'osm_phone',
  email: 'osm_email',
  'addr:street': 'osm_addr_street',
  'addr:housenumber': 'osm_addr_housenumber',
  'addr:postcode': 'osm_addr_postcode',
  'addr:city': 'osm_addr_city',
} as const satisfies Record<SchoolsMatchCsvOsmFlatTag, string>

export type SchoolsMatchCsvColumn = {
  header: string
  descriptionDe: string
}

/**
 * Column spec shared by the pipeline writer and the download-page legend.
 * Headers are English snake_case; descriptions are German (shown on `/download`).
 */
export const SCHOOLS_MATCH_CSV_COLUMNS = [
  {
    header: 'bundesland',
    descriptionDe: 'ISO-3166-2-Code des Bundeslands ohne DE- (z. B. BE, NW).',
  },
  {
    header: 'bundesland_name',
    descriptionDe: 'Deutscher Name des Bundeslands (z. B. Berlin, Nordrhein-Westfalen).',
  },
  {
    header: 'official_license',
    descriptionDe:
      'Kurzname der amtlichen Lizenz laut unserer Recherche (z. B. CC BY 4.0, DL-DE Zero 2.0, unknown).',
  },
  {
    header: 'official_osm_compatible',
    descriptionDe:
      'Ob die amtliche Quelle für OSM nutzbar ist: unknown, no, yes_licence oder yes_waiver.',
  },
  {
    header: 'official_source_url',
    descriptionDe: 'URL der amtlichen Datenquelle (Portal/API), wie in der Lizenz-Tabelle.',
  },
  {
    header: 'official_source_ref_url',
    descriptionDe:
      'Optionale zweite amtliche URL (z. B. WFS/CSV-Abruf oder Metadaten), wenn sie von official_source_url abweicht.',
  },
  {
    header: 'official_license_note',
    descriptionDe: 'Kurzer Recherche-Hinweis zur amtlichen Lizenz (kann leer sein).',
  },
  {
    header: 'osm_license',
    descriptionDe: 'Lizenz der OSM-Anteile (ODbL 1.0). Leer, wenn die Zeile kein OSM-Objekt hat.',
  },
  {
    header: 'osm_copyright_url',
    descriptionDe: 'openstreetmap.org/copyright. Leer, wenn die Zeile kein OSM-Objekt hat.',
  },
  {
    header: 'category',
    descriptionDe:
      'Abgleichskategorie: matched, official_only, osm_only, match_ambiguous oder official_no_coord.',
  },
  {
    header: 'match_mode',
    descriptionDe:
      'Wie die Zuordnung erfolgte (distance, distance_and_name, ref, website, …). Leer, wenn nicht eindeutig gematcht.',
  },
  {
    header: 'distance_meters',
    descriptionDe:
      'Abstand in Metern zwischen amtlichem Punkt und OSM-Schwerpunkt. Nur bei gematchten Zeilen.',
  },
  {
    header: 'key',
    descriptionDe: 'Stabile Zeilen-ID im Schulabgleich (auch Teil der Detail-URL).',
  },
  {
    header: 'detail_url',
    descriptionDe: 'Permalink zur Schul-Detailseite in dieser Anwendung.',
  },
  { header: 'official_id', descriptionDe: 'JedeSchule-Kennung (z. B. BE-03P11).' },
  { header: 'official_name', descriptionDe: 'Name laut amtlichem Register (JedeSchule).' },
  { header: 'official_lat', descriptionDe: 'Geographische Breite des amtlichen Punkts.' },
  { header: 'official_lon', descriptionDe: 'Geographische Länge des amtlichen Punkts.' },
  { header: 'official_address', descriptionDe: 'Straße und Hausnummer laut JedeSchule.' },
  { header: 'official_city', descriptionDe: 'Ort laut JedeSchule.' },
  { header: 'official_zip', descriptionDe: 'Postleitzahl laut JedeSchule.' },
  {
    header: 'official_school_type',
    descriptionDe: 'Schulart als Freitext aus dem Landesregister (JedeSchule school_type).',
  },
  { header: 'official_website', descriptionDe: 'Website laut JedeSchule.' },
  { header: 'official_phone', descriptionDe: 'Telefon laut JedeSchule.' },
  { header: 'official_email', descriptionDe: 'E-Mail laut JedeSchule.' },
  {
    header: 'official_legal_status',
    descriptionDe: 'Rechtsstatus / Trägerschaftsart laut JedeSchule.',
  },
  { header: 'official_provider', descriptionDe: 'Träger laut JedeSchule.' },
  {
    header: 'official_update_timestamp',
    descriptionDe: 'Zeitstempel der amtlichen Stammdaten in JedeSchule.',
  },
  { header: 'osm_type', descriptionDe: 'OSM-Objektart: node, way oder relation.' },
  { header: 'osm_id', descriptionDe: 'OSM-Objekt-ID.' },
  { header: 'osm_url', descriptionDe: 'openstreetmap.org-Seite des OSM-Objekts.' },
  { header: 'osm_name', descriptionDe: 'Anzeigename aus den OSM-Namens-Tags.' },
  {
    header: 'osm_centroid_lat',
    descriptionDe: 'Geographische Breite des OSM-Geometrie-Schwerpunkts.',
  },
  {
    header: 'osm_centroid_lon',
    descriptionDe: 'Geographische Länge des OSM-Geometrie-Schwerpunkts.',
  },
  {
    header: 'osm_has_area',
    descriptionDe: 'true, wenn für das OSM-Objekt eine Flächengeometrie vorliegt; sonst false.',
  },
  { header: 'osm_amenity', descriptionDe: 'OSM-Tag amenity (meist school oder college).' },
  { header: 'osm_education', descriptionDe: 'OSM-Tag education.' },
  { header: 'osm_school', descriptionDe: 'OSM-Tag school (z. B. primary, secondary).' },
  { header: 'osm_school_de', descriptionDe: 'OSM-Tag school:de (deutsche Schulart).' },
  { header: 'osm_isced_level', descriptionDe: 'OSM-Tag isced:level.' },
  { header: 'osm_operator', descriptionDe: 'OSM-Tag operator.' },
  { header: 'osm_operator_type', descriptionDe: 'OSM-Tag operator:type.' },
  { header: 'osm_ref', descriptionDe: 'OSM-Tag ref (oft die amtliche Schulnummer).' },
  { header: 'osm_website', descriptionDe: 'OSM-Tag website.' },
  { header: 'osm_phone', descriptionDe: 'OSM-Tag phone.' },
  { header: 'osm_email', descriptionDe: 'OSM-Tag email.' },
  { header: 'osm_addr_street', descriptionDe: 'OSM-Tag addr:street.' },
  { header: 'osm_addr_housenumber', descriptionDe: 'OSM-Tag addr:housenumber.' },
  { header: 'osm_addr_postcode', descriptionDe: 'OSM-Tag addr:postcode.' },
  { header: 'osm_addr_city', descriptionDe: 'OSM-Tag addr:city.' },
  {
    header: 'osm_other_tags',
    descriptionDe:
      'Übrige OSM-Tags als kompaktes JSON-Objekt (ohne die extra ausgewiesenen Spalten).',
  },
  {
    header: 'school_form_rule',
    descriptionDe:
      'Abgeleitete Schulform für den Abgleich: grundschule, gymnasium, gesamtschule oder hauptReal.',
  },
  {
    header: 'school_form_family',
    descriptionDe: 'Schulform-Familie: grundschule oder weiterfuehrend.',
  },
  {
    header: 'school_form_combo',
    descriptionDe:
      'Wie amtliche und OSM-Schulform zusammenpassen (matching_tags, missing_osm, only_osm, …).',
  },
  {
    header: 'school_form_signal_source',
    descriptionDe: 'Woher das Schulform-Signal stammt: official, osm oder none.',
  },
  {
    header: 'school_kind_de',
    descriptionDe: 'Kanonische deutsche Schulart aus OSM school / school:de.',
  },
  {
    header: 'ambiguous_official_ids',
    descriptionDe:
      'Bei uneindeutigen Treffern: JedeSchule-IDs der Kandidaten, getrennt durch Semikolon.',
  },
] as const satisfies readonly SchoolsMatchCsvColumn[]

export type SchoolsMatchCsvHeader = (typeof SCHOOLS_MATCH_CSV_COLUMNS)[number]['header']

const CSV_HEADERS: SchoolsMatchCsvHeader[] = SCHOOLS_MATCH_CSV_COLUMNS.map((c) => c.header)

const OSM_FLAT_TAG_SET = new Set<string>(SCHOOLS_MATCH_CSV_OSM_FLAT_TAGS)

const officialCsvPropsSchema = jedeschuleSchoolSchema.partial()

const csvWriteOptionsSchema = z.object({
  bundesland: z.string(),
  officialPointsById: stateOfficialPointsFileSchema.optional(),
})

export type SchoolsMatchCsvWriteOptions = z.infer<typeof csvWriteOptionsSchema>

export type SchoolsMatchCsvBatch = {
  rows: SchoolsMatchRow[]
  options: SchoolsMatchCsvWriteOptions
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return ''
  if (value === true) return 'true'
  if (value === false) return 'false'
  return String(value)
}

function officialLonLat(
  officialId: string | null,
  official: z.infer<typeof officialCsvPropsSchema>,
  officialPointsById: z.infer<typeof stateOfficialPointsFileSchema> | undefined,
): { lon: string; lat: string } {
  if (officialId) {
    const fromIndex = officialPointsById?.[officialId]
    if (fromIndex) return { lon: csvCell(fromIndex[0]), lat: csvCell(fromIndex[1]) }
  }
  return { lon: csvCell(official.longitude), lat: csvCell(official.latitude) }
}

function officialProvenanceCells(bundesland: string): {
  bundesland_name: string
  official_license: string
  official_osm_compatible: string
  official_source_url: string
  official_source_ref_url: string
  official_license_note: string
} {
  const code = parseStateColumn(bundesland)
  if (!code) {
    return {
      bundesland_name: '',
      official_license: '',
      official_osm_compatible: '',
      official_source_url: '',
      official_source_ref_url: '',
      official_license_note: '',
    }
  }
  const row = BUNDESLAND_OFFICIAL_SOURCES[code]
  return {
    bundesland_name: STATE_LABEL_DE[code],
    official_license: row.officialLicense,
    official_osm_compatible: row.osmCompatible,
    official_source_url: row.officialSourceUrl,
    official_source_ref_url: row.officialSourceRefUrl ?? '',
    official_license_note: row.likelyNote,
  }
}

function osmOtherTagsJson(tags: Record<string, string> | null | undefined): string {
  if (!tags) return ''
  const rest: Record<string, string> = {}
  for (const [k, v] of Object.entries(tags)) {
    if (OSM_FLAT_TAG_SET.has(k)) continue
    rest[k] = v
  }
  if (Object.keys(rest).length === 0) return ''
  return JSON.stringify(rest)
}

export function schoolsMatchDetailUrl(bundesland: string, key: string): string {
  return `${GITHUB_PAGES_SITE_ROOT}/bundesland/${encodeURIComponent(bundesland)}/schule/${encodeURIComponent(key)}`
}

export function mapSchoolsMatchRowToCsvRecord(
  row: SchoolsMatchRow,
  options: SchoolsMatchCsvWriteOptions,
): Record<SchoolsMatchCsvHeader, string> {
  const parsedOptions = csvWriteOptionsSchema.parse(options)
  const official = officialCsvPropsSchema.parse(row.officialProperties ?? {})
  const tags = row.osmTags ?? null
  const hasOsm = row.osmId != null && row.osmType != null
  const { lon: officialLon, lat: officialLat } = officialLonLat(
    row.officialId,
    official,
    parsedOptions.officialPointsById,
  )

  const provenance = officialProvenanceCells(parsedOptions.bundesland)

  const record = {
    bundesland: parsedOptions.bundesland,
    bundesland_name: provenance.bundesland_name,
    official_license: provenance.official_license,
    official_osm_compatible: provenance.official_osm_compatible,
    official_source_url: provenance.official_source_url,
    official_source_ref_url: provenance.official_source_ref_url,
    official_license_note: provenance.official_license_note,
    osm_license: hasOsm ? OSM_CSV_LICENSE : '',
    osm_copyright_url: hasOsm ? OSM_CSV_COPYRIGHT_URL : '',
    category: row.category,
    match_mode: csvCell(row.matchMode),
    distance_meters: csvCell(row.distanceMeters),
    key: row.key,
    detail_url: schoolsMatchDetailUrl(parsedOptions.bundesland, row.key),
    official_id: csvCell(row.officialId),
    official_name: csvCell(row.officialName),
    official_lat: officialLat,
    official_lon: officialLon,
    official_address: csvCell(official.address),
    official_city: csvCell(official.city),
    official_zip: csvCell(official.zip),
    official_school_type: csvCell(official.school_type),
    official_website: csvCell(official.website),
    official_phone: csvCell(official.phone),
    official_email: csvCell(official.email),
    official_legal_status: csvCell(official.legal_status),
    official_provider: csvCell(official.provider),
    official_update_timestamp: csvCell(official.update_timestamp),
    osm_type: csvCell(row.osmType),
    osm_id: csvCell(row.osmId),
    osm_url: buildOsmBrowseUrl(row.osmType, row.osmId) ?? '',
    osm_name: csvCell(row.osmName),
    osm_centroid_lat: csvCell(row.osmCentroidLat),
    osm_centroid_lon: csvCell(row.osmCentroidLon),
    osm_has_area: hasOsm ? csvCell(row.hasArea === true) : '',
    osm_amenity: '',
    osm_education: '',
    osm_school: '',
    osm_school_de: '',
    osm_isced_level: '',
    osm_operator: '',
    osm_operator_type: '',
    osm_ref: '',
    osm_website: '',
    osm_phone: '',
    osm_email: '',
    osm_addr_street: '',
    osm_addr_housenumber: '',
    osm_addr_postcode: '',
    osm_addr_city: '',
    osm_other_tags: osmOtherTagsJson(tags),
    school_form_rule: csvCell(row.schoolFormRule),
    school_form_family: csvCell(row.schoolFormFamily),
    school_form_combo: csvCell(row.schoolFormCombo),
    school_form_signal_source: csvCell(row.schoolFormSignalSource),
    school_kind_de: csvCell(row.schoolKindDe),
    ambiguous_official_ids: (row.ambiguousOfficialIds ?? []).join(';'),
  } satisfies Record<SchoolsMatchCsvHeader, string>

  if (tags) {
    for (const tag of SCHOOLS_MATCH_CSV_OSM_FLAT_TAGS) {
      const header = OSM_FLAT_TAG_TO_HEADER[tag]
      const value = tags[tag]
      record[header] = value == null ? '' : value
    }
  }

  return record
}

/** RFC 4180 encoder in-process so the SPA can import this module (csv-stringify uses Node `Buffer`). */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

/** UTF-8 with BOM, RFC 4180 comma-separated, header row from {@link SCHOOLS_MATCH_CSV_COLUMNS}. */
export function stringifySchoolsMatchCsv(
  rows: SchoolsMatchRow[],
  options: SchoolsMatchCsvWriteOptions,
): string {
  return stringifySchoolsMatchCsvBatches([{ rows, options }])
}

/** Concatenate several Länder into one CSV (single header row). */
export function stringifySchoolsMatchCsvBatches(batches: readonly SchoolsMatchCsvBatch[]): string {
  const records = batches.flatMap(({ rows, options }) =>
    rows.map((row) => mapSchoolsMatchRowToCsvRecord(row, options)),
  )
  const lines = [
    CSV_HEADERS.join(','),
    ...records.map((record) => CSV_HEADERS.map((header) => csvEscape(record[header])).join(',')),
  ]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
