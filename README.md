# OSM Schulabgleich

Vergleicht pro Bundesland Schulstammdaten von [jedeschule.codefor.de](https://jedeschule.codefor.de) mit OSM-Schulen (`amenity=school`) als **Knoten**, **Wege** und **Relationen** (ein Overpass-Lauf mit `out geom`).

Die zentrale CSV wird **wöchentlich** aktualisiert ([Projekt](https://codefor.de/projekte/jedeschule-2/), [csv-data](https://jedeschule.codefor.de/csv-data/)); GitHub Pages CI läuft **täglich** (06:00 UTC) und lädt CSV sowie Overpass **immer gemeinsam** neu — der Abgleich läuft nur, wenn **beide** Downloads geklappt haben.

## Daten-Pipeline (national → Abgleich → Split)

Die Pipeline arbeitet zuerst **bundesweit** (GeoJSON + Meta unter `public/datasets/`), führt den **Abgleich** darauf aus und **verteilt** die Ergebnisse nach Bundesland.

| Skript                         | Aufgabe                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pipeline:download:jedeschule` | CSV laden → `schools_official_de.geojson`, `jedeschule_stats.json`, `schools_official_de.meta.json`.                                                                                                               |
| `pipeline:download:osm`        | Ein Overpass-Lauf für **Deutschland** → `schools_osm_de.geojson`, `schools_osm_de.meta.json`.                                                                                                                      |
| `pipeline:download`            | Startet **beide** Downloads **parallel**; **Exit 1**, wenn eine Quelle fehlschlägt (`ok: false` in den Meta-JSONs).                                                                                                |
| `pipeline:match`               | Nationaler Abgleich; **nur** wenn JedeSchule- **und** OSM-Meta `ok: true` sind, sonst Skip + `runs.json`. `PIPELINE_FORCE_MATCH=1` erzwingt Match mit vorliegenden Dateien (lokal z. B. nach teilweisem Download). |
| `pipeline:split-lands`         | Nach erfolgreichem Match: Sharding nach `public/datasets/{code}/…` und `summary.json`. Wenn Match übersprungen wurde: **No-op** (Marker `.pipeline_skip_split`).                                                   |
| `pipeline:rebuild`             | Nur `pipeline:match` → `pipeline:split-lands` (**ohne** Downloads).                                                                                                                                                |
| `pipeline`                     | `pipeline:download` → `pipeline:match` → `pipeline:split-lands` (z. B. CI).                                                                                                                                        |

```bash
bun run pipeline
```

CSV-URL: `scripts/lib/jedeschuleDumpConfig.ts`. Optional lokal: `public/datasets/jedeschule-latest.csv` (`.gitignore`). Meta in `schools_official_de.meta.json` u. a. `generatedAt`, HTTP-Header, SHA-256, `update_timestamp`, `upstreamDatasetChanged`.

Download-Orchestrierung: `Bun.spawn` (beide Quellen parallel); der Parent prüft danach beide Meta-Dateien.

## Bundesland-Grenzen

Die vereinfachten Grenzen liegen unter `public/bundesland-boundaries/{code}.geojson` (**OpenStreetMap**).

## Entwicklung

```bash
bun install
bun run pipeline:download          # oder einzeln :jedeschule / :osm
bun run pipeline:match
bun run pipeline:split-lands
bun run dev
```

Wenn die nationalen Artefakte schon passen und nur Abgleich + Split neu laufen sollen:

```bash
bun run pipeline:rebuild
```

## Qualität

```bash
bun run lint
bun run test
bun run build
```

GitHub Actions (`.github/workflows/pages.yml`): `bun run pipeline` → Build (täglicher Schedule, Push `main`, manuell). Schlägt ein Download fehl, bricht die Pipeline ab (kein neuer Deploy aus diesem Lauf).
