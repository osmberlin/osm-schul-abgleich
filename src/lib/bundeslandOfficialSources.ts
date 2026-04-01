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
  /** Free text, e.g. `CC BY 4.0`, or `unknown` until researched. */
  officialLicense: string
  osmCompatible: OsmLicenseCompatibility
  /** Non-binding note; not a legal assertion. */
  likelyNote: string
  /** ISO date (YYYY-MM-DD) when portal/terms were last reviewed. */
  lastCheckedAt?: string
  /** GitHub username of verifier (set when merging a PR / from issue author). */
  lastCheckedByGithub?: string
  /** Optional link backing the OSM-compatibility assessment (e.g. official PDF on the OSM wiki). */
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
  ),
  HB: seed('https://www.bildung.bremen.de/detail.php?template=35_schulsuche_stufe2_d'),
  HH: seed('https://metaver.de/trefferanzeige?docuuid=BDEB9B13-0C2B-42A3-B248-A31B01B454BA'),
  HE: seed('https://schul-db.bildung.hessen.de/schul_db.html'),
  MV: seed('https://www.laiv-mv.de/Statistik/Ver%C3%B6ffentlichungen/Verzeichnisse/'),
  NI: seed('https://schulen.nibis.de/search/advanced'),
  NW: seed('https://www.schulministerium.nrw/open-data'),
  RP: seed('https://bildung.rlp.de/schulen'),
  SL: seed(
    'https://geoportal.saarland.de/arcgis/services/Internet/Staatliche_Dienste/MapServer/WFSServer?SERVICE=WFS&REQUEST=GetCapabilities',
  ),
  SN: seed('https://schuldatenbank.sachsen.de/index.php?id=30'),
  ST: seed(
    'https://www.bildung-lsa.de/ajax.php?m=getSSResult&q=&lk=-1&sf=-1&so=-1&timestamp=1480082277128/',
  ),
  SH: seed('https://opendata.schleswig-holstein.de/dataset/schulen-2024-01-31'),
  TH: seed('https://www.schulportal-thueringen.de/start'),
} as const satisfies Record<LandCode, BundeslandOfficialSourceRow>

/** Runtime guard: every LandCode has a row. */
for (const code of STATE_ORDER) {
  if (!(code in BUNDESLAND_OFFICIAL_SOURCES)) {
    throw new Error(`Missing BUNDESLAND_OFFICIAL_SOURCES entry for ${code}`)
  }
}
