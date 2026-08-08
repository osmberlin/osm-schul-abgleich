# OSM-heuristic vs official Schulform agreement

**Script:** [`analysis/scripts/osm-heuristic-official-agreement.ts`](../scripts/osm-heuristic-official-agreement.ts)

**Source:** `public/datasets/{BE,BB,SH}/schools_matches_detail.json` (matched only, licence-compatible Länder)

**Generated (UTC):** 2026-08-08T15:36:30.632Z

## Question

When both an official Schulform rule and an OSM name/URL heuristic resolve, how often do they agree?
Compound multi-form OSM names are excluded by the heuristic (counted under skipped). CI expects agreement ≥ **97%**.

## Summary

| Metric                        | Value      |
| ----------------------------- | ---------- |
| States                        | BE, BB, SH |
| Matched rows scanned          | 2336       |
| Compared (both rules present) | 1117       |
| Agree                         | 1107       |
| Disagree                      | 10         |
| Agreement rate                | 99.10%     |
| Threshold                     | 97%        |
| CI status                     | PASS       |
| Skipped (no official rule)    | 776        |
| Skipped (no OSM text rule)    | 443        |

## Sample disagreements (max 40)

| Land | key              | official     | osm heuristic | source | token               |
| ---- | ---------------- | ------------ | ------------- | ------ | ------------------- |
| BE   | match-BE-01K01   | gymnasium    | gesamtschule  | name   | gesamtschule        |
| BB   | match-BB-101760  | grundschule  | hauptReal     | name   | realschule          |
| BB   | match-BB-112173  | gesamtschule | grundschule   | name   | grundschule         |
| BB   | match-BB-160027  | gesamtschule | grundschule   | name   | grundschule         |
| BB   | match-BB-120777  | gymnasium    | grundschule   | name   | grundschule         |
| BB   | match-BB-112975  | gesamtschule | grundschule   | name   | grundschule         |
| BB   | match-BB-104474  | grundschule  | hauptReal     | name   | realschule          |
| SH   | match-SH-9115402 | grundschule  | gesamtschule  | name   | gemeinschaftsschule |
| SH   | match-SH-9106608 | gymnasium    | gesamtschule  | name   | gemeinschaftsschule |
| SH   | match-SH-9104468 | grundschule  | gesamtschule  | name   | gemeinschaftsschule |
