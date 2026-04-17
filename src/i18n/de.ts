import { formatDeInteger } from '../lib/formatNumber'

export const de = {
  appTitle: 'OSM Schulabgleich',
  navHome: 'Start',
  navStatus: 'Pipeline-Status',

  osm: {
    authLoading: 'OSM …',
    login: 'Anmelden',
    loginBusy: 'Anmeldung…',
    loginFailed: 'Anmeldung fehlgeschlagen',
    oauthSpaRegistrationHint:
      'Registriere die OAuth-App auf openstreetmap.org ohne „Confidential application“ (öffentliche App + PKCE). Als „Confidential“ liefert der Token-Schritt 401, weil kein Client-Secret im Browser gesendet wird. Siehe wiki.openstreetmap.org/wiki/OAuth (Abschnitt „Registering your application…”).',
    logout: 'Abmelden',
    oauthMissingShort: 'OAuth nicht konfiguriert',
    oauthMissingHint: 'Setze VITE_OSM_OAUTH_CLIENT_ID für die OSM-Anmeldung.',
    reviewLink: 'Prüfen und hochladen',
    reviewBreadcrumb: 'Änderungen prüfen',
    reviewTitle: 'Änderungen prüfen und zu OSM hochladen',
    reviewLead:
      'Die Liste unten zeigt vorgemerkte Tag-Änderungen. Sie gehen beim Schließen des Tabs verloren, bis du sie hochlädst.',
    reviewEmpty: 'Keine vorgemerkten Änderungen.',
    reviewNotLoggedIn: 'Melde dich mit deinem OSM-Konto an, um Änderungen hochzuladen.',
    uploadButton: 'Änderungen in OSM eintragen',
    uploadBusy: 'Wird hochgeladen…',
    uploadSuccess: 'Änderungen wurden in OSM gespeichert.',
    uploadError: 'Upload fehlgeschlagen.',
    removeTagAria: 'Tag aus Vorschlag entfernen',
    mapAria: 'Karte der betroffenen OSM-Objekte',
    grundschuleSectionTitle: 'Vorschlag aus amtlichen Daten (Grundschule)',
    grundschuleSectionLead:
      'Für diese Schule deuten die offiziellen Daten auf eine Grundschule hin. Du kannst passende OSM-Tags taggen und im Hauptmenü hochladen.',
    /** Shown after the monospace tag in Grundschule action buttons. */
    proposeOsmTagVerb: 'taggen',
    tagAlreadySet: 'Bereits gesetzt',
    /** Tag is in the local upload queue, not yet on OSM. */
    tagStaged: 'Vorgemerkt',
    confirmTagChange: '{key}={from} wird zu {key}={to} geändert. Fortfahren?',
  },

  osmLocate: {
    openAria: 'OSM-Objekt auf der Karte suchen',
    title: 'Bundesland-Karte: OSM-Objekt',
    description:
      'Node-, Weg- oder Relations-ID: z. B. w93504889, way/93504889 oder einen Link von openstreetmap.org.',
    placeholder: 'w93504889 oder URL …',
    submit: 'Karte anzeigen',
    cancel: 'Schließen',
    invalidFormat: 'Die Eingabe konnte nicht als OSM-Objekt gelesen werden.',
    outsideGermany: 'Der Punkt liegt nicht in Deutschland.',
    resolveFailed: 'Die Position konnte nicht geladen werden (Overpass oder Netzwerk).',
    bannerDismiss: 'OK',
  },

  breadcrumb: {
    navLabel: 'Brotkrumen-Navigation',
    home: 'Startseite',
  },
  notFound: {
    badge: 'Seite nicht gefunden',
    title: 'Hier gibt es nichts zu sehen.',
    description:
      'Der aufgerufene Pfad ist im OSM Schulabgleich nicht vorhanden. Gehe zur Startseite, um den aktuellen Datenstand pro Bundesland zu sehen.',
    homeCta: 'Zur Startseite',
  },

  home: {
    heading: 'OpenStreetMap und offizielle Schuldaten',
    leadIntro: 'Diese Anwendung vergleicht pro Bundesland die öffentlichen Schuldaten von ',
    leadBetween: ' mit OSM-Daten (',
    leadOutro: '). Das Ziel ist eine bessere Datenqualität.',
    githubCodeLinkLabel: 'Code auf GitHub',
    githubIssuesLinkLabel: 'Feedback bitte als GitHub-Issues beitragen',
    links: {
      jedeschule: {
        href: 'https://jedeschule.codefor.de/ueber/',
        label: 'jedeschule.codefor.de',
      },
      osmSchoolTag: {
        href: 'https://wiki.openstreetmap.org/wiki/DE:Tag:amenity%3Dschool',
        label: 'amenity=school',
      },
    },
    loading: 'Lade Zusammenfassung…',
    error: 'Zusammenfassung konnte nicht geladen werden.',
    empty: 'Noch keine Daten…',
    toState: 'Zum Bundesland',
    globalKpiAria: 'Deutschland — Kennzahlen (Summe aller Bundesländer)',
    historyHeading: 'Deutschland — Entwicklung über Pipeline-Läufe',
    historyLead:
      'Gestapeltes Flächendiagramm: Summe aller Bundesländer je Kalendertag (nur vollständige bundesweite Abgleiche). Fünf Kennzahlen inkl. amtlicher Schulen ohne Koordinaten.',
    historyEmpty:
      'Noch kein vollständiger Lauf mit Kategorien in der Statusdatei. Nach einem bundesweiten Abgleich erscheint hier ein Verlaufsdiagramm.',
    historyLoading: 'Lade Verlauf…',
    historyError: 'Verlauf konnte nicht geladen werden.',
    officialSources: {
      heading: 'Quellen und Lizenzen der amtlichen Schuldaten',
      lead: 'Die App nutzt die aggregierten Daten von jedeschule.codefor.de, wo amtliche Ursprungsquellen aggregiert und aufbereitet werden. Bitte helft mit und ergänze die Tabelle mit den aktuellen Lizenzen.',
      disclaimer:
        'Die Tabelle wird in Github gepflegt. Du kannst einen Issue erstellen oder die Tabelle direkt auf GitHub bearbeiten.',
      ctaIssue: 'Lizenz recherchieren (GitHub-Issue)',
      ctaEditFile: 'Tabelle auf GitHub bearbeiten',
      colState: 'Bundesland',
      colOfficialLicense: 'Amtliche Lizenz',
      colOsmCompatible: 'OSM-kompatibel',
      colChecked: 'Zuletzt geprüft',
      unknownLicense: 'Unbekannt',
      sourceLinkLabel: 'Datenquelle (API)',
      osmCompatibleLabel: {
        unknown: 'Unbekannt',
        no: 'Nein',
        yes_licence: 'Ja (Lizenz oder Freigabe)',
        yes_waiver: 'Ja (Lizenz oder Freigabe)',
      },
      osmCompatibilityRefLink: 'Nachweis (OSM-Wiki, PDF)',
      officialSourceRefLink: 'Referenz',
      osmCompatLegendHeading: 'Legende zur OSM-Kompatibilität',
      osmCompatLegendText: {
        unknown:
          'Die Nutzbarkeit der amtlichen Daten für OpenStreetMap ist ungeklärt. Die amtlichen Daten dürfen daher nur als Basis für eine **eigene Recherche** genutzt werden.',
        no: 'Für diese amtliche Quelle besteht keine Freigabe zur Nutzung in OSM. Die amtlichen Daten dürfen daher nur als Basis für eine **eigene Recherche** genutzt werden.',
        yesLicenceOrWaiver: 'Diese Daten dürfen in OSM übernommen werden.',
      },
    },
  },
  state: {
    /** Bundesland-Übersicht — ein Kopfzeilentext statt getrenntem Titel und Code. */
    overviewTitle: 'Schulabgleich in {name} ({stateKey})',
    back: 'Alle Bundesländer',
    loading: 'Lade Daten…',
    error: 'Fehler beim Laden der Bundesland-Daten.',
    table: 'Trefferliste',
    category: 'Kategorie',
    name: 'Name',
    distance: 'Entfernung (m)',
    detail: 'Details',
    tableDistanceAway: '{meters} m entfernt',
    legendRowAria: 'Kategorien — Legende und Kartenfilter',
    mapNoVisibleCategories:
      'Keine Kategorie ausgewählt. Aktiviere mindestens eine Kategorie in der Legende oben.',
    tableFilteredEmpty: 'Keine Treffer für die gewählten Kategorien.',
    tableBboxEmpty: 'Keine Treffer im gewählten Kartenausschnitt.',
    tableExplorerEmpty: 'Keine Treffer für die aktuelle Suche und die gewählten Filter.',
    explorer: {
      summary: 'Suche & Filter',
      summaryCounts: '{filtered} von {total} im Ausschnitt',
      queryLabel: 'Volltext (Namen)',
      queryPlaceholder: 'z. B. Grundschule, Ortsteil …',
      nameScopeLabel: 'Namen durchsuchen in',
      nameScopeBoth: 'Amtlich und OSM',
      nameScopeOfficial: 'Nur amtliche Namen',
      nameScopeOsm: 'Nur OSM-Namen',
      matchModeHeading: 'Abgleichmodus',
      matchModeNone: 'Kein Modus (nicht zugeordnet)',
      iscedHeading: 'OSM-Tag isced:level',
      iscedYes: 'Vorhanden',
      iscedNo: 'Nicht vorhanden',
      geoBoundaryHeading: 'Amtliche Geoposition (Bundesland)',
      geoBoundaryYes: 'Außerhalb — als ohne Koordinaten behandelt',
      geoBoundaryNo: 'Kein Rand-Hinweis',
      schoolKindHeading: 'Schulart (OSM school / school:de)',
      schoolKindNone: 'Keine Schulart ermittelbar',
      reset: 'Zurücksetzen',
      openHint: 'Filter wirken auf Kennzahlen, Karte und Trefferliste.',
    },
    mapFilterListButton: 'Liste auf Gebiet filtern',
    mapFilterClear: 'Filter löschen',
    mapBboxToolbarAria: 'Kartenausschnitt und Trefferliste',
    categoryLabel: {
      matched: 'In beiden Daten',
      official_only: 'Nur in offiziellen Daten',
      osm_only: 'Nur in OSM',
      match_ambiguous: 'Uneindeutig',
      official_no_coord: 'Amtlich ohne Koordinaten',
    },
    /** Kurzlabel / KPI — gleicher Text wie `categoryLabel.official_no_coord`. */
    officialNoCoordKpi: 'Amtlich ohne Koordinaten',
    officialNoCoordKpiInfoButton: 'Info zu amtlich ohne Koordinaten',
    officialNoCoordKpiInfoAlert:
      'Dies sind amtliche Schulen ohne Geokoordinaten, die auch nach Distanz- und Namensabgleich keiner OSM-Schule eindeutig zugeordnet wurden.',
    osmCachedBanner:
      'Hinweis: OSM-Daten stammen von einem früheren Lauf (Overpass war nicht erreichbar). Datenstand siehe unten.',
    historyHeading: 'Entwicklung der Treffer über Zeit',
    historyLead:
      'Gestapeltes Flächendiagramm je Kalendertag (Ende des Laufs, Europe/Berlin). Fünf Kennzahlen wie in der Legende inkl. amtlicher Schulen ohne Koordinaten.',
    historyEmpty:
      'Noch keine gespeicherten Läufe mit Kategorien für dieses Bundesland. Nach einem bundesweiten Abgleich erscheint hier der Verlauf.',
    historyLoading: 'Lade Verlauf…',
    historyError: 'Verlauf konnte nicht geladen werden.',
  },
  detail: {
    notFound: 'Eintrag nicht gefunden.',
    official: 'Offizielle Daten',
    osm: 'OpenStreetMap',
    keysBoth: 'Gemeinsame Attribute',
    officialOnly: 'Nur in offiziellen Daten',
    osmOnly: 'Nur in OSM',
    /** Landmark für Tastatur-/Screenreader-Sprünge zu den „nur in einer Quelle“-Tabellen. */
    compareExclusiveSectionsNavAria: 'Sprünge zu Attributen nur in einer Quelle',
    editId: 'In iD bearbeiten',
    editJosm: 'In JOSM laden',
    jedeschuleApi: 'Auf JedeSchule öffnen (JSON)',
    openOsmBrowse: 'Auf OSM öffnen',
    licenceCompatibleLinkLabel: 'Datenlizenz: OSM-kompatibel',
    licenceUnknownLinkSentence: 'Die Lizenz der amtlichen Daten ist unbekannt.',
    licenceNoLinkBeforeBold: 'Für diese Daten besteht ',
    licenceNoLinkBoldKeine: 'keine',
    licenceNoLinkAfterBold: ' Freigabe zur Nutzung in OSM.',
    licenceResearchOnlyDisclaimer:
      'Dieser Abgleich darf daher nur als Basis für eine eigene Recherche genutzt werden.',
    abstand: 'Abstand',
    officialCoordsMissing: 'Koordinaten fehlen',
    officialCoordsOutsideBoundaryTitle: 'Amtliche Geoposition außerhalb des Bundeslandes',
    officialCoordsOutsideBoundaryBody:
      'Die Geoposition dieser Schule in den amtlichen Daten wirkte fehlerhaft — sie lag außerhalb der Grenze von {state}. Wir behandeln diese Schule daher wie eine ohne verwertbare Geodaten.',
    officialCoordsOutsideBoundaryCoordsIntro: 'Ursprüngliche amtliche Koordinaten:',
    officialCoordsOutsideBoundaryOsmPinLinkLabel: 'Auf OpenStreetMap mit Stecknadel',
    ambiguousAlertTitle: 'Uneindeutig',
    ambiguousIntro:
      'Mehrere amtliche Schuldatensätze kommen als Treffer für dieses OSM-Objekt infrage. Prüfe und korrigiere bei Bedarf die Daten in OSM.',
    ambiguousNameNoGeoAlertTitle: 'Uneindeutig (Namensabgleich ohne Koordinaten)',
    ambiguousNameNoGeoAlertText:
      'Diese Uneindeutigkeit kommt aus einem reinen Namensabgleich mit amtlichen Datensätzen ohne Koordinaten. Nutze die Kandidatenliste unten und passe bei Bedarf nur OSM-Attribute an.',
    officialNoCoordDetailLead:
      'Amtlicher Datensatz ohne verwertbare Koordinaten, ohne eindeutige OSM-Zuordnung per Distanz oder Namensabgleich.',
    ambiguousNoLocalGeoTitle: 'Hinweis zur Karte',
    ambiguousNoLocalGeoText:
      'Bei mindestens einem Kandidaten fehlen nutzbare Koordinaten, daher erscheint nicht jeder Kandidat als Punkt auf der Karte. Vergleiche die Felder in der Tabelle und entscheide anhand der OSM-Daten, welche Tags angepasst werden sollen.',
    ambiguousOfficialHeading: 'Amtliche Kandidaten',
    ambiguousJedeschule: 'JedeSchule',
    mapLegendOfficial: 'Offizielle Schule (Übereinstimmung/Kandidaten)',
    mapLegendOsmReference: 'Referenz Schule (OSM)',
    mapHoverLabelOsmOtherMatched: 'Andere Schule OSM mit Übereinstimmung',
    mapHoverLabelOsmOtherAmbiguous: 'Andere Schule OSM mit Kandidaten',
    mapHoverLabelOsmOtherOther: 'Andere Schule OSM',
    mapMask: 'Maskierung',
    matchExplanationDistance:
      'Zuordnung über Distanz: ein einziger amtlicher Schuldatensatz lag im Vergleichsradius um den OSM-Schwerpunkt.',
    matchExplanationDistanceAndName:
      'Zuordnung über Distanz und Namensgleichheit (normalisierter Vergleichsstring, siehe Pipeline):',
    matchExplanationName:
      'Zuordnung nur über Namensgleichheit (amtlicher Datensatz ohne Koordinaten, normalisierter Vergleichsstring):',
    matchExplanationWebsite:
      'Zuordnung nur über Website-Gleichheit (amtlicher Datensatz ohne Koordinaten, normalisierte URL):',
    matchExplanationAddress:
      'Zuordnung nur über Adress-Gleichheit (amtlicher Datensatz ohne Koordinaten, normalisierte Adresse):',
    matchExplanationRef:
      'Zuordnung über OSM-Tag `ref` und amtliche Schul-ID (Suffix nach Bundesland-Präfix, z. B. `BE-07K12` ↔ `ref=07K12`):',
    matchModeLabel: {
      distance: 'Distanz',
      distance_and_name: 'Distanz + Name',
      name: 'Name',
      website: 'Website',
      address: 'Adresse',
      ref: 'Referenz (ref)',
    },
    matchMatchedByOsmTag: {
      name: 'Abgleich über das OSM-Tag `name`.',
      'name:de': 'Abgleich über das OSM-Tag `name:de`.',
      official_name: 'Abgleich über das OSM-Tag `official_name`.',
    },
    jedeschuleDuplicateGroupNote:
      'Hinweis: In den aggregierten JedeSchule-Daten gab es {count} sehr ähnliche Einträge (gleicher Ort und gleiche Kernangaben). Für Karte und Abgleich nutzen wir einen Datensatz mit dem jüngsten Stand (`update_timestamp`).',
  },
  status: {
    heading: 'Pipeline-Status',
    runHistoryHeading: 'Letzte Läufe',
    nationalMetaHeading: 'Bundesweite Download-Metadaten',
    nationalMetaLead:
      'Aktueller Stand der Dateien schools_official_de.meta.json und schools_osm_de.meta.json (unabhängig vom letzten Lauf in der Liste).',
    loading: 'Lade Status…',
    error: 'Statusdatei nicht verfügbar.',
    nationalMetaError: 'Meta-Dateien konnten nicht geladen werden.',
    nationalMetaMissing: 'Keine Meta-Datei (noch kein Download).',
    sourceJedeschule: 'JedeSchule (offiziell)',
    sourceOsmDe: 'OSM Deutschland',
    refreshedAt: 'Stand',
    jedeschuleHttpLastModified: 'HTTP Last-Modified (Quelle)',
    jedeschuleCsvMaxUpdate: 'Max. update_timestamp (CSV-Zeilen)',
    jedeschuleUpstreamChanged: 'Neuer Datenstand ggü. letztem Lauf',
    jedeschuleUpstreamSame: 'Unverändert ggü. letztem Lauf',
    started: 'Start',
    finished: 'Ende',
    duration: 'Dauer',
    okBadgeOk: 'OK',
    okBadgeFail: 'Nicht OK',
    downloadOk: 'Download OK',
    downloadFail: 'Download fehlgeschlagen',
    errors: 'Fehler',
    states: 'Bundesländer',
    runDownloads: 'Downloads im Lauf',
    matchRan: 'Abgleich ausgeführt',
    matchSkipped: 'Abgleich übersprungen',
    matchNotRunMissingInputs: 'Abgleich nicht gelaufen (fehlende oder ungültige Eingaben).',
  },
  footer: {
    geoDataLine: 'Dieser Vergleich ist möglich dank der offenen Geodaten von ',
    geoDataBetween: ' und ',
    openSourceComponentsLine: 'Diese App basiert auf tollen Open-Source-Komponenten: ',
    osmLinkLabel: 'OpenStreetMap Mitwirkende',
    osmLinkHref: 'https://www.openstreetmap.org/copyright',
    githubLabel: 'Quellcode auf GitHub',
    githubHref: 'https://github.com/osmberlin/osm-schul-abgleich',
    /** OpenFreeMap first; OSM / JedeSchule only on geo line above. */
    openSourceThanks: [
      {
        name: 'OpenFreeMap / OpenMapTiles',
        href: 'https://openfreemap.org/',
      },
      { name: 'MapLibre GL', href: 'https://maplibre.org/' },
      { name: 'react-map-gl', href: 'https://vis.gl/react-map-gl' },
      { name: 'Tailwind CSS', href: 'https://tailwindcss.com/' },
      { name: 'TanStack Router', href: 'https://tanstack.com/router' },
      { name: 'TanStack Query', href: 'https://tanstack.com/query' },
      { name: 'Vite', href: 'https://vite.dev/' },
      { name: 'Turf.js', href: 'https://turfjs.org/' },
      { name: 'Zod', href: 'https://zod.dev/' },
      { name: 'Heroicons', href: 'https://heroicons.com/' },
      { name: 'Fontsource (Inter)', href: 'https://fontsource.org/fonts/inter' },
      { name: 'osm-api', href: 'https://www.npmjs.com/package/osm-api' },
      { name: 'Zustand', href: 'https://zustand-demo.pmnd.rs/' },
    ],
  },
} as const

export function formatOsmTagChangeConfirm(key: string, from: string, to: string): string {
  return de.osm.confirmTagChange
    .replaceAll('{key}', key)
    .replaceAll('{from}', from)
    .replaceAll('{to}', to)
}

/** Tooltip / aria-label for the header link to `/aenderungen` (object count). */
export function formatOsmReviewPendingObjectTooltip(objectCount: number): string {
  if (objectCount === 1) {
    return `${formatDeInteger(objectCount)} Objekt mit vorgemerkten Tag-Änderungen`
  }
  return `${formatDeInteger(objectCount)} Objekte mit vorgemerkten Tag-Änderungen`
}
