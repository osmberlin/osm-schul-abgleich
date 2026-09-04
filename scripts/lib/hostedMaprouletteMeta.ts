import { z } from 'zod'

/** Hosted `*.meta.json` written by the pipeline (taskCount + generatedAt). */
export const hostedMaprouletteMetaSchema = z.object({
  taskCount: z.number(),
  generatedAt: z.string(),
})
