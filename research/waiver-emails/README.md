# OSM-Waiver-Anfragen: Schuldaten der Länder

Stand: 2026-08-09  
Basis: [`../licenses-unknown-laender.md`](../licenses-unknown-laender.md), [`src/lib/bundeslandOfficialSources.ts`](../../src/lib/bundeslandOfficialSources.ts)  
Quellen-URLs in den Anschreiben abgeglichen mit `jedeschule-scraper` `main` (upstream Datenschule, Stand nach Pull 2026-08-09; Bremen = Shape-ZIP).

## Haben wir eine E-Mail pro fehlendem Provider?

**Im Research-Doc bisher praktisch nein** — nur BW nannte `sc@schule.bwl.de` (IT-Support, nicht Rechteinhaber).

Unten: Kontakte aus Metadaten / Open-Data-Portalen / Impressum. Wo vorhanden: **Open-Data- oder Datensatz-Kontakt statt Poststelle**.

**Nicht anschreiben (bereits OSM-kompatibel):** BE, BB, SH.

## Übersicht

| Datei                              | Land                   | Situation                                                 | Empfänger (primär)                              | CC / Hinweis                                                               | Addendum-Typ                                                                |
| ---------------------------------- | ---------------------- | --------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [BY](BY-bayern.md)                 | Bayern                 | CC BY 4.0, OSM unklar                                     | `poststelle@stmuk.bayern.de`                    | `oc@bydata.de` (open bydata)                                               | [CC-BY](https://www.openstreetmap.de/beitragen/recht/addendum-cc-by/)       |
| [HB](HB-bremen.md)                 | Bremen                 | CC-BY Open Data                                           | `iqhb@iqhb.bremen.de`                           | Dataset-Herausgeber                                                        | CC-BY                                                                       |
| [HH](HH-hamburg.md)                | Hamburg                | DL-DE BY 2.0                                              | `oliver.gersch@bsb.hamburg.de`                  | Poststelle + `transparenzgesetz@bsfb.hamburg.de`                           | [DL-DE-BY](https://www.openstreetmap.de/beitragen/recht/addendum-dl-de-by/) |
| [NW](NW-nrw.md)                    | NRW                    | DL-DE BY 2.0                                              | `markus.guhl@msb.nrw.de`                        | Open.NRW `publisher_email`                                                 | DL-DE-BY                                                                    |
| [SL](SL-saarland.md)               | Saarland               | CC BY 4.0                                                 | `gdi-sl@lvgl.saarland.de`                       | GDI-Metadaten                                                              | CC-BY                                                                       |
| [TH](TH-thueringen.md)             | Thüringen              | DL-DE BY 2.0, **kommunales Eigentum**                     | `kompetenzzentrum.gdi-th@tlbg.thueringen.de`    | GDI-Th                                                                     | DL-DE-BY (+ Klarstellung Kommunen)                                          |
| [BW](BW-baden-wuerttemberg.md)     | Baden-Württemberg      | keine Open-Data-Lizenz                                    | `open-data@im.bwl.de`                           | daten.bw; CC Kultus-Poststelle                                             | erst Lizenz/Freigabe                                                        |
| [HE](HE-hessen.md)                 | Hessen                 | Live-DB ohne Lizenz; AFL-Liste 2012 (Permissions wartend) | `mail@opendata.hessen.de`                       | CC Lehrkräfteakademie                                                      | Fortgeltung 2012 + Open Data / Addendum                                     |
| [MV](MV-mecklenburg-vorpommern.md) | Mecklenburg-Vorpommern | Schulen ohne Lizenz; Geobasis hat CC-BY+OSM-Waiver        | `statistik.auskunft@statistik-mv.de`            | CC Bildungsministerium                                                     | Analog Geobasis-Waiver für Schulen                                          |
| [NI](NI-niedersachsen.md)          | Niedersachsen          | NiBiS ohne Open-Data-Lizenz                               | `gerling@nibis.de`                              | CC Poststelle + `service@nibis.de`; Ticket #31206457 / jedeSchule Mai 2026 | Freigabe / Open Data                                                        |
| [RP](RP-rheinland-pfalz.md)        | Rheinland-Pfalz        | restriktiv; Permissions 2022 wartend                      | `cc-od@open.rlp.de`                             | Kompetenzzentrum Open Data; CC Bildungsserver                              | Freigabe (Nachfassen)                                                       |
| [SN](SN-sachsen.md)                | Sachsen                | Schul-DB unklar; Geodaten DL-DE BY                        | `support@schuldatenbank.sachsen.de`             | Fachredaktion SSDB                                                         | Klarstellung + ggf. DL-DE-BY-Addendum                                       |
| [ST](ST-sachsen-anhalt.md)         | Sachsen-Anhalt         | Verbreitung untersagt                                     | `georeferenzierung@statistik.sachsen-anhalt.de` | MetaVer Georeferenzierung                                                  | Freigabe / Open Data                                                        |

### Was geändert wurde (Poststelle → Open Data / Named)

| Land | Vorher             | Jetzt                                                                     |
| ---- | ------------------ | ------------------------------------------------------------------------- |
| HH   | `poststelle@bsfb…` | MetaVer-Ansprechpartner Dr. Oliver Gersch                                 |
| NW   | `poststelle@msb…`  | Open.NRW `markus.guhl@msb.nrw.de`                                         |
| BW   | Kultus-Poststelle  | `open-data@im.bwl.de` (daten.bw)                                          |
| HE   | LA-Poststelle      | `mail@opendata.hessen.de`                                                 |
| RP   | nur Bildungsserver | `cc-od@open.rlp.de`                                                       |
| MV   | BM-Poststelle      | `statistik.auskunft@statistik-mv.de`                                      |
| BY   | `webkontakt@…`     | WFS-`poststelle@stmuk…` + CC `oc@bydata.de`                               |
| NI   | Poststelle         | `gerling@nibis.de` (Ticket #31206457); Poststelle + `service@nibis.de` CC |

## Was genügt als Freigabe?

**Eine Antwort-E-Mail einer berechtigten Person reicht** — kein Papierformular nötig — wenn sie klar sagt:

| Situation                      | Inhalt der Antwort                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Schon **CC BY**                | Abschnitt „Erlaubnis…“ von [addendum-cc-by](https://www.openstreetmap.de/beitragen/recht/addendum-cc-by/) ausgefüllt in die Antwort       |
| Schon **DL-DE BY**             | Abschnitt „Erlaubnis…“ von [addendum-dl-de-by](https://www.openstreetmap.de/beitragen/recht/addendum-dl-de-by/) ausgefüllt in die Antwort |
| **Keine / restriktive Lizenz** | Open-Data-Lizenz nennen; bei BY denselben Addendum-Abschnitt vom Link (CC0/Zero braucht kein Addendum)                                    |

Danach: Antwort (geschwärzt) unter [DE:Permissions](https://wiki.openstreetmap.org/wiki/DE:Permissions) / [Contributors](https://wiki.openstreetmap.org/wiki/Contributors) dokumentieren; Original an `info@openstreetmap.de`.

Jedes Länder-`.md` hat oben **Was genügt als Freigabe** und im Mailtext **Was wir brauchen**.

## Absender

FOSSGIS e.V. als Local Chapter der OpenStreetMap Foundation in Deutschland.  
Empfohlene Absenderadresse laut OSM-DE: `info@openstreetmap.de`. Für Verwaltungskontakt ggf. Beratungsstelle: `jochen.topf@fossgis.de`.

Platzhalter in den Entwürfen: `[NAME]`, `[FUNKTION]`, `[ABSENDER-EMAIL]`.
