/**
 * Static datasets change only on snapshot deploys. Prefer cache reuse during
 * normal navigation and background-refresh on a reasonable cadence.
 */
export const DATASET_QUERY_STALE_MS = 10 * 60 * 1000
export const DATASET_QUERY_GC_MS = 30 * 60 * 1000

export const DATASET_FETCH_INIT: RequestInit = {
  cache: 'force-cache',
}
