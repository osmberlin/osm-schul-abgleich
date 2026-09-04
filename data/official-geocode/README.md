# Official Nominatim overlay

Länder such as Niedersachsen publish school **addresses** but not official site coordinates. Matching those rows used to rely on name, website, or address only. This folder holds a one-shot Nominatim geocode used as an extra geometry overlay so those schools can also match by distance.

## How it is built

1. **Geocode (Nominatim, not CI).** Query Nominatim at most once per second, with a local cache and a User-Agent / policy URL that follows [OSMF Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/). Do **not** run this in CI or on a nightly schedule, and do not hammer the public service.
2. **Filter (2 km).** Keep a Nominatim point unless a **baseline** match (official GeoJSON as downloaded, **no** overlay) already paired that school with OSM via `name`, `name_prefix`, `website`, or `address`, **and** the Nominatim pin is more than **2000 m** from that OSM centroid. Everything else is kept (no baseline match; `ref` / `distance` / similar; or a fallback match within 2 km).
3. **Pipeline overlay.** The match pipeline overlays **used** `points.json` onto official features that still have null geometry.

Nominatim writes **all** `ok` coordinates into `points.json`. **Always run the filter before commit**; the filter overwrites `points.json` with used-only points.

```bash
# Re-run the 2 km filter only (uses cache.ndjson if present; a few minutes, nationwide baseline match)
bun run analysis:official-geocode:filter

# Full Nominatim geocode — do not run unless you intend to hit Nominatim again
bun run analysis:official-geocode:nominatim
```

## Files

| File                                     | Role                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `points.json`                            | Used overlay only: official id → `[lon, lat]`. Pretty JSON, sorted keys.                     |
| `discarded.json`                         | Rejected Nominatim pins (reason, baseline OSM partner, distance).                            |
| `meta.json`                              | Geocode counts per Land (`ok` / `not_found` / `rejected`) plus filter used/discarded counts. |
| `analysis/official-geocode/cache.ndjson` | Gitignored Nominatim cache (last write per id wins). Prefer this when re-filtering.          |

If the cache file is missing, the filter merges the current `points.json` with `discarded.json` so previously discarded ids are still considered.

## Niedersachsen: ~76 “lost” close matches

When another official’s pin already claims an OSM object, distance-first matching can reassign that OSM school. Filtering official A’s overlay does **not** give A that OSM partner back. We accept those ~76 NI cases at ≤150 m. Net Niedersachsen matching is still strongly positive.

## Sachsen-Anhalt dual feed

ST has two directory rows for many sites: `ST-ARC*` (ArcGIS, coordinates, often no street) and `ST-1xxxxx` (directory, address, no coordinates). There are on the order of **239** name+city overlaps. This filter does **not** auto-discard those pairs. Later `match_ambiguous` in ST is expected, not a Nominatim bug.

## Schleswig-Holstein

Some SH geocodes land on a **street centroid**. They still carry `coord_source: nominatim` only; they are not official Land coordinates.

## Licence

Geocodes come from OpenStreetMap / Nominatim and are **ODbL**. Attribution: © OpenStreetMap contributors. These points are **not** official Land school-site coordinates.
