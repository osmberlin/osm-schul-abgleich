import type { StateCode } from './stateConfig'
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
  BW: seed('https://lobw.kultus-bw.de/didsuche/', {
    osmCompatible: 'no',
    likelyNote:
      'Keine Open-Data-Lizenz; KM-Impressum schränkt Weiterverbreitung ein. Siehe research/licenses-unknown-laender.md.',
    lastCheckedAt: '2026-08-08',
    lastCheckedByGithub: 'tordans',
  }),
  BY: seed(
    'https://geoportal.bayern.de/csw/gdi?service=CSW&version=2.0.2&request=GetRecords&namespace=xmlns(csw=http://www.opengis.net/cat/csw/2.0.2),xmlns(gmd=http://www.isotc211.org/2005/gmd)&resultType=results&outputFormat=application/xml&outputSchema=http://www.isotc211.org/2005/gmd&startPosition=1&maxRecords=1&typeNames=csw:Record&elementSetName=full&constraintLanguage=CQL_TEXT&constraint_language_version=1.1.0&constraint=csw:ResourceIdentifier=%27*91c52669-956d-44c9-8fbf-440b75fcf8a8*%27',
    {
      officialSourceRefUrl:
        'https://gdiserv.bayern.de/srv112940/services/schulstandortebayern-wfs?SERVICE=WFS&REQUEST=GetCapabilities',
      officialLicense: 'CC BY 4.0',
      osmCompatible: 'unknown',
      likelyNote: 'Unklar ob es ein Waiver gibt um CC BY 4.0 für OSM nutzen zu können.',
      lastCheckedAt: '2026-04-17',
      lastCheckedByGithub: 'vizsim',
    },
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
  HB: seed('https://metaver.de/trefferanzeige?docuuid=13FA066D-4E46-4486-83D1-537B09743D95', {
    officialSourceRefUrl:
      'https://www.bildung.bremen.de/detail.php?template=35_schulsuche_stufe2_d',
    officialLicense: 'CC BY',
    osmCompatible: 'unknown',
    likelyNote:
      'Open-Data-Dataset Schulstandorte (MetaVer); CC-BY-Version und OSM-Addendum unklar. Schulwegweiser ohne Lizenz. Siehe research/licenses-unknown-laender.md.',
    lastCheckedAt: '2026-08-08',
    lastCheckedByGithub: 'tordans',
  }),
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
  RP: seed('https://bildung.rlp.de/schulen', {
    osmCompatible: 'no',
    likelyNote:
      'Bildungsserver-Impressum: kommerzielle Verbreitung ohne Genehmigung untersagt. Siehe research/licenses-unknown-laender.md.',
    lastCheckedAt: '2026-08-08',
    lastCheckedByGithub: 'tordans',
    osmCompatibilityRefUrl: 'https://wiki.openstreetmap.org/wiki/DE:Permissions',
  }),
  SL: seed(
    'https://geoportal.saarland.de/arcgis/services/Internet/Staatliche_Dienste/MapServer/WFSServer?SERVICE=WFS&REQUEST=GetCapabilities',
    {
      officialSourceRefUrl:
        'https://geoportal.saarland.de/mapbender/php/mod_showMetadata.php?id=36880&layout=tabs&redirectToMetadataUrl=1&resource=layer',
      officialLicense: 'CC BY 4.0',
      osmCompatible: 'unknown',
      likelyNote:
        'GDI-SL Metadaten: Namensnennung 4.0 / © GDI-SL. OSM-Addendum unklar (wie BY). Siehe research/licenses-unknown-laender.md.',
      lastCheckedAt: '2026-08-08',
      lastCheckedByGithub: 'tordans',
    },
  ),
  SN: seed('https://schuldatenbank.sachsen.de/index.php?id=30'),
  ST: seed('https://www.bildung-lsa.de/index.php?KAT_ID=1277', {
    officialSourceRefUrl:
      'https://www.arcgis.com/sharing/rest/content/items/17321cd4cbe74eef8804cea24af4cab1?f=pjson',
    officialLicense: 'proprietary (StaLa: reproduction prohibited)',
    osmCompatible: 'no',
    likelyNote:
      'StaLa: Vervielfältigung und Verbreitung grundsätzlich untersagt. Siehe research/licenses-unknown-laender.md.',
    lastCheckedAt: '2026-08-08',
    lastCheckedByGithub: 'tordans',
  }),
  SH: seed('https://opendata.schleswig-holstein.de/dataset/schulen-2026-03-26', {
    officialLicense: 'CC0 1.0',
    osmCompatible: 'yes_licence',
    lastCheckedAt: '2026-04-17',
    lastCheckedByGithub: 'vizsim',
  }),
  TH: seed(
    'https://www.geoproxy.geoportal-th.de/geoproxy/services/kommunal/komm_wfs?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0',
    {
      officialSourceRefUrl:
        'https://geomis.geoportal-th.de/geonetwork/srv/api/records/17ebc9d7-9571-47d0-ac19-275cdd269c43',
      officialLicense: 'DL-DE BY 2.0',
      osmCompatible: 'no',
      likelyNote:
        'WFS © GDI-Th; Datensatz kommunal. DL-DE BY ohne OSM-Waiver. Siehe research/licenses-unknown-laender.md.',
      lastCheckedAt: '2026-08-08',
      lastCheckedByGithub: 'tordans',
    },
  ),
} as const satisfies Record<StateCode, BundeslandOfficialSourceRow>

/** Runtime guard: every StateCode has a row. */
for (const code of STATE_ORDER) {
  if (!(code in BUNDESLAND_OFFICIAL_SOURCES)) {
    throw new Error(`Missing BUNDESLAND_OFFICIAL_SOURCES entry for ${code}`)
  }
}

/** Fragment for homepage licence table row (e.g. `licence-bw` → URL `#licence-bw`). No leading `#`. */
export function licenceTableRowHash(code: StateCode): string {
  return `licence-${code.toLowerCase()}`
}
