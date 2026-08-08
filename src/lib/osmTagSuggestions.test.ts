import {
  collectOsmTagSuggestions,
  maproulettePriorityFromPendingTags,
  pendingTagsFromSuggestSpecs,
} from './osmTagSuggestions'
import { describe, expect, it } from 'vitest'

describe('collectOsmTagSuggestions', () => {
  it('proposes primary school tags for Grundschule', () => {
    const { groups, pendingTags } = collectOsmTagSuggestions({
      officialId: 'BE-03P11',
      officialName: 'Grundschule Beispiel',
      officialProperties: { school_type: 'Grundschule' },
      osmTags: { amenity: 'school' },
    })
    expect(groups.some((g) => g.kind === 'grundschule')).toBe(true)
    expect(pendingTags.school).toBe('primary')
    expect(pendingTags['isced:level']).toBe('1')
    expect(maproulettePriorityFromPendingTags(pendingTags)).toBe('prio1')
  })

  it('skips already-set primary tags in pendingTags but keeps UI group', () => {
    const { groups, pendingTags } = collectOsmTagSuggestions({
      officialId: 'BE-03P11',
      officialName: 'Grundschule Beispiel',
      officialProperties: { school_type: 'Grundschule' },
      osmTags: { amenity: 'school', school: 'primary', 'isced:level': '1', ref: '03P11' },
    })
    expect(groups.some((g) => g.kind === 'grundschule')).toBe(true)
    expect(pendingTags.school).toBeUndefined()
    expect(pendingTags['isced:level']).toBeUndefined()
    expect(pendingTags.ref).toBeUndefined()
  })

  it('proposes ref from official id when usable', () => {
    const { pendingTags } = collectOsmTagSuggestions({
      officialId: 'BE-03P11',
      officialName: 'Schule',
      officialProperties: {},
      osmTags: { amenity: 'school' },
    })
    expect(pendingTags.ref).toBe('03P11')
  })

  it('does not propose ref for fallback official ids', () => {
    const { groups, pendingTags } = collectOsmTagSuggestions({
      officialId: 'BW-FB-UNKNOWN',
      officialName: 'Schule',
      officialProperties: {},
      osmTags: {},
    })
    expect(groups.some((g) => g.kind === 'ref')).toBe(false)
    expect(pendingTags.ref).toBeUndefined()
  })

  it('proposes operator:type for öffentliche Trägerschaft', () => {
    const { pendingTags } = collectOsmTagSuggestions({
      officialId: 'BE-10K09',
      officialName: 'Schule',
      officialProperties: {
        legal_status: 'öffentlich',
        provider: 'Stadt Berlin',
      },
      osmTags: { amenity: 'school' },
    })
    expect(pendingTags['operator:type']).toBe('government')
    expect(pendingTags.operator).toBe('Stadt Berlin')
  })

  it('for Gesamtschule pendingTags keeps a single isced:level=2;3', () => {
    const { groups, pendingTags } = collectOsmTagSuggestions({
      officialId: 'BE-10K09',
      officialName: 'Gesamtschule Beispiel',
      officialProperties: { school_type: 'Gesamtschule' },
      osmTags: { amenity: 'school' },
    })
    const form = groups.find((g) => g.kind === 'gesamtschule')
    expect(form?.tags.filter((t) => t.key === 'isced:level').length).toBe(2)
    expect(pendingTags['isced:level']).toBe('2;3')
    expect(Object.keys(pendingTags).filter((k) => k === 'isced:level')).toHaveLength(1)
  })

  it('does not overwrite existing isced 2 with 2;3', () => {
    const pending = pendingTagsFromSuggestSpecs({ 'isced:level': '2' }, [
      { key: 'school', value: 'secondary' },
      { key: 'isced:level', value: '2;3' },
      { key: 'isced:level', value: '2' },
    ])
    expect(pending['isced:level']).toBeUndefined()
    expect(pending.school).toBe('secondary')
  })

  it('assigns prio2 when only ref is pending', () => {
    expect(maproulettePriorityFromPendingTags({ ref: '03P11' })).toBe('prio2')
  })

  it('assigns prio3 for operator-only', () => {
    expect(maproulettePriorityFromPendingTags({ 'operator:type': 'government' })).toBe('prio3')
  })
})
