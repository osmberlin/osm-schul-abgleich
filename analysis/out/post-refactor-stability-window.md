# Post-refactor stability window

Use this file to track rebuild cycles before doing more structural optimization.

## How to run each cycle

1. Rebuild and regenerate metrics: `bun run report:data-impact`
2. Open key routes in browser (`/bundesland/{code}` then `/bundesland/{code}/schule/{schoolKey}`) and capture transferred/resource bytes from DevTools.
3. Append one row in the table below.
4. Optimize only if repeated cycles show a stable bottleneck.

## Cycle log

| Cycle        | Date (Berlin) | Git       | Report total static datasets | BW state route total | BW detail incremental | Network transferred/resources (example) | Notes                                                                  |
| ------------ | ------------- | --------- | ---------------------------- | -------------------- | --------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| 1 (baseline) | 2026-04-18    | `63a0142` | 99.99 MiB                    | 5.07 MiB             | 11.48 MiB             | ~4.6 MB / ~24 MB (observed)             | Baseline after route-aware split; CI sidecar compression step removed. |
