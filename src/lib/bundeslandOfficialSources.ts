import type { LandCode } from './stateConfig'
import { STATE_ORDER } from './stateConfig'

/**
 * Crowd-sourced: official publisher licence text (or `unknown`) and whether use is compatible
 * with contributing data to OpenStreetMap under common tagging practice.
 */
export type OsmLicenseCompatibility = 'unknown' | 'no' | 'yes_licence' | 'yes_waiver'

export type BundeslandOfficialSourceRow = {
  /** Primary official source URL (aligned with jedeschule.codefor.de/ueber/ where possible). */
  officialSourceUrl: string
  /**
   * Optional second official URL when it differs from `officialSourceUrl` (e.g. OGC-API / CSV-Abruf
   * vs. Geodatenportal; licence research “Nachweis” for the public URL). Omit when identical.
   */
  officialSourceRefUrl?: string
  /** Free text, e.g. `CC BY 4.0`, or `unknown` until researched. */
  officialLicense: string
  osmCompatible: OsmLicenseCompatibility
  /** Non-binding note; not a legal assertion. */
  likelyNote: string
  /** ISO date (YYYY-MM-DD) when portal/terms were last reviewed. */
  lastCheckedAt?: string
  /** GitHub username of verifier (set when merging a PR / from issue author). */
  lastCheckedByGithub?: string
  /** Optional link backing the OSM-compatibility assessment (e.g. OSM-Wiki, Waiver-PDF). */
  osmCompatibilityRefUrl?: string
}

const u = (url: string) => url

function seed(
  officialSourceUrl: string,
  overrides: Partial<Omit<BundeslandOfficialSourceRow, 'officialSourceUrl'>> = {},
): BundeslandOfficialSourceRow {
  return {
    officialSourceUrl: u(officialSourceUrl),
    officialLicense: 'unknown',
    osmCompatible: 'unknown',
    likelyNote: '',
    ...overrides,
  }
}

/**
 * Per-Land official sources (JedeSchule Über + Bayern WFS documented in jedeschule-scraper).
 * Update via PR; link from the homepage section.
 */
export const BUNDESLAND_OFFICIAL_SOURCES = {
  BW: seed('https://lobw.kultus-bw.de/didsuche/'),
  BY: seed(
    'https://gdiserv.bayern.de/srv112940/services/schulstandortebayern-wfs?SERVICE=WFS&REQUEST=GetCapabilities',
  ),
  BE: seed('https://daten.berlin.de/datensaetze/schulen-wfs-ebc64e18', {
    officialLicense: 'DL-DE Zero 2.0',
    osmCompatible: 'yes_waiver',
    lastCheckedAt: '2026-04-01',
    lastCheckedByGithub: 'tordans',
    osmCompatibilityRefUrl:
      'https://wiki.openstreetmap.org/w/images/3/34/2019-06-03_Datenlizenz_Deutschland_Berlin_OSM.pdf',
  }),
  BB: seed(
    'https://geoportal.brandenburg.de/detailansichtdienst/render?view=gdibb&url=https://geoportal.brandenburg.de/gs-json/xml?fileid=d040077b-fcd1-4ab0-bc7f-a818fc6fa244',
    {
      officialLicense: 'DL-DE BY 2.0',
      osmCompatible: 'yes_waiver',
      lastCheckedAt: '2026-04-01',
      lastCheckedByGithub: 'tordans',
      osmCompatibilityRefUrl:
        'https://wiki.openstreetmap.org/wiki/Brandenburg/Geoportal#Rechtliche_Grundlagen',
    },
  ),
  HB: seed('https://www.bildung.bremen.de/detail.php?template=35_schulsuche_stufe2_d'),
  HH: seed('https://metaver.de/trefferanzeige?docuuid=BDEB9B13-0C2B-42A3-B248-A31B01B454BA', {
    officialSourceRefUrl: 'https://api.hamburg.de/datasets/v1/schulen',
    officialLicense: 'DL-DE BY 2.0',
    osmCompatible: 'no',
    lastCheckedAt: '2026-04-05',
    lastCheckedByGithub: 'vizsim',
  }),
  HE: seed('https://schul-db.bildung.hessen.de/schul_db.html'),
  MV: seed('https://www.laiv-mv.de/Statistik/Ver%C3%B6ffentlichungen/Verzeichnisse/'),
  NI: seed('https://schulen.nibis.de/search/advanced'),
  NW: seed('https://www.schulministerium.nrw/open-data', {
    officialSourceRefUrl:
      'https://www.schulministerium.nrw.de/BiPo/OpenData/Schuldaten/schuldaten.csv',
    officialLicense: 'DL-DE BY 2.0',
    osmCompatible: 'no',
    lastCheckedAt: '2026-04-05',
    lastCheckedByGithub: 'vizsim',
  }),
  RP: seed('https://bildung.rlp.de/schulen'),
  SL: seed(
    'https://geoportal.saarland.de/arcgis/services/Internet/Staatliche_Dienste/MapServer/WFSServer?SERVICE=WFS&REQUEST=GetCapabilities',
  ),
  SN: seed('https://schuldatenbank.sachsen.de/index.php?id=30'),
  ST: seed(
    'https://www.bildung-lsa.de/ajax.php?m=getSSResult&q=&lk=-1&sf=-1&so=-1&timestamp=1480082277128/',
  ),
  SH: seed('https://opendata.schleswig-holstein.de/dataset/schulen-2026-03-26', {
    officialLicense: 'CC0 1.0',
    osmCompatible: 'yes_licence',
    lastCheckedAt: '2026-04-17',
    lastCheckedByGithub: 'vizsim',
  }),
  TH: seed('https://www.schulportal-thueringen.de/start'),
} as const satisfies Record<LandCode, BundeslandOfficialSourceRow>

/** Runtime guard: every LandCode has a row. */
for (const code of STATE_ORDER) {
  if (!(code in BUNDESLAND_OFFICIAL_SOURCES)) {
    throw new Error(`Missing BUNDESLAND_OFFICIAL_SOURCES entry for ${code}`)
  }
}

/** Fragment for homepage licence table row (e.g. `licence-bw` → URL `#licence-bw`). No leading `#`. */
export function licenceTableRowHash(code: LandCode): string {
  return `licence-${code.toLowerCase()}`
}
