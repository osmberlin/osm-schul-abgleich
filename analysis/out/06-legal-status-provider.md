# Official `legal_status` and `provider` (JedeSchule CSV)

**Script:** [`analysis/scripts/jedeschule-legal-provider-analysis.ts`](../scripts/jedeschule-legal-provider-analysis.ts)

**Source:** `public/datasets/jedeschule-latest.csv`

**Generated (UTC):** 2026-04-18T05:49:08.872Z

## Scope

Same **JedeSchule** nationwide CSV used to build `schools_official*.geojson` in the pipeline (`jedeschule-latest.csv` or `JEDESCHULE_CSV`). One row per school; Bundesland from the school `id` prefix (e.g. `NW-…`).

If `legal_status` or `provider` is null/empty/whitespace in the CSV, it counts as **`none`**.

## Global value counts

Up to **30** value rows per field (by frequency), plus **(other)** if there are more distinct values. **none** means no value in the CSV for that field.

### `legal_status`

| value                                              | count | %      |
| -------------------------------------------------- | ----- | ------ |
| none                                               | 43978 | 79.8 % |
| in öffentlicher Trägerschaft                       | 5108  | 9.3 %  |
| Öffentlich                                         | 3206  | 5.8 %  |
| öffentlich                                         | 726   | 1.3 %  |
| in Trägerschaft eines Ersatzschulträgers (privat)  | 561   | 1.0 %  |
| Grundschulen                                       | 492   | 0.9 %  |
| Ersatzschule - Private Schulträger (sonstige)      | 310   | 0.6 %  |
| privat                                             | 215   | 0.4 %  |
| Sekundar-, Gemeinschafts- und Gesamtschulen        | 186   | 0.3 %  |
| Förderschulen                                      | 98    | 0.2 %  |
| Privat                                             | 84    | 0.2 %  |
| Gymnasien                                          | 76    | 0.1 %  |
| Ersatzschule - röm.-kath. Religionsgemeinschaft    | 33    | 0.1 %  |
| Ersatzschule - ev.-luth. Religionsgemeinschaft     | 22    | 0.0 %  |
| Ergänzungsschule - Private Schulträger (sonstige)  | 15    | 0.0 %  |
| Ersatzschule - Weltanschauungsgemeinschaften       | 4     | 0.0 %  |
| Freie Waldorfschulen                               | 4     | 0.0 %  |
| Ersatzschule - Private Schulträger (Montessori)    | 3     | 0.0 %  |
| Ersatzschule - Private Schulträger (Waldorfschule) | 3     | 0.0 %  |
| freie Trägerschaft                                 | 3     | 0.0 %  |
| Ersatzschule - ev.-ref. Religionsgemeinschaft      | 2     | 0.0 %  |
| Ergänzungsschule - ev.-luth. Religionsgemeinschaft | 1     | 0.0 %  |
| Ergänzungsschule - ev.-ref. Religionsgemeinschaft  | 1     | 0.0 %  |
| Ergänzungsschule - röm.-kath. Religionsgemeinschaf | 1     | 0.0 %  |
| Ergänzungsschule - Weltanschauungsgemeinschaften   | 1     | 0.0 %  |
| Ersatzschule - Sonstige Religionsgemeinschaft      | 1     | 0.0 %  |
| Schulen des Zweiten Bildungsweges                  | 1     | 0.0 %  |

### `provider`

| value                                                        | count | %      |
| ------------------------------------------------------------ | ----- | ------ |
| none                                                         | 37076 | 67.2 % |
| öffentlich (Kommune)                                         | 737   | 1.3 %  |
| Regierungspräsidium Stuttgart Abteilung 7 Schule und Bildung | 432   | 0.8 %  |
| Staatliches Schulamt Mannheim                                | 332   | 0.6 %  |
| Staatliches Schulamt Frankfurt (Oder)                        | 288   | 0.5 %  |
| Stadt Köln                                                   | 272   | 0.5 %  |
| Staatliches Schulamt Göppingen                               | 269   | 0.5 %  |
| Regierungspräsidium Karlsruhe Abteilung 7 Schule und Bildung | 257   | 0.5 %  |
| Staatliches Schulamt Brandenburg an der Havel                | 246   | 0.4 %  |
| Staatliches Schulamt Freiburg                                | 242   | 0.4 %  |
| Staatliches Schulamt Biberach                                | 228   | 0.4 %  |
| Staatliches Schulamt Cottbus                                 | 220   | 0.4 %  |
| Staatliches Schulamt Karlsruhe                               | 220   | 0.4 %  |
| Staatliches Schulamt Neuruppin                               | 212   | 0.4 %  |
| Staatliches Schulamt Markdorf                                | 197   | 0.4 %  |
| Regierungspräsidium Freiburg Abteilung 7 Schule und Bildung  | 185   | 0.3 %  |
| Staatliches Schulamt Künzelsau                               | 174   | 0.3 %  |
| Staatliches Schulamt Heilbronn                               | 172   | 0.3 %  |
| Regierungspräsidium Tübingen Abteilung 7 Schule und Bildung  | 169   | 0.3 %  |
| Staatliches Schulamt Tübingen                                | 168   | 0.3 %  |
| Staatliches Schulamt Offenburg                               | 164   | 0.3 %  |
| Staatliches Schulamt Nürtingen                               | 159   | 0.3 %  |
| Staatliches Schulamt Lörrach                                 | 157   | 0.3 %  |
| Staatliches Schulamt Pforzheim                               | 157   | 0.3 %  |
| Stadt Dortmund                                               | 157   | 0.3 %  |
| Staatliches Schulamt Rastatt                                 | 156   | 0.3 %  |
| Staatliches Schulamt Konstanz                                | 155   | 0.3 %  |
| Stadt Düsseldorf                                             | 154   | 0.3 %  |
| Stadt Essen - Schulverwaltungsamt -                          | 151   | 0.3 %  |
| Staatliches Schulamt Donaueschingen                          | 148   | 0.3 %  |
| (other)                                                      | 11481 | 20.8 % |

## Per Bundesland: has value vs `none`

**Has value** = non-empty string after trim. **none** = null, empty, or whitespace-only in the CSV.

| Code | Bundesland             | Records | legal_status has | legal_status none | provider has | provider none |
| ---- | ---------------------- | ------- | ---------------- | ----------------- | ------------ | ------------- |
| BW   | Baden-Württemberg      | 27194   | 0                | 27194             | 4809         | 22385         |
| BY   | Bayern                 | 4392    | 0                | 4392              | 0            | 4392          |
| BE   | Berlin                 | 940     | 940              | 0                 | 0            | 940           |
| BB   | Brandenburg            | 966     | 0                | 966               | 966          | 0             |
| HB   | Bremen                 | 207     | 0                | 207               | 0            | 207           |
| HH   | Hamburg                | 559     | 0                | 559               | 0            | 559           |
| HE   | Hessen                 | 2101    | 0                | 2101              | 0            | 2101          |
| MV   | Mecklenburg-Vorpommern | 565     | 563              | 2                 | 0            | 565           |
| NI   | Niedersachsen          | 3128    | 3128             | 0                 | 3128         | 0             |
| NW   | Nordrhein-Westfalen    | 5669    | 5669             | 0                 | 5609         | 60            |
| RP   | Rheinland-Pfalz        | 1654    | 0                | 1654              | 1654         | 0             |
| SL   | Saarland               | 731     | 0                | 731               | 0            | 731           |
| SN   | Sachsen                | 2093    | 0                | 2093              | 0            | 2093          |
| ST   | Sachsen-Anhalt         | 1784    | 857              | 927               | 857          | 927           |
| SH   | Schleswig-Holstein     | 2028    | 0                | 2028              | 0            | 2028          |
| TH   | Thüringen              | 1124    | 0                | 1124              | 1036         | 88            |

| Metric                             | Value |
| ---------------------------------- | ----- |
| Schools in CSV (denominator for %) | 55135 |
