import { formatDeInteger } from '../lib/formatNumber'

export const de = {
  appTitle: 'OSM Schulabgleich',
  navHome: 'Start',
  navStatus: 'Pipeline-Status',
  navChangelog: 'Changelog',

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
    gymnasiumSectionTitle: 'Vorschlag aus amtlichen Daten (Gymnasium)',
    gymnasiumSectionLead:
      'Für diese Schule deuten die offiziellen Daten auf ein Gymnasium hin. Du kannst passende OSM-Tags taggen und im Hauptmenü hochladen.',
    gesamtschuleSectionTitle: 'Vorschlag aus amtlichen Daten (Gesamtschule)',
    gesamtschuleSectionLead:
      'Für diese Schule deuten die offiziellen Daten auf eine Gesamtschule hin. Du kannst passende OSM-Tags taggen und im Hauptmenü hochladen.',
    hauptRealSectionTitle: 'Vorschlag aus amtlichen Daten (Hauptschule/Realschule)',
    hauptRealSectionLead:
      'Für diese Schule deuten die offiziellen Daten auf eine Hauptschule oder Realschule hin. Du kannst passende OSM-Tags taggen und im Hauptmenü hochladen.',
    oeffentlicheTraegerschaftSectionTitle:
      'Vorschlag aus amtlichen Daten (in öffentlicher Trägerschaft)',
    oeffentlicheTraegerschaftSectionLead:
      'Für diese Schule deuten die offiziellen Daten auf öffentliche Trägerschaft hin. Du kannst passende Betreiber-Tags taggen und im Hauptmenü hochladen.',
    refSectionTitle: 'Vorschlag aus amtlichen Daten (ref)',
    refSectionLead:
      'Für diese Schule ist eine amtliche Kennung verfügbar, die als OSM-Tag `ref=*` geeignet sein kann.',
    schoolTagWikiLead: 'Bitte informiere dich auf den Wiki-Seiten:',
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
    changelogLinkLabel: 'Changelog',
    links: {
      jedeschule: {
        href: 'https://jedeschule.codefor.de/ueber/',
        label: 'jedeschule.codefor.de',
      },
      /** OSM-Tags im Einleitungssatz: Kommas und „und“ werden in `HomeHeader` gesetzt. */
      osmSchoolTags: [
        {
          href: 'https://wiki.openstreetmap.org/wiki/DE:Tag:amenity%3Dschool',
          label: 'amenity=school',
        },
        {
          href: 'https://wiki.openstreetmap.org/wiki/Tag:education%3Dschool',
          label: 'education=school',
        },
        {
          href: 'https://wiki.openstreetmap.org/wiki/DE:Tag:amenity%3Dcollege',
          label: 'amenity=college',
        },
        {
          href: 'https://wiki.openstreetmap.org/wiki/Tag:education%3Dcollege',
          label: 'education=college',
        },
      ] as const,
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
      licenseSourceLinkLabel: 'Lizenzquelle',
      sourceLinkLabel: 'Datenquelle (API)',
      osmCompatibleLabel: {
        unknown: 'Unbekannt',
        no: 'Nein',
        yes_licence: 'Ja (Lizenz oder Freigabe)',
        yes_waiver: 'Ja (Lizenz oder Freigabe)',
      },
      osmCompatibilityRefLink: 'Nachweis (OSM-Wiki, PDF)',
      officialSourceRefLink: 'Referenz',
      explicitModelHeading: 'Explizites Lizenzmodell je Datensatz',
      explicitModelLead:
        'Jeder Datensatz hat eine explizite Lizenzangabe (Kurzname + Quelle), eine OSM-Kompatibilitaetseinschaetzung (mit Nachweis) und optional einen Kommentar.',
      osmCompatLegendHeading: 'Legende zur OSM-Kompatibilität',
      osmCompatLegendText: {
        unknown:
          'Die Nutzbarkeit der amtlichen Daten für OpenStreetMap ist ungeklärt. Die amtlichen Daten dürfen daher nur als Basis für eine **eigene Recherche** genutzt werden.',
        no: 'Für diese amtliche Quelle besteht keine Freigabe zur Nutzung in OSM. Die amtlichen Daten dürfen daher nur als Basis für eine **eigene Recherche** genutzt werden.',
        yesLicenceOrWaiver: 'Diese Daten dürfen in OSM übernommen werden.',
      },
    },
  },
  changelog: {
    heading: 'Changelog',
    loading: 'Lade Changelog…',
    error: 'Changelog konnte nicht geladen werden.',
    empty: 'Noch keine Changelog-Einträge.',
  },
  licenceSection: {
    heading: 'Datenlizenz und Herkunft ({state})',
    datasetLicenseLabel: 'Originale Lizenz (Kurzname)',
    osmCompatibilityLabel: 'OSM-kompatibel',
    datasetSourceLabel: 'Datensatzquelle',
    datasetSourcePrimary: 'Datenquelle (API/Portal)',
    datasetSourceReference: 'Referenz',
    sourceEvidence: 'Nachweis',
    unknown: 'Unbekannt',
    osmCompatibleLabel: {
      unknown: 'Unbekannt',
      no: 'Nein',
      yes_licence: 'Ja (Lizenz oder Freigabe)',
      yes_waiver: 'Ja (Lizenz oder Freigabe)',
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
    showListButton: 'Liste anzeigen',
    showSearchButton: 'Suche anzeigen',
    loadingListSearch: 'Lade Liste und Suche…',
    explorer: {
      summary: 'Suche & Filter',
      summaryCountsInBbox: '{filtered} von {total} im Ausschnitt',
      summaryCountsTotal: '{filtered} von {total} gesamt',
      queryLabel: 'Volltext (Namen)',
      queryPlaceholder: 'z. B. Grundschule, Ortsteil …',
      nameScopeLabel: 'Suche anwenden auf…',
      nameScopeBoth: 'Amtlich und OSM',
      nameScopeOfficial: 'Nur amtliche Namen',
      nameScopeOsm: 'Nur OSM-Namen',
      matchModeHeading: 'Abgleichmodus',
      matchModeNone: 'Kein Modus (nicht zugeordnet)',
      iscedHeading: 'OSM-Tag isced:level',
      iscedAll: 'Alle',
      iscedYes: 'Vorhanden',
      iscedNo: 'Nicht vorhanden',
      geoBoundaryHeading: 'Amtliche Geoposition (Bundesland)',
      geoBoundaryYes: 'Außerhalb — als ohne Koordinaten behandelt',
      geoBoundaryNo: 'Kein Rand-Hinweis',
      schoolKindHeading: 'Schulart (OSM school / school:de)',
      schoolKindNone: 'Keine Schulart ermittelbar',
      osmAmenityHeading: 'OSM-Objekt (Schule / Berufsschule)',
      osmAmenitySchool: 'Schule (amenity=school oder education=school)',
      osmAmenityCollege: 'Berufliche Einrichtung (amenity=college oder education=college)',
      osmAmenityNone: 'Kein OSM-Objekt / sonstiges',
      schoolFormHeading: 'Schulform-Kombination',
      schoolFormFamilyGrundschule: 'Grundschulen',
      schoolFormFamilyWeiterfuehrend: 'Weiterfuehrende Schulen',
      schoolFormFamilyFilterLabel: 'Diese Gruppe einbeziehen',
      schoolFormFamilyFilterLabelGrundschule: 'Nur Grundschulen anzeigen',
      schoolFormFamilyFilterLabelWeiterfuehrend: 'Nur weiterführende Schulen anzeigen',
      schoolFormComboMissingOsm: 'Fehlt in OSM / kann nachgetragen werden',
      schoolFormComboOnlyOsm: 'Nur in OSM / ggf. Quelle oder OSM pruefen',
      schoolFormComboMatchingTags: 'Passende Tags / kann trotzdem geprueft werden',
      schoolFormComboMatchingButLackingTags:
        'Matching, aber Tags unvollstaendig / sollte geprueft werden',
      schoolFormComboMissingOsmGrundschule:
        'Grundschulen mit fehlenden Schulform-Tags in OSM – ggf. nachtragen',
      schoolFormComboOnlyOsmGrundschule:
        'OSM-Schulform-Tags ohne amtliche Grundschul-Entsprechung – prüfen',
      schoolFormComboMatchingTagsGrundschule: 'Abgleich erfolgt, Tags vorhanden – OK',
      schoolFormComboMatchingButLackingTagsGrundschule:
        'Abgleich erfolgt, aber Tags sind unvollständig – Tags präzisieren (`school` oder `isced:level`)',
      schoolFormComboMissingOsmWeiterfuehrend:
        'Weiterführende Schulen mit fehlenden Schulform-Tags in OSM – ggf. nachtragen',
      schoolFormComboOnlyOsmWeiterfuehrend:
        'OSM-Schulform-Tags ohne amtliche Entsprechung bei weiterführenden Schulen – prüfen',
      schoolFormComboMatchingTagsWeiterfuehrend: 'Abgleich erfolgt, Tags vorhanden – OK',
      schoolFormComboMatchingButLackingTagsWeiterfuehrend:
        'Abgleich erfolgt, aber Tags sind unvollständig – Tags präzisieren (`school` oder `isced:level`)',
      refHeading: 'OSM-Tag ref',
      refMissingPossible: 'Fehlt in OSM, aber aus amtlicher ID ableitbar (nur nutzbare IDs)',
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
    keysDifferent: 'Unterschiedliche Werte',
    officialOnly: 'Nur in offiziellen Daten',
    osmOnly: 'Nur in OSM',
    technicalAttributes: 'Technische Attribute',
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
    mapLegendSelectedSchool: 'Ausgewählte Schule',
    mapLegendOsmSchoolArea: 'Fläche Schule OSM',
    /** Detailkarte: roter Ring = Nachbar mit fehlenden oder unvollständigen OSM-Tags (noch ergänzbar). */
    mapLegendOsmTagAttentionRing: 'Ring: OSM-Tags unvollständig',
    /** Weitere Schulen: gleiche Farben/Semantik wie `state.categoryLabel`, mit „Schule …“ für die Detail-Legende. */
    mapLegendOtherSchool: {
      matched: 'Schule in beiden Daten',
      official_only: 'Schule nur in offiziellen Daten',
      osm_only: 'Schule nur in OSM',
      match_ambiguous: 'Schule uneindeutig',
      official_no_coord: 'Schule amtlich ohne Koordinaten',
    },
    mapMask: 'Maskierung',
    /** `{distance}` z. B. `36 m` */
    matchExplanationDistance:
      'Zuordnung über Distanz ({distance}) – ein einzelner amtlicher Schuldatensatz lag im Vergleichsradius.',
    matchExplanationDistanceAndName:
      'Zuordnung über Distanz und Namensgleichheit (normalisierter Vergleichsstring, siehe Pipeline):',
    matchExplanationDistanceAndNamePrefix:
      'Zuordnung über Distanz und Namenspräfix (amtlicher Name setzt den OSM-Namen fort; normalisierter Vergleichsstring, siehe Pipeline):',
    matchExplanationName:
      'Zuordnung nur über Namensgleichheit (nach Distanzabgleich ohne eindeutigen Treffer im Bundesland, normalisierter Vergleichsstring):',
    matchExplanationNamePrefix:
      'Zuordnung nur über Namenspräfix (amtlicher Fachschul-Datensatz ohne Koordinaten, normalisierter Vergleichsstring inkl. Abkürzungen):',
    matchExplanationWebsite:
      'Zuordnung nur über Website-Gleichheit (amtlicher Datensatz ohne Koordinaten, normalisierte URL):',
    matchExplanationAddress:
      'Zuordnung nur über Adress-Gleichheit (amtlicher Datensatz ohne Koordinaten, normalisierte Adresse):',
    matchExplanationRef: 'Zuordnung über OSM-Tag `ref` und amtliche Schul-ID:',
    matchModeLabel: {
      distance: 'Distanz',
      distance_and_name: 'Distanz + Name',
      distance_and_name_prefix: 'Distanz + Namenspräfix',
      name: 'Name',
      name_prefix: 'Namenspräfix',
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
    githubActionsLink: 'GitHub Actions…',
    kpiHeading: 'Aktueller Stand',
    kpiLead:
      'Diese drei Zeitpunkte zeigen den Datenstand der aktuell ausgelieferten Seite: OSM-Daten, amtliche JedeSchule-Daten und Zeitpunkt der letzten Auswertung.',
    kpiError: 'KPI-Daten konnten nicht geladen werden.',
    kpiOsmDataDate: 'OSM-Datenstand',
    kpiOsmDataDateHint: 'Zeitpunkt der Overpass-Antwort, die für den Vergleich verwendet wurde.',
    kpiJedeschuleDataDate: 'Amtliche Daten',
    kpiJedeschuleDataDateHint: 'Neuster Zeitstempel aus den Daten von JedeSchule.',
    kpiCompareDate: 'Abgleich / Auswertung',
    kpiCompareDateHint:
      'Zeitpunkt, an dem der aktuell sichtbare Datenvergleich zuletzt neu berechnet wurde.',
    kpiMatchSkippedHint:
      'Hinweis: Der zuletzt protokollierte Lauf hat den Abgleich übersprungen. Die Auswertung stammt daher vom letzten erfolgreichen Lauf davor.',
    runHistoryHeading: 'Letzte Läufe',
    technicalHeading: 'Zusätzliche technische Zeitstempel',
    technicalLead:
      'Diese Angaben sind für Debugging und Einordnung gedacht. Jeder Wert erklärt, was er für den Pipeline-Ablauf aussagt.',
    loading: 'Lade Status…',
    error: 'Statusdatei nicht verfügbar.',
    nationalMetaError: 'Meta-Dateien konnten nicht geladen werden.',
    nationalMetaMissing: 'Keine Meta-Datei (noch kein Download).',
    timestampMissing: 'Kein Zeitstempel verfügbar',
    sourceJedeschule: 'JedeSchule (amtlich)',
    sourceOsmDe: 'OSM Deutschland',
    technicalOfficialLead:
      'Diese Werte helfen zu verstehen, wie aktuell die amtliche Quelle ist und ob beim letzten Abruf wirklich neue Inhalte vorhanden waren.',
    technicalOsmLead:
      'Diese Werte zeigen, wann der OSM-Datensatz vom Overpass-Endpunkt stammt und wann die lokale Meta-Datei erzeugt wurde.',
    technicalGeneratedAtMeaning:
      'Dieser Zeitpunkt zeigt, wann die lokale Meta-Datei im Pipeline-Lauf geschrieben wurde.',
    technicalCsvMaxUpdateMeaning:
      'Dieser Zeitpunkt kommt aus den CSV-Zeilen selbst und zeigt den jüngsten fachlichen Datenstand der Quelle.',
    technicalHttpLastModifiedMeaning:
      'Dieser HTTP-Header stammt vom Server der Quelle und hilft einzuordnen, ob dort seit dem letzten Abruf etwas verändert wurde.',
    technicalUpstreamChangeMeaning:
      'Vergleich mit dem letzten Lauf: So lässt sich erkennen, ob die Quelle inhaltlich wirklich einen neuen Stand geliefert hat.',
    technicalOsmSnapshotMeaning:
      'Dieser Zeitpunkt stammt aus der Overpass-Antwort und beschreibt den OSM-Snapshot, auf dem der Vergleich basiert.',
    technicalErrorMeaning:
      'Fehlermeldung des Abrufschritts. Hilft bei der Ursachenanalyse im Pipeline-Lauf.',
    osmSnapshotAt: 'OSM Snapshot-Zeitpunkt',
    lastPullAt: 'Letzter erfolgreicher Datenabruf',
    sourceModeFresh: 'Frisch geladen',
    sourceModeReused: 'Vorheriger Stand wiederverwendet',
    sourceModeFailed: 'Abruf fehlgeschlagen',
    sourceModeReasonScheduledNonFriday:
      'Wöchentliche Amtlich-Aktualisierung erfolgt am Freitag; heute wird der vorige Stand genutzt.',
    sourceModeReasonManualReuse: 'Manueller Lauf ohne neuen Amtlich-Abruf.',
    sourceModeReasonOverpassFetchFailed:
      'Overpass-Abruf fehlgeschlagen; letzter verfügbarer OSM-Snapshot wird weiterverwendet.',
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
    runCardHeading: 'Lauf',
    runSectionWhen: 'Wann',
    runSectionDownloads: 'Datenabruf',
    runSectionCompare: 'Abgleich',
    runSectionContext: 'Kontext',
    runDownloadsMissing: 'Keine Download-Information in diesem Lauf protokolliert.',
    runsDroppedWarning:
      '{count} ältere oder ungültige Einträge konnten nicht gelesen werden und werden ausgeblendet.',
    runsDroppedDiagnostics:
      'Nicht lesbar: {parseErrors} JSONL-Zeilen, {schemaMismatches} Einträge mit ungültigem Schema.',
    statesCount: '{count} Bundesländer erfasst',
    runDetailsSummary: 'Details',
    errorPayloadSummary: 'Error payload',
    gitSha: 'Git SHA',
    runContextScheduledWeeklyOfficial:
      'Geplanter Nachtlauf (Freitag, inkl. amtlicher Aktualisierung)',
    runContextScheduledDailyReuse: 'Geplanter Nachtlauf (amtliche Daten wiederverwendet)',
    runContextScheduledBootstrap:
      'Geplanter Nachtlauf (Bootstrap: amtliche Daten neu geladen, da kein Snapshot vorhanden)',
    runContextScheduledNightly: 'Geplanter Nachtlauf (frische OSM- und Amtlich-Daten)',
    runContextManualFull: 'Manueller Lauf (frische Daten geladen)',
    runContextManualOsmOnly: 'Manueller Lauf (amtliche Daten wiederverwendet)',
    runContextManualNightly: 'Manueller Nachtlauf (frische OSM- und Amtlich-Daten)',
    runContextPushStored:
      'Push-Deploy (nutzt den zuletzt gespeicherten Datensatz und führt die Auswertung darauf erneut aus)',
    runContextUnknown: 'Laufkontext nicht angegeben',
    runContextDefaultHint: 'Standardkontext: geplanter Nachtlauf.',
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
