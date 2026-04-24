import { DATASET_FETCH_INIT, DATASET_QUERY_GC_MS, DATASET_QUERY_STALE_MS } from './cachePolicy'
import { nationalOfficialMetaUrl, nationalOsmMetaUrl, runsJsonlUrl, summaryJsonUrl } from './paths'
import { parseRunHistoryFileTextWithDiagnostics } from './runHistoryJsonl'
import {
  type PipelineSourceMeta,
  pipelineSourceMetaSchema,
  runRecordSchema,
  summaryFileSchema,
} from './schemas'
import { queryOptions } from '@tanstack/react-query'

/** Shared TanStack query options for datasets/summary.json */
export function summaryQueryOptions() {
  return queryOptions({
    queryKey: ['summary'] as const,
    queryFn: async () => {
      const r = await fetch(summaryJsonUrl(), DATASET_FETCH_INIT)
      if (!r.ok) throw new Error(String(r.status))
      return summaryFileSchema.parse(await r.json())
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}

/** Shared TanStack query options for datasets/status/runs.jsonl */
export function runsQueryOptions() {
  return queryOptions({
    queryKey: ['runs'] as const,
    queryFn: async () => {
      const r = await fetch(runsJsonlUrl(), DATASET_FETCH_INIT)
      if (!r.ok) throw new Error(String(r.status))
      const { runs: rawRuns, diagnostics: parseDiagnostics } =
        parseRunHistoryFileTextWithDiagnostics(await r.text())
      let schemaMismatches = 0
      const validRuns = rawRuns.flatMap((item) => {
        const parsed = runRecordSchema.safeParse(item)
        if (!parsed.success) schemaMismatches += 1
        return parsed.success ? [parsed.data] : []
      })
      return {
        runs: validRuns,
        droppedRuns: rawRuns.length - validRuns.length,
        droppedRunDiagnostics: {
          parseErrors: parseDiagnostics.parseErrors,
          schemaMismatches,
        },
      }
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}

type NationalMetaQueryData = {
  jedeschule: { present: false } | { present: true; data: PipelineSourceMeta }
  osm: { present: false } | { present: true; data: PipelineSourceMeta }
}

async function fetchNationalMeta(url: string): Promise<NationalMetaQueryData['jedeschule']> {
  const r = await fetch(url, DATASET_FETCH_INIT)
  if (!r.ok) return { present: false }
  const parsed = pipelineSourceMetaSchema.safeParse(await r.json())
  if (!parsed.success) return { present: false }
  return { present: true, data: parsed.data }
}

/** Shared query options for current national metadata snapshots. */
export function nationalPipelineMetaQueryOptions() {
  return queryOptions({
    queryKey: ['national-pipeline-meta'] as const,
    queryFn: async (): Promise<NationalMetaQueryData> => {
      const [jedeschule, osm] = await Promise.all([
        fetchNationalMeta(nationalOfficialMetaUrl()),
        fetchNationalMeta(nationalOsmMetaUrl()),
      ])
      return { jedeschule, osm }
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}
