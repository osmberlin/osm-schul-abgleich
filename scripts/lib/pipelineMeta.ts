import { z } from 'zod'

/** Aligned meta for JedeSchule and OSM national downloads (Status UI + freshness gate). */
export const pipelineSourceMetaSchema = z.object({
  pipelineStep: z.string(),
  generatedAt: z.string(),
  sourceUrl: z.string().optional(),
  ok: z.boolean(),
  errorMessage: z.string().optional(),
  sourceMode: z.enum(['fresh', 'reused', 'failed']).optional(),
  sourceModeReason: z.string().optional(),
  /** OSM-specific (optional on JedeSchule side) */
  overpassResponseTimestamp: z.string().optional(),
  interpreterUrl: z.string().optional(),
  /** JedeSchule CSV: response headers + content signals (optional on OSM side) */
  httpLastModified: z.string().optional(),
  httpEtag: z.string().optional(),
  csvSha256: z.string().optional(),
  csvMaxUpdateTimestamp: z.string().optional(),
  /** True if ETag, Last-Modified, content hash, or max row timestamp changed vs previous successful meta */
  upstreamDatasetChanged: z.boolean().optional(),
})

export type PipelineSourceMeta = z.infer<typeof pipelineSourceMetaSchema>
