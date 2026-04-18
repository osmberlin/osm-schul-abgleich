import { OSM_SCHOOL_NAME_TAGS_IN_ORDER } from './osmNameMatchTags'
import { z } from 'zod'

const schoolKindDeSourceSchema = z.enum([
  'school:de',
  'mapped',
  'passthrough',
  'excluded',
  'unmapped',
])

export const jedeschuleSchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  school_type: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  legal_status: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  update_timestamp: z.string().nullable().optional(),
})

export const jedeschuleStatSchema = z.object({
  state: z.string(),
  count: z.number(),
  last_updated: z.string(),
})

const matchCategorySchema = z.enum([
  'matched',
  'official_only',
  'osm_only',
  'match_ambiguous',
  'official_no_coord',
])

const ambiguousOfficialSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  properties: z.record(z.string(), z.unknown()),
})

export const schoolsMatchRowSchema = z
  .object({
    key: z.string(),
    category: matchCategorySchema.optional(),
    matchCategory: matchCategorySchema.optional(),
    matchMode: z
      .enum([
        'distance',
        'distance_and_name',
        'distance_and_name_prefix',
        'name',
        'name_prefix',
        'website',
        'address',
        'ref',
      ])
      .optional(),
    nameMatchVariant: z.enum(['exact', 'prefix']).optional(),
    officialId: z.string().nullable(),
    officialName: z.string().nullable(),
    officialProperties: z.record(z.string(), z.unknown()).nullable().optional(),
    osmId: z.string().nullable(),
    osmType: z.enum(['way', 'relation', 'node']).nullable(),
    hasArea: z.boolean().optional(),
    /** OSM geometry centroid; Abstand bezieht sich auf diesen Punkt. */
    osmCentroidLon: z.number().nullable().optional(),
    osmCentroidLat: z.number().nullable().optional(),
    distanceMeters: z.number().nullable(),
    osmName: z.string().nullable(),
    osmTags: z.record(z.string(), z.string()).nullable().optional(),
    ambiguousOfficialIds: z.array(z.string()).optional(),
    /** Amtliche Stammdaten der Kandidaten zum Match-Zeitpunkt (für Detailseite ohne Bundesland-GeoJSON). */
    ambiguousOfficialSnapshots: z.array(ambiguousOfficialSnapshotSchema).optional(),
    matchedByOsmNameNormalized: z.string().optional(),
    matchedByOsmNameTag: z.enum(OSM_SCHOOL_NAME_TAGS_IN_ORDER).optional(),
    matchedByWebsiteNormalized: z.string().optional(),
    matchedByAddressNormalized: z.string().optional(),
    matchedByRefNormalized: z.string().optional(),
    pipelineState: z.string().optional(),
    schoolKindDe: z.string().nullable().optional(),
    schoolKindDeSource: schoolKindDeSourceSchema.nullable().optional(),
  })
  .superRefine((row, ctx) => {
    if (!row.category && !row.matchCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['matchCategory'],
        message: 'Either "matchCategory" or "category" is required.',
      })
    }
  })
  .transform((row) => {
    const resolved = (row.matchCategory ?? row.category)!
    return {
      ...row,
      category: resolved,
      matchCategory: resolved,
    }
  })

export const schoolsMatchMapRowSchema = z
  .object({
    key: z.string(),
    category: matchCategorySchema.optional(),
    matchCategory: matchCategorySchema.optional(),
    officialId: z.string().nullable(),
    officialName: z.string().nullable(),
    officialLon: z.number().nullable().optional(),
    officialLat: z.number().nullable().optional(),
    osmId: z.string().nullable(),
    osmType: z.enum(['way', 'relation', 'node']).nullable(),
    osmCentroidLon: z.number().nullable().optional(),
    osmCentroidLat: z.number().nullable().optional(),
    osmName: z.string().nullable(),
  })
  .superRefine((row, ctx) => {
    if (!row.category && !row.matchCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['matchCategory'],
        message: 'Either "matchCategory" or "category" is required.',
      })
    }
  })
  .transform((row) => {
    const resolved = (row.matchCategory ?? row.category)!
    return {
      ...row,
      category: resolved,
      matchCategory: resolved,
    }
  })

export const schoolsMatchesMapFileSchema = z.array(schoolsMatchMapRowSchema)
export const schoolsMatchesDetailFileSchema = z.array(schoolsMatchRowSchema)
export const schoolsMatchesDetailByKeyFileSchema = z.record(z.string(), schoolsMatchRowSchema)

/**
 * Backward-compatible alias for existing full/detail match file shape.
 * Prefer `schoolsMatchesDetailFileSchema`.
 */
export const schoolsMatchesFileSchema = schoolsMatchesDetailFileSchema

export type SchoolsMatchRow = z.infer<typeof schoolsMatchRowSchema>
export type SchoolsMatchMapRow = z.infer<typeof schoolsMatchMapRowSchema>

export const stateOfficialPointsFileSchema = z.record(
  z.string(),
  z.tuple([z.number().finite(), z.number().finite()]),
)

const stateSummarySchema = z.object({
  code: z.string(),
  osmSource: z.enum(['live', 'cached', 'missing']),
  overpassError: z.string().optional(),
  osmSnapshotAt: z.string().optional(),
  overpassQueriedAt: z.string().optional(),
  counts: z.object({
    matched: z.number(),
    official_only: z.number(),
    osm_only: z.number(),
    ambiguous: z.number(),
    official_no_coord: z.number(),
  }),
  jedeschuleLastUpdated: z.string().optional(),
})

export const summaryFileSchema = z.object({
  generatedAt: z.string(),
  pipelineVersion: z.number(),
  jedeschuleCsvSource: z.string().optional(),
  states: z.array(stateSummarySchema),
})

const runStateEntrySchema = z.object({
  code: z.string(),
  osmSource: z.enum(['live', 'cached', 'missing']).optional(),
  overpassError: z.string().optional(),
  osmSnapshotAt: z.string().optional(),
  counts: stateSummarySchema.shape.counts.optional(),
})

export const runRecordSchema = z
  .object({
    startedAt: z.string(),
    finishedAt: z.string(),
    durationMs: z.number(),
    gitSha: z.string().optional(),
    runContext: z.string().optional(),
    overallOk: z.boolean(),
    errors: z.array(z.string()),
    states: z.array(runStateEntrySchema).optional(),
    // Legacy alias from older snapshots
    lands: z.array(runStateEntrySchema).optional(),
    matchSkipped: z.boolean().optional(),
    matchSkipReason: z.string().optional(),
    downloads: z
      .object({
        jedeschule: z.object({
          ok: z.boolean(),
          generatedAt: z.string().optional(),
          errorMessage: z.string().optional(),
          upstreamDatasetChanged: z.boolean().optional(),
          sourceMode: z.enum(['fresh', 'reused', 'failed']).optional(),
          sourceModeReason: z.string().optional(),
        }),
        osm: z.object({
          ok: z.boolean(),
          generatedAt: z.string().optional(),
          errorMessage: z.string().optional(),
          sourceMode: z.enum(['fresh', 'reused', 'failed']).optional(),
          sourceModeReason: z.string().optional(),
        }),
      })
      .optional(),
  })
  .transform((row) => ({
    ...row,
    states: row.states ?? row.lands ?? [],
  }))

export const runsFileSchema = z.object({
  runs: z.array(runRecordSchema),
})

/** National download meta (`schools_*_de.meta.json`) — aligned JedeSchule ↔ OSM. */
export const pipelineSourceMetaSchema = z.object({
  pipelineStep: z.string(),
  generatedAt: z.string(),
  sourceUrl: z.string().optional(),
  ok: z.boolean(),
  errorMessage: z.string().optional(),
  sourceMode: z.enum(['fresh', 'reused', 'failed']).optional(),
  sourceModeReason: z.string().optional(),
  overpassResponseTimestamp: z.string().optional(),
  interpreterUrl: z.string().optional(),
  httpLastModified: z.string().optional(),
  httpEtag: z.string().optional(),
  csvSha256: z.string().optional(),
  csvMaxUpdateTimestamp: z.string().optional(),
  upstreamDatasetChanged: z.boolean().optional(),
})

export type PipelineSourceMeta = z.infer<typeof pipelineSourceMetaSchema>
