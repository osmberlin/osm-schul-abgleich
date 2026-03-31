import { z } from 'zod'
import { OSM_SCHOOL_NAME_TAGS_IN_ORDER } from './osmNameMatchTags'

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

const matchCategorySchema = z.enum(['matched', 'official_only', 'osm_only', 'match_ambiguous'])

const ambiguousOfficialSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  properties: z.record(z.string(), z.unknown()),
})

export const schoolsMatchRowSchema = z.object({
  key: z.string(),
  category: matchCategorySchema,
  matchMode: z.enum(['distance', 'distance_and_name', 'name']).optional(),
  officialId: z.string().nullable(),
  officialName: z.string().nullable(),
  officialProperties: z.record(z.string(), z.unknown()).nullable().optional(),
  osmId: z.string().nullable(),
  osmType: z.enum(['way', 'relation', 'node']).nullable(),
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
  pipelineLand: z.string().optional(),
})

export const schoolsMatchesFileSchema = z.array(schoolsMatchRowSchema)

const landSummarySchema = z.object({
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
  lands: z.array(landSummarySchema),
})

const runLandEntrySchema = z.object({
  code: z.string(),
  osmSource: z.enum(['live', 'cached', 'missing']).optional(),
  overpassError: z.string().optional(),
  osmSnapshotAt: z.string().optional(),
  counts: landSummarySchema.shape.counts.optional(),
})

export const runRecordSchema = z.object({
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number(),
  gitSha: z.string().optional(),
  overallOk: z.boolean(),
  errors: z.array(z.string()),
  lands: z.array(runLandEntrySchema),
  matchSkipped: z.boolean().optional(),
  matchSkipReason: z.string().optional(),
  downloads: z
    .object({
      jedeschule: z.object({
        ok: z.boolean(),
        generatedAt: z.string().optional(),
        errorMessage: z.string().optional(),
        upstreamDatasetChanged: z.boolean().optional(),
      }),
      osm: z.object({
        ok: z.boolean(),
        generatedAt: z.string().optional(),
        errorMessage: z.string().optional(),
      }),
    })
    .optional(),
})

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
  overpassResponseTimestamp: z.string().optional(),
  interpreterUrl: z.string().optional(),
  httpLastModified: z.string().optional(),
  httpEtag: z.string().optional(),
  csvSha256: z.string().optional(),
  csvMaxUpdateTimestamp: z.string().optional(),
  upstreamDatasetChanged: z.boolean().optional(),
})

export type PipelineSourceMeta = z.infer<typeof pipelineSourceMetaSchema>
