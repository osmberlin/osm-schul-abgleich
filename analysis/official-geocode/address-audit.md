# Official address audit (Nominatim readiness)

**Script:** [`analysis/official-geocode/address-audit.ts`](./address-audit.ts)

**Source:** `public/datasets/jedeschule-latest.csv`

**Generated (UTC):** 2026-08-30T04:28:02.092Z

Recency filter: keep rows whose `update_timestamp` is within 12 calendar months (same as the national pipeline).

## CSV totals

| Set                            | Count |
| ------------------------------ | ----- |
| Raw CSV rows                   | 34102 |
| Kept (12-month recency)        | 32594 |
| Removed: too old               | 549   |
| Removed: missing timestamp     | 959   |
| Removed: unparseable timestamp | 0     |

## Per-state (recency-filtered)

Columns `addr+zip+city`, `street without digit`, and `incomplete address` are counted among **no-geo** rows (the Nominatim queue).

| State | Name                   | Total | No geo | Share  | Addr+zip+city | Street without digit | Incomplete address |
| ----- | ---------------------- | ----- | ------ | ------ | ------------- | -------------------- | ------------------ |
| BW    | Baden-Württemberg      | 6028  | 491    | 8.1%   | 491           | 4                    | 0                  |
| BY    | Bayern                 | 4392  | 0      | 0.0%   | 0             | 0                    | 0                  |
| BE    | Berlin                 | 939   | 0      | 0.0%   | 0             | 0                    | 0                  |
| BB    | Brandenburg            | 963   | 0      | 0.0%   | 0             | 0                    | 0                  |
| HB    | Bremen                 | 253   | 0      | 0.0%   | 0             | 0                    | 0                  |
| HH    | Hamburg                | 548   | 0      | 0.0%   | 0             | 0                    | 0                  |
| HE    | Hessen                 | 2064  | 204    | 9.9%   | 204           | 7                    | 0                  |
| MV    | Mecklenburg-Vorpommern | 565   | 2      | 0.4%   | 2             | 0                    | 0                  |
| NI    | Niedersachsen          | 3112  | 3112   | 100.0% | 3112          | 6                    | 0                  |
| NW    | Nordrhein-Westfalen    | 5653  | 0      | 0.0%   | 0             | 0                    | 0                  |
| RP    | Rheinland-Pfalz        | 1653  | 0      | 0.0%   | 0             | 0                    | 0                  |
| SL    | Saarland               | 374   | 0      | 0.0%   | 0             | 0                    | 0                  |
| SN    | Sachsen                | 2079  | 4      | 0.2%   | 4             | 0                    | 0                  |
| ST    | Sachsen-Anhalt         | 1781  | 924    | 51.9%  | 924           | 1                    | 0                  |
| SH    | Schleswig-Holstein     | 1077  | 64     | 5.9%   | 64            | 62                   | 0                  |
| TH    | Thüringen              | 1113  | 99     | 8.9%   | 99            | 3                    | 0                  |

## Sachsen-Anhalt dual feed

JedeSchule ST mixes ArcGIS (`ST-ARC*`) and numeric (`ST-1…`) ids. Overlap uses `normalizeSchoolNameForMatch` plus lowercased trimmed city.

| Set                               | Count |
| --------------------------------- | ----- |
| `ST-ARC*` with coordinates        | 857   |
| `ST-1…` without coordinates       | 924   |
| Name+city overlap (distinct keys) | 239   |

## Schleswig-Holstein house numbers

Schleswig-Holstein: 62 of 64 no-geo rows (96.9%) have a street without a digit (house number). Structured Nominatim `street=` queries are likely weak there unless house numbers are filled in.

## Conclusion: Nominatim-ready lands

A land is treated as Nominatim-ready when it has a no-geo queue, at least 70% of those rows have address+zip+city, and fewer than 50% of no-geo rows lack a digit in the street.

- Ready: BW (Baden-Württemberg), HE (Hessen), MV (Mecklenburg-Vorpommern), NI (Niedersachsen), SN (Sachsen), ST (Sachsen-Anhalt), TH (Thüringen).
- Not ready (incomplete addresses or many streets without house numbers): SH (Schleswig-Holstein).
- No no-geo queue (already have coordinates): BY (Bayern), BE (Berlin), BB (Brandenburg), HB (Bremen), HH (Hamburg), NW (Nordrhein-Westfalen), RP (Rheinland-Pfalz), SL (Saarland).
