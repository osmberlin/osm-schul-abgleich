# Nominatim overlay vs baseline match

**Script:** [`analysis/official-geocode/nominatim-match-compare.ts`](./nominatim-match-compare.ts)

**Overlay:** `data/official-geocode/points.json` (4529 points)

**OSM extract:** `public/datasets/.pipeline/schools_osm_de.geojson`

**Generated (UTC):** 2026-08-30T06:31:20.215Z

Universe: recency-filtered officials with no coordinates, plus ids present in `points.json`.
Baseline match uses official GeoJSON as downloaded; geo pass fills null geometries from the Nominatim overlay, then gates, dedupes, and matches again.

## Per-state buckets

| State | Name                   | Same OSM partner | Different OSM partner | Baseline matched, geo unmatched | Geo matched, baseline unmatched | Overlay missing | Neither matched |
| ----- | ---------------------- | ---------------- | --------------------- | ------------------------------- | ------------------------------- | --------------- | --------------- |
| BW    | Baden-Württemberg      | 4                | 0                     | 8                               | 13                              | 15              | 451             |
| BY    | Bayern                 | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| BE    | Berlin                 | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| BB    | Brandenburg            | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| HB    | Bremen                 | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| HH    | Hamburg                | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| HE    | Hessen                 | 87               | 5                     | 1                               | 27                              | 7               | 77              |
| MV    | Mecklenburg-Vorpommern | 1                | 0                     | 0                               | 0                               | 0               | 1               |
| NI    | Niedersachsen          | 1663             | 190                   | 92                              | 594                             | 52              | 521             |
| NW    | Nordrhein-Westfalen    | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| RP    | Rheinland-Pfalz        | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| SL    | Saarland               | 0                | 0                     | 0                               | 0                               | 0               | 0               |
| SN    | Sachsen                | 0                | 0                     | 0                               | 1                               | 0               | 3               |
| ST    | Sachsen-Anhalt         | 21               | 5                     | 35                              | 73                              | 292             | 498             |
| SH    | Schleswig-Holstein     | 5                | 0                     | 0                               | 13                              | 3               | 43              |
| TH    | Thüringen              | 18               | 0                     | 6                               | 16                              | 2               | 57              |

## Niedersachsen distance histogram (name / website / address baseline matches)

Baseline `matchMode` in `name`, `name_prefix`, `website`, `address`, and overlay has a point. Distance is Nominatim point to OSM centroid. Matcher radius is 150 m.

| Metric        | Value |
| ------------- | ----- |
| n             | 1945  |
| p50 (m)       | 19.8  |
| p90 (m)       | 76.7  |
| Share > 150 m | 5.2%  |
| Share > 300 m | 3.5%  |
| Share > 500 m | 2.8%  |

## Sample: different OSM partner (up to 25)

| State | Official id | Name                                                 | Baseline OSM      | Geo OSM           | Nominatim→OSM m | Baseline mode | Geo mode                 |
| ----- | ----------- | ---------------------------------------------------- | ----------------- | ----------------- | --------------- | ------------- | ------------------------ |
| HE    | HE-4399     | IGS Süd                                              | relation/16069545 | node/8563918709   | 2               | name          | distance                 |
| HE    | HE-4866     | Europäische Schule RheinMain                         | way/51768301      | way/192025827     | 33              | name          | distance                 |
| HE    | HE-4787     | Frida-Kahlo-Schule                                   | way/702529553     | way/702527362     | 15              | name          | distance                 |
| HE    | HE-9380     | Startbahn, staatlich anerkannte private Berufsschule | way/1202349997    | relation/1808543  | 2               | address       | ref                      |
| HE    | HE-4397     | Adorno-Gymnasium                                     | way/771797878     | way/736961846     | 6               | name          | distance                 |
| NI    | NI-94407    | FöS-LE Astrid Lindgren                               | way/27770295      | way/27756101      | 35              | address       | distance                 |
| NI    | NI-80330    | IGS Lengede                                          | way/234288511     | way/234283752     | 354             | name          | distance                 |
| NI    | NI-80706    | IGS Nienburg                                         | way/435373536     | way/431897044     | 26              | website       | distance                 |
| NI    | NI-80676    | IGS Burgwedel                                        | node/1752266348   | node/13841938808  | 2               | name          | distance                 |
| NI    | NI-78748    | Pflegeschule                                         | node/13754655988  | way/29974270      | 194745          | name          | distance                 |
| NI    | NI-80238    | Evangelische IGS Wunstorf                            | way/30490233      | way/284654529     | 17              | address       | distance                 |
| NI    | NI-80147    | Integrierte Gesamtschule Friesland-Nord              | way/232338451     | relation/2211322  | 37              | website       | distance                 |
| NI    | NI-68706    | Mariengymnasium                                      | way/564649607     | way/165259868     | 64460           | name          | distance                 |
| NI    | NI-68068    | Gymnasium Robert-Koch-Schule                         | way/9043660       | relation/6099987  | 9               | website       | distance                 |
| NI    | NI-67672    | Teletta-Groß-Gymnasium                               | way/94793215      | node/2625789626   | 22              | name          | distance                 |
| NI    | NI-26876    | Grundschule Löwenherz, Wedtlenstedt                  | way/96063585      | way/1029566812    | 5               | address       | distance                 |
| NI    | NI-38271    | Grundschule Jennelt                                  | way/164421880     | way/1132964010    | 3               | name          | distance                 |
| NI    | NI-66333    | Gymnasium Sottrum                                    | node/560983636    | node/560983635    | 2               | name          | distance                 |
| NI    | NI-61414    | Lieth-Schule, Oberschule Bad Fallingbostel           | way/135725928     | relation/19281856 | 191             | address       | distance_and_name_prefix |
| NI    | NI-42377    | Oberschule Horneburg                                 | node/12393590277  | relation/3122368  | 244             | website       | distance                 |
| NI    | NI-41373    | Schiller-Oberschule Sarstedt                         | way/130964340     | node/1441731847   | 10              | name          | distance_and_name_prefix |
| NI    | NI-30843    | Grundschule Hemeringen                               | way/40615180      | way/26700209      | 27              | name          | distance                 |
| NI    | NI-30570    | Grundschule Kirchdorf                                | way/158686406     | relation/1662292  | 23              | name          | distance                 |
| NI    | NI-41750    | Bonifatiusschule                                     | way/1078238221    | relation/3849631  | 96479           | name          | distance                 |
| NI    | NI-41440    | Oberschule Harsum, Molitoris-Schule                  | way/306203040     | way/306203032     | 5               | address       | distance                 |

## Sample: baseline matched, geo unmatched (up to 25)

| State | Official id | Name                                                                   | Baseline OSM      | Geo OSM | Nominatim→OSM m | Baseline mode | Geo mode |
| ----- | ----------- | ---------------------------------------------------------------------- | ----------------- | ------- | --------------- | ------------- | -------- |
| BW    | BW-04301279 | Freie Waldorfschule                                                    | way/80352407      | —       | 11              | address       | —        |
| BW    | BW-04310876 | Freie Waldorfschule Am Illerblick                                      | way/222611417     | —       | 126             | name          | —        |
| BW    | BW-04301267 | Freie Waldorfschule Überlingen                                         | way/92724697      | —       | 17              | address       | —        |
| BW    | BW-04309400 | Freie Waldorfschule St.Georgen                                         | way/990281498     | —       | 54              | address       | —        |
| BW    | BW-04318012 | Evangelische Missionsschule Unterweissach GmbH                         | way/438599075     | —       | 15              | address       | —        |
| BW    | BW-04301164 | Freie Waldorfschule Engelberg                                          | relation/2172759  | —       | 32              | name          | —        |
| BW    | BW-04320729 | NISA - Freie Schule Aalen                                              | way/112796749     | —       | 72071           | address       | —        |
| BW    | BW-04312976 | Unterseeschule Aktive Schule für leb. Lernen Grund- und Werkrealschule | node/12576849535  | —       | 16              | website       | —        |
| HE    | HE-4327     | Grundschule am Eichwäldchen                                            | way/27265232      | —       | 27              | name          | —        |
| NI    | NI-66412    | Hölty-Gymnasium                                                        | way/25400118      | —       | 33              | address       | —        |
| NI    | NI-91856    | Erich Kästner-Schule, FöS LE/SR                                        | way/439943173     | —       | 18              | website       | —        |
| NI    | NI-84499    | Wilhelm-Röpke-Schule Kooperative Gesamtschule Schwarmstedt             | node/29509631     | —       | 2               | address       | —        |
| NI    | NI-67210    | Abendgymnasium Osnabrück                                               | node/1738970208   | —       | 32              | address       | —        |
| NI    | NI-82703    | Integrierte Gesamtschule Helene-Lange-Schule                           | way/27194035      | —       | 66              | address       | —        |
| NI    | NI-74858    | Berufsbildende Schulen Lohne I (Handelslehranstalten)                  | way/701239458     | —       | 41              | website       | —        |
| NI    | NI-63733    | Realschule St.-Ludgeri-Schule                                          | way/155251838     | —       | 20              | website       | —        |
| NI    | NI-44659    | Hauptschule Herbert-Jander-Schule                                      | way/1229649601    | —       | 23              | address       | —        |
| NI    | NI-81358    | IGS Celle                                                              | node/774473106    | —       | 5               | address       | —        |
| NI    | NI-39238    | Grundschule Albert-Schweitzer-Schule                                   | way/683311307     | —       | 2809            | website       | —        |
| NI    | NI-45652    | Hauptschule Löningen                                                   | way/917607187     | —       | 7               | website       | —        |
| NI    | NI-73763    | BBS Technikakademie der Stadt Braunschweig                             | way/149716388     | —       | 49              | website       | —        |
| NI    | NI-45329    | Oberschule Wilhelm-von-der-Heyde                                       | way/25830151      | —       | 16              | website       | —        |
| NI    | NI-71900    | BBS Lüchow                                                             | relation/19468504 | —       | 119             | website       | —        |
| NI    | NI-70506    | Comenius-Schule                                                        | way/56670901      | —       | 62762           | name          | —        |
| NI    | NI-66382    | Gymnasium Ernestinum                                                   | way/913661888     | —       | 84436           | name          | —        |
