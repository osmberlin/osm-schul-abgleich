# Lizenzrecherche: Bundesländer mit `officialLicense: unknown`

Stand: 2026-08-08  
Quelle der Tabelle: [`src/lib/bundeslandOfficialSources.ts`](../src/lib/bundeslandOfficialSources.ts)

Dieses Dokument fasst die Recherche zu amtlichen Schuldatenquellen zusammen, für die in der App bisher **keine Lizenz** (`unknown`) hinterlegt ist. Zusätzlich: kurzer Abschnitt, ob „öffentlich verfügbar“ allein eine OSM-Nutzung erlauben würde.

> Keine Rechtsberatung. Angaben sind Recherchestand mit Primärquellen; vor Merge in `bundeslandOfficialSources.ts` einzeln verifizieren.

## Übersicht

| Code | Land                   | Empfohlene `officialLicense`                        | `osmCompatible` (Vorschlag, Primary)                                                               | OSM-Wiki-Freigabe                                                                           |
| ---- | ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| BW   | Baden-Württemberg      | `unknown`                                           | `no`                                                                                               | keine (Schuldaten)                                                                          |
| HB   | Bremen                 | `unknown` (Primary); Alt: `CC-BY`                   | `unknown`                                                                                          | Open Data erwähnt, kein Schul-Waiver                                                        |
| HE   | Hessen                 | `unknown` (Live-DB)                                 | `unknown` (Live); historisch `yes_waiver`                                                          | AFL-Liste 2012 ([DE:Hessen/Schools](https://wiki.openstreetmap.org/wiki/DE:Hessen/Schools)) |
| MV   | Mecklenburg-Vorpommern | `unknown`                                           | `unknown`                                                                                          | keine (Schuldaten; Geobasis-Waiver ≠ Schulverzeichnis)                                      |
| NI   | Niedersachsen          | `unknown`                                           | `unknown`                                                                                          | keine (NiBiS); LGLN-Geodaten ≠ Schulverzeichnis                                             |
| RP   | Rheinland-Pfalz        | `unknown` (Portal restriktiv)                       | `no` (Bildungsserver)                                                                              | PLI-Datenspende [wartend](https://wiki.openstreetmap.org/wiki/DE:Permissions) (2022)        |
| SL   | Saarland               | `CC BY 4.0`                                         | `unknown` (wie BY: CC BY ohne Addendum)                                                            | keine Schul-Freigabe; LVGL-Luftbild-Waiver ≠ Schulen                                        |
| SN   | Sachsen                | `unknown` (Schul-DB); Alt: `DL-DE BY 2.0`           | `unknown` (Portal); Geodaten ggf. via [GeoSN](https://wiki.openstreetmap.org/wiki/GeoSN_Open_Data) | GeoSN Open Data (dl-de/by-2.0) — Abdeckung Verwaltungsatlas klären                          |
| ST   | Sachsen-Anhalt         | Restriktiv (StaLa: Verbreitung untersagt)           | `no`                                                                                               | keine (nur LVermGeo-Geobasis)                                                               |
| TH   | Thüringen              | `DL-DE BY 2.0` (WFS © GDI-Th); kommunale Vorbehalte | `no`                                                                                               | keine (nur Luftbild-Waiver)                                                                 |

Bereits bekannte Lizenzen (nicht Gegenstand dieser Recherche, außer OSM-Wiki-Querverweis): BY (CC BY 4.0, OSM unklar), BE (DL-DE Zero 2.0 + Waiver), BB (DL-DE BY 2.0 + Waiver), HH/NW (DL-DE BY 2.0, `no`), SH (CC0 1.0).

Hinweis: CC-BY allein ist für OSM typischerweise **nicht** `yes_licence` ohne Addendum/Waiver (vgl. BY und Abschnitt „Öffentliches Gut“).

---

## Länderdetails

### BW — Baden-Württemberg

- **Publisher:** Ministerium für Kultus, Jugend und Sport — _Schul- und Dienststellensuche_ (ASD-BW / LOBW)
- **Primary:** https://lobw.kultus-bw.de/didsuche/
- **Lizenz:** Keine Open-Data-Lizenz auf der Suche. KM-Impressum: private Nutzung ohne Änderung; Verbreitung von Kopien nur mit schriftlicher Genehmigung ([Impressum-Beispiel](https://ganztagsschule.kultus-bw.de/,Lde/Startseite/Service/impressum)).
- **Open Data:** [daten.bw](https://www.daten-bw.de/) hat kein landesweites Schulverzeichnis (nur z. B. kommunale Schulstatistik).
- **OSM Wiki:** [Maps4BW](https://wiki.openstreetmap.org/wiki/Maps4BW) / Geodaten — nicht Schulverzeichnis; [DE:Permissions](https://wiki.openstreetmap.org/wiki/DE:Permissions) WMS BW negativ. Keine Schuldaten-Freigabe.
- **Vorschlag:** `officialLicense: unknown`, `osmCompatible: no`
- **Nächste Schritte:** Anfrage Kultusministerium / `sc@schule.bwl.de`

### HB — Bremen

- **Publisher:** Senatorin für Kinder und Bildung — _Schulwegweiser_; parallel Open Data _Schulstandorte Land Bremen_ (IQHB)
- **Primary:** https://www.bildung.bremen.de/detail.php?template=35_schulsuche_stufe2_d — **keine** sichtbare Lizenz
- **Besserer Alt:** [MetaVer Schulstandorte](https://metaver.de/trefferanzeige?docuuid=13FA066D-4E46-4486-83D1-537B09743D95) / [GovData](https://data.gov.de/suche/daten/schulstandorte-land-bremen) — **Creative Commons Namensnennung (CC-BY)**, Quellenvermerk Senatorin für Kinder und Bildung
- **OSM Wiki:** [Bremen/POI](https://wiki.openstreetmap.org/wiki/Bremen/POI), [Bremen Todo](https://wiki.openstreetmap.org/wiki/Bremen_Todo) erwähnen Open Data; kein schulspezifischer Waiver
- **Vorschlag (Primary bleiben):** `officialLicense: unknown`, `osmCompatible: unknown`  
  Bei Umstellung auf MetaVer-Dataset: Lizenz `CC-BY` eintragen, `osmCompatible` zunächst `unknown` (wie BY: Attribution/ODbL — Addendum klären), nicht vorschnell `yes_licence`
- **Nächste Schritte:** CC-Version am Dataset verifizieren; ggf. Primary-URL auf Open-Data-Dataset umstellen + OSM-Addendum anfragen

### HE — Hessen

- **Publisher:** Hessisches Kultusministerium / Lehrkräfteakademie — _Hessische Schul-Datenbank_
- **Primary:** https://schul-db.bildung.hessen.de/schul_db.html — keine CC/DL-DE-Lizenz; Bildungsserver: Verbreitung für Schule/Weiterbildung mit Quellenangabe erwünscht, **kommerzielle Verbreitung ohne Genehmigung untersagt** ([Impressum](https://mauswiesel.bildung.hessen.de/impress.html))
- **Open Data:** z. B. Kreis-Datasets auf opendata.hessen.de (DL-DE-BY-2.0) — kein landesweites Verzeichnis der Live-DB
- **OSM Wiki:** [DE:Hessen/Schools](https://wiki.openstreetmap.org/wiki/DE:Hessen/Schools) — AFL/Schuldatenbank stellte OSM 2012 eine Schulliste per E-Mail bereit (Kontakt Hans Rauch; Mapper Xoff). [DE:Permissions](https://wiki.openstreetmap.org/wiki/DE:Permissions) Eintrag 2012-01-14 Status **„wartend“** (kein formales Addendum/ODbL-Waiver-Dokument). AFL ging 2013 in Landesschulamt/Lehrkräfteakademie auf.
- **Vorschlag:** Primary `officialLicense: unknown`, `osmCompatible: unknown` (Live-Scraping). Die 2012er Listenspende gilt **nicht automatisch** für die Live-Schul-DB (Snapshot ≠ stehende Lizenz; Behörde gewechselt; Site ohne Open-Data-Lizenz; Permissions nie als „positiv“ geschlossen).
- **Nächste Schritte / Anschreiben:** Fortgeltung für aktuelle Schul-DB bestätigen lassen (+ idealerweise CC0/Zero oder BY+Addendum) — Entwurf: [`waiver-emails/HE-hessen.md`](waiver-emails/HE-hessen.md)

### MV — Mecklenburg-Vorpommern

- **Publisher:** Statistisches Amt MV / Bildungsministerium — Schulverzeichnis
- **Primary (Katalog, teils kostenpflichtig):** https://www.laiv-mv.de/Statistik/Ver%C3%B6ffentlichungen/Verzeichnisse/
- **Besserer Download:** „offene Excel-Datei“ auf [regierung-mv.de …/Statistik](https://www.regierung-mv.de/Landesregierung/bm/Ministerium/Statistik/) — **ohne** CC/DL-DE-Text
- **GeoPortal:** Schulstandorte mit © Statistisches Amt, keine Open License
- **OSM / LAIV Geobasis:** OpenData-Geobasisdaten (AfGVK) unter **CC BY 4.0** inkl. OSM-Addendum („Erlaubnis, CC-BY-Daten…“) ausdrücklich nur für den Datensatz _„Die frei zugänglichen Geobasisdaten – die sogenannten OpenData-Geobasisdaten“_ — siehe [Nutzungsbedingungen Downloadportal](https://laiv.geodaten-mv.de/afgvk/Sonstiges/Nutzungsbedingungen) / [LAIV FAQ](https://www.laiv-mv.de/Geoinformation/FAQ/). Das ist Kataster/Vermessung, **nicht** Schulstandorte (Fachdaten Statistik/Bildung; oft © Statistisches Amt). Gleiches Landesamt (LAIV) ≠ gleiche Lizenz pro Produkt.
- **Vorschlag:** `officialLicense: unknown`, `osmCompatible: unknown` für Schul-WFS/XLSX
- **Nächste Schritte / Anschreiben:** Analog zum Geobasis-Waiver für Schulstandorte bestätigen lassen — Entwurf: [`waiver-emails/MV-mecklenburg-vorpommern.md`](waiver-emails/MV-mecklenburg-vorpommern.md)

### NI — Niedersachsen

- **Publisher:** NLQ — NiBiS _Schuldaten Administration_; verwandt: LSN Schulstandorte-Karten
- **Primary:** https://schulen.nibis.de/search/advanced — Impressum/Datenschutz ohne Open-Data-Lizenz
- **Hinweis:** DaNiS-Software: nur schulintern, nicht an Dritte ([Rechtliches](https://danis-hilfe.nibis.de/rechtliches/)) — anderes Produkt als die öffentliche Suche
- **LSN:** Shapefiles/Karten zum Download ([LSN Schulstandorte](https://www.statistik.niedersachsen.de/startseite/datenangebote/georeferenzierte_karten/schulstandorte_in_niedersachsen/)) — auf den geprüften Seiten **keine** dl-de/CC-Angabe
- **OSM Wiki:** [DE:Niedersachsen/Geoportal](https://wiki.openstreetmap.org/wiki/DE:Niedersachsen/Geoportal) = LGLN-Geodaten, nicht NiBiS; keine Permissions-Einträge für Schulverzeichnis
- **Vorschlag:** `officialLicense: unknown`, `osmCompatible: unknown`
- **Nächste Schritte:** NLQ/LSN um Klarstellung bitten; Shapefile-Metadaten prüfen

### RP — Rheinland-Pfalz

- **Publisher:** Bildungsserver RLP / PLI; alternativ Geoportal WFS Schulstandorte
- **Primary:** https://bildung.rlp.de/schulen — [Impressum](https://bildung.rlp.de/ueber-bildungrlpde/impressum): Verbreitung für Schule/Weiterbildung mit Quellenangabe erwünscht; **kommerzielle Verbreitung ohne schriftliche Genehmigung untersagt** → ODbL-Konflikt
- **Geoportal:** WFS/OAF `spatial-objects/350` — Metadaten Nutzungsbedingungen nur „free“, kein dl-de/CC-URI
- **open.rlp.de:** Schulstatistik-Datasets oft „Eingeschränkte Nutzung“, kein Verzeichnis-Open-Data
- **OSM Wiki:** [DE:Permissions](https://wiki.openstreetmap.org/wiki/DE:Permissions) — PLI/Bildungsserver Schul-Datenspende **wartend** (2022-05-14); LVermGeo-Waiver ≠ Schulverzeichnis
- **Vorschlag:** `officialLicense: unknown`, `osmCompatible: no` (Primary); Geoportal separat `unknown`
- **Nächste Schritte:** 2022er Permissions-Anfrage nachfassen; GDKE/BM zu WFS-Lizenz fragen

### SL — Saarland

- **Publisher:** Geoportal Saarland / GDI-SL — Layer _Schulen im Saarland_ (`Schulen_SL`); Quelle laut Metadaten: Bildungsserver / Statistisches Landesamt
- **Primary / WFS:** GetCapabilities `Staatliche_Dienste:Schulen_SL`; Metadaten: https://geoportal.saarland.de/mapbender/php/mod_showMetadata.php?id=36880&layout=tabs&redirectToMetadataUrl=1&resource=layer
- **Lizenz:** **Namensnennung 4.0 International (CC BY 4.0)**, Quellenvermerk `© GDI-SL (Jahr)`; Zugang `noLimitations`
- **OSM Wiki:** [Luftbild Saarland](https://wiki.openstreetmap.org/wiki/DE:Permissions/Luftbild_Saarland) = Orthophotos, nicht Schulen
- **Vorschlag:** `officialLicense: CC BY 4.0`, `osmCompatible: unknown` (CC BY braucht OSM-Addendum — analog BY; nicht vorschnell `yes_licence`)
- **Nächste Schritte:** ggf. `officialSourceRefUrl` auf OAF-Collection; Addendum/Waiver bei GDI-SL anfragen

### SN — Sachsen

- **Publisher:** SMK — _Sächsische Schuldatenbank_; Geodaten: _Verwaltungsatlas Sachsen_ (beruhen auf Schuldatenbank)
- **Primary:** https://schuldatenbank.sachsen.de/index.php?id=30 / API `/api/v1/schools` — **keine** Nutzungsbedingungen für Weiterverwendung (nur Datenschutz)
- **Geodaten:** WMS Bildung und Kultur — **DL-DE BY 2.0**, Quelle „Verwaltungsatlas Sachsen“ ([GetCapabilities](https://geodienste.sachsen.de/wms_smr_bildungkultur/guest?service=wms&request=GetCapabilities)); [GovData](https://www.govdata.de/suche/daten/verwaltungsatlas-schulstandorte111fb)
- **OSM Wiki:** [GeoSN Open Data](https://wiki.openstreetmap.org/wiki/GeoSN_Open_Data) — Nutzung unter DL-DE BY 2.0 mit Contributors-Liste; klären, ob Verwaltungsatlas darunter fällt
- **Vorschlag:** Primary `officialLicense: unknown`, `osmCompatible: unknown`; optional Ref-URL Verwaltungsatlas mit `DL-DE BY 2.0` und OSM erst nach Waiver-Abdeckung als `yes_waiver`/`yes_licence`
- **Nächste Schritte:** SMK fragen, ob API unter denselben Bedingungen wie Verwaltungsatlas steht

### ST — Sachsen-Anhalt

- **Publisher:** Bildungsserver LSA (LISA); Geodaten: **StaLa** Schulstandorte (JedeSchule nutzt ArcGIS FeatureServer)
- **Primary (aktuell in TS):** ajax-URL — besser: [Schulsuche KAT_ID=1277](https://www.bildung-lsa.de/index.php?KAT_ID=1277); StaLa FeatureServer / [Atlas](https://www.stala.sachsen-anhalt.de/grafiken/allgemeinbildende-schulen)
- **Lizenz:** StaLa ArcGIS / MetaVer: _„Vervielfältigung und Verbreitung sind grundsätzlich untersagt.“_ Bildungsserver: kommerzielle Verwendung ohne Genehmigung untersagt
- **OSM Wiki:** nur [Geobasisdaten Sachsen-Anhalt](https://wiki.openstreetmap.org/wiki/DE:Permissions/Geobasisdaten_Sachsen-Anhalt) — keine Schullisten-Freigabe
- **Vorschlag:** `officialLicense` z. B. `proprietary (StaLa: reproduction prohibited)`, `osmCompatible: no`; Primary-URL auf StaLa/Schulsuche umstellen
- **Nächste Schritte:** Freigabe bei StaLa / LISA anfragen ([Getting permission](https://wiki.openstreetmap.org/wiki/DE:Import/Getting_permission))

### TH — Thüringen

- **Publisher:** GDI-Th kommunaler WFS `kommunal:komm_schul` (tatsächliche JedeSchule-Quelle); parallel SIS Schuladressen; Schulportal = UI, kein Verzeichnis-Lieferant
- **Primary (aktuell in TS):** schulportal-thueringen.de — besser: [Geoproxy WFS](https://www.geoproxy.geoportal-th.de/geoproxy/services/kommunal/komm_wfs?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0) + [Metadaten](https://geomis.geoportal-th.de/geonetwork/srv/api/records/17ebc9d7-9571-47d0-ac19-275cdd269c43)
- **Lizenz:** WFS-Dienst **DL-DE BY 2.0**, Quellenvermerk `© GDI-Th`; Datensatz Eigentum der Kommunen („Nutzungsbedingungen der jeweiligen kommunalen Ebene“). SIS: nur privat / nicht kommerziell ohne Zustimmung
- **OSM Wiki:** [Luftbild Thüringen](https://wiki.openstreetmap.org/wiki/DE:Permissions/Luftbild_Th%C3%BCringen) ≠ Schulen; [Potential_Datasources](https://wiki.openstreetmap.org/wiki/DE:Potential_Datasources): dl-de/by Vergleich ja, Übernahme nein
- **Vorschlag:** `officialLicense: DL-DE BY 2.0` (mit Note zu kommunalen Vorbehalten), `osmCompatible: no` bis Waiver; Source-URLs in TS anpassen
- **Nächste Schritte:** Freigabe GDI-Th / TLBG bzw. Kommunen anfragen

---

## OSM-Wiki: Schulverzeichnis-Freigaben (Querschnitt)

`DE:Germany/Data_sources` → 404. Primär: [DE:Permissions](https://wiki.openstreetmap.org/wiki/DE:Permissions), [DE:Potential_Datasources](https://wiki.openstreetmap.org/wiki/DE:Potential_Datasources), [Contributors#Germany](https://wiki.openstreetmap.org/wiki/Contributors#Germany).

| Land / Akteur              | Schulverzeichnis für OSM?                     | Evidenz                                                                                            |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Hessen                     | Historische Listenspende (AFL 2012)           | [DE:Hessen/Schools](https://wiki.openstreetmap.org/wiki/DE:Hessen/Schools); Permissions „wartend“  |
| Berlin                     | Ja (Lizenz + Waiver)                          | dl-de-zero + Waiver-PDF; vgl. App-Tabelle BE                                                       |
| Brandenburg                | Geodaten-Waiver, nicht spezifisch Schullisten | [Brandenburg/Geoportal](https://wiki.openstreetmap.org/wiki/Brandenburg/Geoportal)                 |
| Schleswig-Holstein         | Ja (CC0 Open Data)                            | opendata.schleswig-holstein.de Schulen                                                             |
| Sachsen                    | GeoSN-Geodaten unter dl-de/by; Schulen unklar | [GeoSN Open Data](https://wiki.openstreetmap.org/wiki/GeoSN_Open_Data)                             |
| RLP                        | Anfrage wartend (2022)                        | DE:Permissions PLI/Bildungsserver                                                                  |
| ST / TH / BW / NI / MV / … | Keine dokumentierte Schulverzeichnis-Freigabe | oft nur Geobasis-/Luftbild-Waivers                                                                 |
| BKG                        | Schul-POIs lizenzrechtlich nicht an OSM       | [DE:BKG](https://wiki.openstreetmap.org/wiki/DE:Bundesamt_f%C3%BCr_Kartographie_und_Geod%C3%A4sie) |

Leitlinie: Open-Data-Eintrag oder DL-DE-BY ≠ automatische OSM-Freigabe; bei Unklarheit keine Übernahme in Tag-Fixes/Importe.

---

## CC BY / DL-DE BY: offene Lizenz, aber „BY“ vs. OSM — und was ist das reale Risiko?

### Ausgangspunkt

Viele Landesquellen (z. B. HH, NW, TH, SL, HB MetaVer, BY) sind **bereits unter einer Open-Data-Lizenz** freigegeben: **CC BY** oder **DL-DE BY 2.0**. Das ist keine „proprietary“-Situation wie bei StaLa ST.

Die Nutzung in OSM scheitert hier typischerweise **nicht** daran, dass die Behörde die Daten geheim halten will, sondern an der **Form der Namensnennung (BY)** und — bei CC BY — ggf. am **Verbot zusätzlicher technischer Einschränkungen** gegenüber der ODbL.

Kurz: Die Daten sind **offen und zur Weiterverwendung gedacht**; OSM braucht nur eine Klarstellung, dass Contributors-Seite / Changeset-Kommentar als Quellenvermerk reicht.

### Was die Lizenzen verlangen

**[DL-DE BY 2.0](https://www.govdata.de/dl-de/by-2-0)** erlaubt ausdrücklich kommerzielle und nichtkommerzielle Nutzung, Bearbeitung, Zusammenführung und Weitergabe. Pflicht (Abs. 2): Quellenvermerk mit (soweit vom Bereitsteller angegeben) **Name des Bereitstellers**, Lizenzkürzel/Link, **URI des Datensatzes**; Änderungen kennzeichnen (Abs. 3).

**CC BY 4.0** verlangt ebenfalls Attribution in „angemessener Form“ und enthält Regeln zu Beschränkungen für nachfolgende Empfänger (DRM / „no additional restrictions“), die mit der ODbL-Parallel-Distribution kollidieren können.

### Warum OSM trotzdem ein Addendum will

OpenStreetMap kann **nicht** bei jeder abgeleiteten Karte den Landes-Quellenvermerk mitschleifen. Attribution läuft über:

- [Contributors](https://wiki.openstreetmap.org/wiki/Contributors) und/oder
- Changeset-Kommentar

Das erklärt [OSM DE – Nutzung von Open Data](https://openstreetmap.de/beitragen/recht/nutzung-von-open-data/): BY-Lizenzen sind inhaltlich oft mit OSM-Zielen vereinbar, aber **ohne schriftliche Klarstellung** bleibt die Namensnennung formal unsicher. Die OSMF ([Licence Compatibility](https://osmfoundation.org/wiki/Licence/Licence_Compatibility)) schließt sich dem NRW-Kurzgutachten an: DL-DE BY braucht **special permission** wegen Downstream-Attribution.

**Community-Lösung (Muster):**

- [Lizenzaddendum DL-DE-BY](https://openstreetmap.de/beitragen/recht/addendum-dl-de-by/) — Contributors-Seite reicht als Quellenvermerk i. S. v. § 2 DL-DE BY 2.0
- [Lizenzaddendum CC-BY](https://openstreetmap.de/beitragen/recht/addendum-cc-by/) — Contributors = angemessene Form + Klarstellung zu ODbL/DRM
- Praxisbeispiel Behörde: [BKG-Ergänzungstext](https://sgx.geodatenzentrum.de/web_public/gdz/lizenz/deu/datenlizenz_deutschland_ergaenzungstext_namensnennung.pdf) (OSM-Nutzung ausdrücklich erlaubt, Contributors = Namensnennung)

Ohne Addendum bleibt in der App-Tabelle typischerweise `osmCompatible: no` oder `unknown` — **nicht** weil die Lizenz „zu“ wäre, sondern weil die BY-Form für OSM nicht dokumentiert geklärt ist.

### Was der Schulabgleich / Tag-Fix tatsächlich übernimmt

Kein Vollimport der amtlichen Datenbank. Typisch nur **wenige Attribute** an bereits vorhandenen OSM-Objekten, z. B.:

- Schulform / `school` / `isced:level`
- `ref` (amtliche Kennung)
- ggf. Trägerschaft (`operator:type` / `operator`)

Kein blindes Kopieren ganzer Feature-Geometrien oder des kompletten Schulverzeichnisses als neuer Layer. Das ändert die **praktische** Risikolage, ersetzt aber formal **keine** Lizenzkompatibilität: auch einzelne geschützte Datenbankfelder / Auszüge können unter der BY-Lizenz und ggf. Datenbankrecht stehen; OSM-Contributor-Terms verlangen kompatible Rechte für alles, was in die Datenbank wandert.

### Was könnte schiefgehen? Welches Risiko?

| Ebene                             | Was passieren kann                                                                               | Wie realistisch bei BY + wenigen Tags?                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lizenzvertrag BY**              | Behörde sieht Quellenvermerkspflicht als verletzt (kein Contributors-/URI-Vermerk am Downstream) | Rechtlich der Hauptpunkt ohne Addendum. Politisch oft gering: Ziel der Open-Data-Freigabe ist Weiterverwendung; viele Behörden akzeptieren Contributors-Modell (BKG, GeoSN, BB, …).                                                                                     |
| **OSM-Community / DWG**           | Import oder systematische Tag-Fixes ohne dokumentierte Erlaubnis → Revert, Block, Diskussion     | **Höheres praktisches Risiko** als eine Klage durch das Land — Community-Standards sind strenger als „wird schon niemand klagen“.                                                                                                                                       |
| **Datenbankrecht / Urheberrecht** | Unterlassungsanspruch gegen systematische Übernahme wesentlicher Teile                           | Bei wenigen öffentlichen Fakten (Schulnummer, Schulform) und Open-Data-BY-Freigabe **schwer** zu begründen, dass die Behörde „gegen die Nutzung“ vorgeht — sie hat die Weiterverwendung ja freigegeben. Streitpunkt bleibt eher **Form** der Attribution, nicht das Ob. |
| **DNG / Open-Data-Politik**       | Behörden sollen sich u. a. nicht auf § 87b berufen, um Weiterverwendung zu blockieren            | Spricht eher **gegen** ein aggressives Vorgehen bei BY-Daten; ersetzt aber kein Addendum für OSM.                                                                                                                                                                       |
| **Contributor-Haftung**           | Mapper/App-Betreiber verstößt gegen Contributor Terms / Import-Guidelines                        | Internes OSM-Risiko (Revert, Account), selten zivilrechtliche Durchsetzung durch Länder.                                                                                                                                                                                |

**Worauf könnte sich ein Land stützen, wenn es sich beschweren würde?**

1. **Vertrags-/Lizenzbedingungen der Open-Data-Freigabe** (DL-DE BY § 2 / CC BY Attribution): „Ihr habt unseren vorgeschriebenen Quellenvermerk nicht (in der geforderten Form) weitergegeben.“ — Das ist das naheliegende Argument **ohne** Addendum.
2. **Nicht:** „Diese Daten dürfen überhaupt nicht öffentlich genutzt werden“ — das widerspräche der BY-Freigabe selbst.
3. Bei Quellen **ohne** Open License (Impressum „nur nichtkommerziell“, „Vervielfältigung untersagt“): zusätzlich **Urheber-/Datenbankrecht** und AGB — dort ist das Risiko und die Beschwerdegrundlage klarer (vgl. ST, RP-Impressum).

**Was wahrscheinlich nicht passiert:** Eine Landesbehörde verklagt den Schulabgleich oder einzelne Mapper wegen Übernahme von `ref` + Schulform aus einem **bewusst unter DL-DE BY / CC BY** veröffentlichten Datensatz, solange die Nutzung der Open-Data-Absicht entspricht. Wahrscheinlicher: höfliche Bitte um korrekte Namensnennung, oder OSM-interne Reverts wegen fehlender Permissions-Dokumentation.

### Einordnung für dieses Projekt

- **CC0 / DL-DE Zero / dokumentiertes Addendum** → `yes_licence` / `yes_waiver`, Tag-Fixes ok.
- **CC BY / DL-DE BY ohne Addendum** → Lizenz ist **offen**, OSM-Kompatibilität aber **formell ungeklärt** → in der Tabelle `no` oder `unknown`, MapRoulette-Gate zu; parallel Addendum anfragen (OSM-DE-Muster).
- **„Nur wenige Tags“** senkt das **politische und praktische** Risiko und macht eine Addendum-Anfrage leichter („wir wollen nur Kategorie/Ref, Attribution über Contributors“), ist aber **kein Ersatz** für die BY-Klarstellung nach OSM-DE / OSMF-Lesart.
- **UI-only-Abgleich** (Vorschläge anzeigen, Mapper recherchiert vor Ort / an der Schulhomepage) bleibt das risikoärmste Muster, wenn kein Addendum vorliegt.

### Quellen (BY / Addendum / Risiko)

- [GovData DL-DE BY 2.0](https://www.govdata.de/dl-de/by-2-0)
- [OSM DE: Nutzung von Open Data](https://openstreetmap.de/beitragen/recht/nutzung-von-open-data/)
- [Addendum DL-DE-BY](https://openstreetmap.de/beitragen/recht/addendum-dl-de-by/), [Addendum CC-BY](https://openstreetmap.de/beitragen/recht/addendum-cc-by/)
- [OSMF Licence Compatibility](https://osmfoundation.org/wiki/Licence/Licence_Compatibility) (u. a. DL-DE/by-2-0)
- [Open.NRW Kurzgutachten Datenlizenzen](https://open.nrw/system/files/media/document/file/opennrw_rechtl_gutachten_datenlizenzen_lowres_web.pdf)
- [BKG Ergänzungstext Namensnennung](https://sgx.geodatenzentrum.de/web_public/gdz/lizenz/deu/datenlizenz_deutschland_ergaenzungstext_namensnennung.pdf)

---

## Öffentliches Gut? Können diese Daten unabhängig von der Lizenz in OSM?

### Frage

Sind öffentlich zugängliche amtliche Schulverzeichnisse / Schul-Geodaten der Länder automatisch ein „öffentliches Gut“ (gemeinfrei) und damit unabhängig von einer ausgewiesenen Lizenz in OpenStreetMap nutzbar?

### Kurzantwort

**Nein.** Veröffentlichung auf einer Behördenwebsite oder in einem Open-Data-Portal macht die Daten **nicht automatisch gemeinfrei**. § 5 UrhG (_amtliche Werke_) greift nur eng; kuratierte Schulverzeichnisse können weiterhin urheber- oder datenbankrechtlich geschützt sein bzw. unter einer **ausdrücklichen Lizenz** stehen. Für OSM braucht es eine **ODbL-kompatible** Nutzungserlaubnis bzw. Waiver/Addendum — „öffentlich online ≠ frei für OSM“.

### Rechtlicher Rahmen (kurz)

1. **§ 5 UrhG (_amtliche Werke_)**  
   Abs. 1: Gesetze, Verordnungen, amtliche Erlasse/Bekanntmachungen, Gerichtsentscheidungen — kein Urheberrechtsschutz.  
   Abs. 2: weitere amtliche Werke zur allgemeinen Kenntnisnahme, mit Änderungsverbot und Quellenangabe.  
   Ein typisches Landes-Schulverzeichnis (Namen, Adressen, Schulformen, IDs) fällt **regelmäßig nicht** unter Abs. 1 und nur selten unter Abs. 2. Der BGH (_Bodenrichtwertsammlung_, I ZR 185/03) stellt klar: informative/statistische Zusammenstellungen sind keine _amtlichen Bekanntmachungen_ im Sinne von Abs. 1; Abs. 2 verlangt ein konkretes Interesse an **unbeschränkter Weitergabe**, nicht nur die Pflicht zur Veröffentlichung.

2. **Datenbankschutz (§§ 4, 87a–87b UrhG)**  
   Einzelne Fakten (Schulname, Adresse) haben oft keine Schöpfungshöhe; die **kuratierte, gepflegte Liste** kann als Datenbankwerk bzw. über das Herstellerrecht geschützt sein. Öffentliche Stellen können Hersteller sein.  
   Das **Datennutzungsgesetz (DNG)** § 2 Abs. 5 untersagt öffentlichen Stellen im Anwendungsbereich, sich auf § 87b UrhG zu berufen, um Weiterverwendung zu blockieren — das erklärt die Daten aber **nicht** für OSM frei und ersetzt keine ODbL-kompatible Lizenz.

3. **PSI / Open Data (DNG, Landes-Open-Data)**  
   Das DNG regelt vor allem das **Wie** der Weiterverwendung bereits bereitgestellter Daten, nicht pauschal das **Ob** der Veröffentlichung. Lizenzen (DL-DE, CC) bleiben zulässig und **binden**. Landesregeln (z. B. § 16a EGovG NRW) können großzügiger sein, heben aber keine inkompatiblen Attribution-/Share-Alike-Konflikte mit der ODbL automatisch auf.

4. **OSM-Praxis**  
   Import-Guidelines und Legal FAQ: nur freie / kompatible Daten; unklare oder restriktive Lizenzen brauchen Klärung oder Freigabe. CC0 / DL-DE-Zero sind unproblematisch; DL-DE-BY und CC BY brauchen typischerweise ein **Addendum/Waiver** (vgl. BKG-Ergänzungstext, OSM-DE-Vorlagen). Fehlen Nutzungsbedingungen auf der Website heißt **nicht** „frei“.

5. **„Öffentliches Gut“-Argument**  
   Trifft zu bei klarer §‑5-Gemeinfreiheit, CC0/DL-DE-Zero oder dokumentiertem OSM-Waiver. Scheitert bei Website-only ohne Lizenz, DL-DE-BY/CC-BY ohne Addendum, NC/ND oder AGB-Verboten. Risiko: Takedown, Import-Reversion, Contributor-Haftung.  
   Bei **bereits BY-lizenzierten** Open-Data-Quellen siehe den vorherigen Abschnitt: Problem ist primär Attribution/ODbL-Form, nicht „Geheimhaltung“.

### Implikation für den Schulabgleich

- Pro Land/Quelle Lizenz, Nachweis-URL und OSM-Freigabe dokumentieren (`officialLicense`, `osmCompatible`, `osmCompatibilityRefUrl`).
- OSM-kompatibel nur bei CC0 / DL-DE-Zero / belastbarer §‑5-Einordnung **oder** dokumentiertem Waiver/Addendum.
- **Nicht** aus „öffentlich = frei“ ableiten, dass Tag-Fixes oder Importe aus `unknown`-Quellen nach OSM dürfen.
- Bei `unknown` / `no`: UI-Hinweise und MapRoulette-Gate beibehalten; Behörden ggf. um CC0 oder DL-DE-BY-Addendum bitten.

### Quellen (öffentliches Gut)

- [§ 5 UrhG](https://www.gesetze-im-internet.de/urhg/__5.html)
- [§ 4 UrhG](https://www.gesetze-im-internet.de/urhg/__4.html), [§ 87a](https://www.gesetze-im-internet.de/urhg/__87a.html), [§ 87b UrhG](https://www.gesetze-im-internet.de/urhg/__87b.html)
- [DNG § 1](https://www.gesetze-im-internet.de/dng/__1.html), [§ 2](https://www.gesetze-im-internet.de/dng/__2.html), [§ 4](https://www.gesetze-im-internet.de/dng/__4.html), [§ 10](https://www.gesetze-im-internet.de/dng/__10.html)
- BGH I ZR 185/03 (_Bodenrichtwertsammlung_) — z. B. NWB-Dokumentation
- [Bundestag WD-7-087-25](https://www.bundestag.de/resource/blob/1170344/WD-7-087-25.pdf) (Datenlizenzen / § 5)
- [GovData Lizenzen](https://data.gov.de/informationen/lizenzen)
- [BKG Ergänzungstext Namensnennung (OSM)](https://sgx.geodatenzentrum.de/web_public/gdz/lizenz/deu/datenlizenz_deutschland_ergaenzungstext_namensnennung.pdf)
- [OSM Import Guidelines](https://wiki.openstreetmap.org/wiki/Import/Guidelines), [ODbL Compatibility](https://wiki.openstreetmap.org/wiki/Import/ODbL_Compatibility)
- [OSM DE: Nutzung von Open Data](https://openstreetmap.de/beitragen/recht/nutzung-von-open-data/), [Addendum DL-DE-BY](https://openstreetmap.de/beitragen/recht/addendum-dl-de-by/)
- [OSMF Licence and Legal FAQ](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ)

---

## Nächste Schritte

1. ~~PR für `bundeslandOfficialSources.ts`: belastbare Updates~~ (teilweise umgesetzt 2026-08-08: SL, HB, TH, ST, BW, RP).
2. Bei CC BY / DL-DE BY ohne Addendum: Behörden um OSM-Waiver bitten (Vorlage OSM-DE Addendum / [Getting permission](https://wiki.openstreetmap.org/wiki/DE:Import/Getting_permission)).
3. HE: klären, ob AFL-Freigabe 2012 für aktuelle Schul-DB gilt.
4. MapRoulette-Gate unverändert nur `yes_licence` / `yes_waiver`.

### Entwürfe Anschreiben (FOSSGIS)

Kontakte und fertige E-Mail-Entwürfe (Empfänger, Betreff, Text) pro Land: [`waiver-emails/`](waiver-emails/README.md) (Stand 2026-08-09). Im Research-Doc selbst war zuvor praktisch keine Kontakt-E-Mail hinterlegt (außer unpassendem BW-IT `sc@schule.bwl.de`).
