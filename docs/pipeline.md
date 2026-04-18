# Daten-Pipeline (Überblick)

Orchestrierung im Code: [`scripts/lib/nationalPipeline.ts`](../scripts/lib/nationalPipeline.ts), Pfade: [`scripts/lib/nationalDatasetPaths.ts`](../scripts/lib/nationalDatasetPaths.ts), CSV-Pfad: [`scripts/lib/jedeschuleDumpConfig.ts`](../scripts/lib/jedeschuleDumpConfig.ts).

Es gibt **keine** nationalen Zwischendateien mehr (`schools_official_de.geojson` / `schools_matches_de.json`). Der Abgleich läuft **pro Bundesland** in einem Durchgang.

## Ablauf (Mermaid)

```mermaid
flowchart TB
  jFetch[JedeSchule weekly CSV]
  oFetch[Overpass Deutschland]
  jFetch --> csvFile[jedeschule-latest.csv]
  jFetch --> metaOfficial[schools_official_de.meta.json]
  jFetch --> statsJson[jedeschule_stats.json]
  oFetch --> osmPipeline[".pipeline/schools_osm_de.geojson"]
  oFetch --> metaOsm[schools_osm_de.meta.json]
  csvFile --> parse[CSV parsen]
  parse --> perState[Pro StateCode STATE_ORDER]
  osmPipeline --> osmFc[OSM FeatureCollection]
  osmFc --> perState
  perState --> sliceOfficial[officialGeojsonForState]
  sliceOfficial --> gate[gateOfficialFeatureCollection]
  gate --> dedupe[dedupeOfficialInputs]
  osmFc --> sliceOsm[OSM nach Bundesland filtern]
  dedupe --> matchStep[matchSchools]
  sliceOsm --> matchStep
  matchStep --> writeLand["datasets/{code}/*"]
  writeLand --> summaryOut[summary.json]
  statsJson --> summaryOut
```

## NPM/Bun-Skripte

| Skript                                    | Bedeutung                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pipeline:download`                       | Beide Downloads parallel; Parent prüft Meta `ok`                                               |
| `pipeline:rebuild`                        | Nur `runStateFirstPipeline` (kein Netz)                                                        |
| `pipeline`                                | `download` → `rebuild`                                                                         |
| `pipeline:match` / `pipeline:split-lands` | jeweils ein vollständiger Lauf von `runStateFirstPipeline` (Alias; kein zweiter Split-Schritt) |

## Ausgaben

- **Pro Land:** `public/datasets/{code}/schools_official.geojson`, `schools_osm_areas.json` (volle Umriss-Geometrien, keyed `way/id` …), `schools_matches_map.json`, `schools_matches_list_search.json`, `schools_matches_detail.json`, `schools_official_points.json`, `schools_osm.meta.json`
- **Gesamt:** `public/datasets/summary.json` (`pipelineVersion`, `jedeschuleCsvSource: jedeschule-latest.csv`)
- **Intern (nicht im Pages-Build):** `public/datasets/.pipeline/schools_osm_de.geojson` (CI entfernt vor `vite build`)

Siehe auch: [matchSchools – Abgleichslogik](match-schools.md).
