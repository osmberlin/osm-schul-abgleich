import { describe, expect, it } from 'vitest'
import { schoolsMatchesDetailEnvelopeSchema } from '../../src/lib/schemas'
import { hostedMaprouletteMetaSchema } from './hostedMaprouletteMeta'

describe('schoolsMatchesDetailEnvelopeSchema', () => {
  it('accepts an object map and rejects arrays', () => {
    expect(schoolsMatchesDetailEnvelopeSchema.safeParse({ 'match-1': { key: 'x' } }).success).toBe(
      true,
    )
    expect(schoolsMatchesDetailEnvelopeSchema.safeParse([{ key: 'x' }]).success).toBe(false)
    expect(schoolsMatchesDetailEnvelopeSchema.safeParse(null).success).toBe(false)
  })
})

describe('hostedMaprouletteMetaSchema', () => {
  it('requires taskCount and generatedAt', () => {
    expect(
      hostedMaprouletteMetaSchema.safeParse({
        taskCount: 12,
        generatedAt: '2026-09-04T09:29:02.234Z',
      }).success,
    ).toBe(true)
    expect(hostedMaprouletteMetaSchema.safeParse({ generatedAt: 'x' }).success).toBe(false)
    expect(
      hostedMaprouletteMetaSchema.safeParse({ taskCount: '12', generatedAt: 'x' }).success,
    ).toBe(false)
  })
})
