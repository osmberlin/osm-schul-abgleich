# Data impact report

Generated: **2026-04-18 10:54:04 CEST**
Git: `63a0142`

This report measures local **`public/datasets`** (no pipeline download) and **`dist/`** after a clean rebuild. Before the build, large pipeline-only paths are stashed like in CI so **`dist/`** matches GitHub Pages. It does not fetch CSV or Overpass. **Regenerate:** `bun run report:data-impact` — or `bun run report:data-impact -- --no-build` to only re-scan the existing `dist/`.

## Chapter 1 — How much data the GitHub Action handles

In CI (`.github/workflows/pages.yml`), `bun run pipeline` downloads the JedeSchule CSV and a Germany-wide Overpass extract, then matches per Bundesland. Only small snapshot JSON files are committed to `main`; per-land GeoJSON/JSON stay on the runner (gitignored) until build.
Before `vite build`, CI removes `jedeschule-latest.csv` and `public/datasets/.pipeline/` so those large inputs are **not** copied into `dist/`. The deploy artifact is the full `dist/` folder, including JS/CSS, copied `public/` assets, and source maps. GitHub Pages applies response compression at delivery time (verified by `content-encoding` headers).

### Pipeline-scale inputs on disk (optional, not deployed)

These files appear after a local `bun run pipeline`. They are **removed in CI** before the static build and are **not** part of the Pages bundle.

| Path                                               | Size      | Bytes    |
| -------------------------------------------------- | --------- | -------- |
| `public/datasets/jedeschule-latest.csv`            | 53.40 MiB | 55992205 |
| `public/datasets/.pipeline/schools_osm_de.geojson` | 28.42 MiB | 29800719 |

## Chapter 2 — How much data is passed on to users

GitHub Pages serves the static **`dist/`** output. The app loads `summary.json` and then fetches **per Bundesland** assets as needed — users do not download all Länder at once. On-the-wire size may be smaller than file sizes if the CDN serves `br`/`gzip` responses.

## `public/datasets` — static data copied into the build

### Root snapshot files

| Path                            | Size     | Bytes |
| ------------------------------- | -------- | ----- |
| `jedeschule_stats.json`         | 0.00 MiB | 431   |
| `schools_official_de.meta.json` | 0.00 MiB | 410   |
| `schools_osm_de.meta.json`      | 0.00 MiB | 201   |
| `status/runs.jsonl`             | 0.06 MiB | 59177 |
| `summary.json`                  | 0.00 MiB | 4188  |

**Subtotal (root):** 0.06 MiB (64407 bytes)

### Per Bundesland (sum over 16 Länder)

| Pattern                                      | Size      | Bytes    | Where loaded                                                           | Purpose                                                                                    |
| -------------------------------------------- | --------- | -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `schools_official.geojson` (×Länder)         | 15.35 MiB | 16100836 | `/bundesland/{code}/schule/…`                                          | Detail-only official GeoJSON snapshot for compare, ambiguous candidates, and traceability. |
| `schools_official_points.json` (×Länder)     | 1.06 MiB  | 1115529  | `/bundesland/{code}` (+ reused in detail)                              | Compact official id→point index for map placement fallback and bbox filtering.             |
| `schools_osm_areas.json` (×Länder)           | 14.48 MiB | 15186626 | `/bundesland/{code}/schule/…` (lazy)                                   | Campus polygons/lines (way/relation geoms) for the detail map.                             |
| `schools_matches_map.json` (×Länder)         | 12.03 MiB | 12611594 | `/bundesland/{code}`                                                   | Map-first rows (key/category/display names/coordinates) for immediate map rendering.       |
| `schools_matches_list_search.json` (×Länder) | 29.28 MiB | 30704330 | `/bundesland/{code}` (lazy: Liste/Suche anzeigen) (+ reused in detail) | List/search rows with condensed `search` object and list-specific fields.                  |
| `schools_matches_detail.json` (×Länder)      | 39.74 MiB | 41668761 | `/bundesland/{code}/schule/…`                                          | Detail-only full match rows keyed by `key` for compare/explanation fields.                 |
| `schools_osm.meta.json` (×Länder)            | 0.00 MiB  | 2832     | `/bundesland/{code}`                                                   | Tiny per-OSM-ref metadata for the state route (avoid loading full OSM GeoJSON there).      |

**Subtotal (per-Land files):** 111.95 MiB (117390508 bytes)

**Total static datasets (root + per-Land):** 112.01 MiB (117454915 bytes)

### Per Bundesland totals (compact matrix)

| Code | `official_points` | `matches_map` | `matches_list_search` | `official.geojson` | `matches_detail` | `osm_areas` | Total     |
| ---- | ----------------- | ------------- | --------------------- | ------------------ | ---------------- | ----------- | --------- |
| BW   | 0.20 MiB          | 1.98 MiB      | 4.81 MiB              | 2.89 MiB           | 6.59 MiB         | 2.00 MiB    | 18.47 MiB |
| BY   | 0.39 MiB          | 1.94 MiB      | 4.31 MiB              | 2.23 MiB           | 6.37 MiB         | 2.03 MiB    | 17.28 MiB |
| BE   | 0.03 MiB          | 0.34 MiB      | 0.85 MiB              | 0.43 MiB           | 1.23 MiB         | 0.56 MiB    | 3.44 MiB  |
| BB   | 0.03 MiB          | 0.33 MiB      | 0.83 MiB              | 0.48 MiB           | 1.12 MiB         | 0.41 MiB    | 3.19 MiB  |
| HB   | 0.00 MiB          | 0.07 MiB      | 0.18 MiB              | 0.01 MiB           | 0.19 MiB         | 0.10 MiB    | 0.54 MiB  |
| HH   | 0.02 MiB          | 0.18 MiB      | 0.44 MiB              | 0.26 MiB           | 0.66 MiB         | 0.23 MiB    | 1.79 MiB  |
| HE   | 0.05 MiB          | 0.69 MiB      | 1.76 MiB              | 0.86 MiB           | 2.45 MiB         | 0.94 MiB    | 6.75 MiB  |
| MV   | 0.02 MiB          | 0.22 MiB      | 0.53 MiB              | 0.27 MiB           | 0.71 MiB         | 0.29 MiB    | 2.03 MiB  |
| NI   | 0.00 MiB          | 1.29 MiB      | 3.19 MiB              | 1.31 MiB           | 3.91 MiB         | 1.54 MiB    | 11.24 MiB |
| NW   | 0.16 MiB          | 2.25 MiB      | 5.60 MiB              | 2.86 MiB           | 7.49 MiB         | 3.41 MiB    | 21.77 MiB |
| RP   | 0.04 MiB          | 0.61 MiB      | 1.52 MiB              | 0.78 MiB           | 1.88 MiB         | 0.71 MiB    | 5.54 MiB  |
| SL   | 0.01 MiB          | 0.21 MiB      | 0.52 MiB              | 0.30 MiB           | 0.64 MiB         | 0.17 MiB    | 1.84 MiB  |
| SN   | 0.05 MiB          | 0.63 MiB      | 1.57 MiB              | 0.96 MiB           | 2.34 MiB         | 0.78 MiB    | 6.34 MiB  |
| ST   | 0.03 MiB          | 0.53 MiB      | 1.30 MiB              | 0.74 MiB           | 1.65 MiB         | 0.43 MiB    | 4.68 MiB  |
| SH   | 0.03 MiB          | 0.38 MiB      | 0.95 MiB              | 0.46 MiB           | 1.20 MiB         | 0.45 MiB    | 3.47 MiB  |
| TH   | 0.03 MiB          | 0.37 MiB      | 0.91 MiB              | 0.53 MiB           | 1.31 MiB         | 0.43 MiB    | 3.59 MiB  |

### Route-oriented payload slices (sum over 16 Länder)

These totals are **aggregate sums across all Bundesländer** (scenario-style budgeting), not the bytes a single user typically loads in one session.

| Slice                                                                       | Size      | Bytes    |
| --------------------------------------------------------------------------- | --------- | -------- |
| Map-first core (`official_points` + `matches_map` + `osm.meta`)             | 13.09 MiB | 13729955 |
| List/search lazy increment (`matches_list_search`)                          | 29.28 MiB | 30704330 |
| Detail-only increment (`official.geojson` + `osm_areas` + `matches_detail`) | 69.58 MiB | 72956223 |

### Duplication reduction indicator

Map match payload is **30.27%** of detail match payload (12.03 MiB vs 39.74 MiB).
List/search payload is **73.69%** of detail match payload (29.28 MiB vs 39.74 MiB).
Interpretation: lower percentages indicate clearer route separation. Map payload should be much smaller than detail; list/search can remain closer if it intentionally carries filter/search material.

### Route load examples (BW)

#### 1) State route (`/bundesland/{code}`)

| File                                       | Size     | Bytes   |
| ------------------------------------------ | -------- | ------- |
| `datasets/summary.json`                    | 0.00 MiB | 4188    |
| `datasets/status/runs.jsonl`               | 0.06 MiB | 59177   |
| `datasets/BW/schools_official_points.json` | 0.20 MiB | 206695  |
| `datasets/BW/schools_matches_map.json`     | 1.98 MiB | 2075113 |
| `datasets/BW/schools_osm.meta.json`        | 0.00 MiB | 177     |
| `bundesland-boundaries/BW.geojson`         | 0.01 MiB | 6479    |

**State route total (BW):** 2.24 MiB (2351829 bytes)

#### 2) Detail page of a matched geometry (`/bundesland/{code}/schule/{schoolKey}`)

| File                                                                           | Size     | Bytes   | Likely cached after state page?                           |
| ------------------------------------------------------------------------------ | -------- | ------- | --------------------------------------------------------- |
| `datasets/BW/schools_official_points.json`                                     | 0.20 MiB | 206695  | yes (same as state route)                                 |
| `datasets/BW/schools_matches_map.json`                                         | 1.98 MiB | 2075113 | yes (same as state route)                                 |
| `datasets/BW/schools_matches_list_search.json` (lazy via Liste/Suche anzeigen) | 4.81 MiB | 5042372 | maybe (cached when list/search was opened on state route) |
| `datasets/BW/schools_official.geojson`                                         | 2.89 MiB | 3034040 | no                                                        |
| `datasets/BW/schools_matches_detail.json`                                      | 6.59 MiB | 6911749 | no                                                        |
| `datasets/BW/schools_osm_areas.json` (lazy, when needed)                       | 2.00 MiB | 2095197 | no (lazy request)                                         |
| `bundesland-boundaries/BW.geojson`                                             | 0.01 MiB | 6479    | yes (same as state route)                                 |

**Detail route totals (BW, with areas):**

| Bucket                                      | Size      | Bytes    |
| ------------------------------------------- | --------- | -------- |
| Total (now)                                 | 18.47 MiB | 19371645 |
| Details only (incremental after state page) | 16.29 MiB | 17083358 |
| Possibly cached from state page             | 2.18 MiB  | 2288287  |

_How to read this:_ if a user opens detail **from the state page**, rows marked `yes` are usually already in browser cache, so additional transfer is mostly the `no` rows. If detail is opened directly (cold load), all rows may be transferred.

## `dist/` — build output (what Pages deploys)

_After temporarily moving `jedeschule-latest.csv` and `.pipeline/` aside (same as CI), `rm -rf dist`, `bun run build`, then restoring those paths._

**Source maps (`*.map`):** Totals, the extension table, and the largest-file list **exclude** JavaScript source maps. They are still written to `dist/` for debugging, but browsers do not load them during normal browsing — they may be fetched when DevTools (or similar) needs stack traces mapped to source. Those bytes are not treated as typical user-facing payload here.

| Category              | Size       | Bytes     |
| --------------------- | ---------- | --------- |
| Total (excl. `*.map`) | 114.68 MiB | 120246582 |
| Primary files         | 114.68 MiB | 120246582 |

_Omitted `_.map` on disk: 7.05 MiB (7390268 bytes).\*

### By extension

| Extension  | Size      | Bytes     |
| ---------- | --------- | --------- |
| `(none)`   | 0.02 MiB  | 17331     |
| `.css`     | 0.13 MiB  | 141122    |
| `.geojson` | 15.43 MiB | 16176681  |
| `.html`    | 0.00 MiB  | 1372      |
| `.js`      | 2.17 MiB  | 2280156   |
| `.json`    | 96.65 MiB | 101342078 |
| `.jsonl`   | 0.07 MiB  | 68402     |
| `.svg`     | 0.00 MiB  | 928       |
| `.woff2`   | 0.21 MiB  | 218512    |

### Largest files (top 18)

| Path                                           | Size     | Bytes   |
| ---------------------------------------------- | -------- | ------- |
| `datasets/NW/schools_matches_detail.json`      | 7.49 MiB | 7855763 |
| `datasets/BW/schools_matches_detail.json`      | 6.59 MiB | 6911749 |
| `datasets/BY/schools_matches_detail.json`      | 6.37 MiB | 6679577 |
| `datasets/NW/schools_matches_list_search.json` | 5.60 MiB | 5870182 |
| `datasets/BW/schools_matches_list_search.json` | 4.81 MiB | 5042372 |
| `datasets/BY/schools_matches_list_search.json` | 4.31 MiB | 4521808 |
| `datasets/NI/schools_matches_detail.json`      | 3.91 MiB | 4101480 |
| `datasets/NW/schools_osm_areas.json`           | 3.41 MiB | 3576664 |
| `datasets/NI/schools_matches_list_search.json` | 3.19 MiB | 3341999 |
| `datasets/BW/schools_official.geojson`         | 2.89 MiB | 3034040 |
| `datasets/NW/schools_official.geojson`         | 2.86 MiB | 2994185 |
| `datasets/HE/schools_matches_detail.json`      | 2.45 MiB | 2567718 |
| `datasets/SN/schools_matches_detail.json`      | 2.34 MiB | 2450222 |
| `datasets/NW/schools_matches_map.json`         | 2.25 MiB | 2364125 |
| `datasets/BY/schools_official.geojson`         | 2.23 MiB | 2340543 |
| `datasets/BY/schools_osm_areas.json`           | 2.03 MiB | 2129482 |
| `datasets/BW/schools_osm_areas.json`           | 2.00 MiB | 2095197 |
| `datasets/BW/schools_matches_map.json`         | 1.98 MiB | 2075113 |

## How to interpret

- **CI** downloads and processes large intermediates (CSV + national OSM GeoJSON); only a thin snapshot is committed, while generated per-Land files stay on the runner for the same job.
- **Users** receive the **`dist/`** payload; dataset transfer is mostly **per route / per Land**, not one monolithic download. **`dist/` metrics above ignore `*.map`** (see section note).
- Re-run `bun run report:data-impact` after data or code changes; use `bun run report:data-impact -- --no-build` to measure the current `dist/` without rebuilding.
- Track recurring cycles in `analysis/out/post-refactor-stability-window.md` and only add new optimization work for repeatedly observed bottlenecks.
