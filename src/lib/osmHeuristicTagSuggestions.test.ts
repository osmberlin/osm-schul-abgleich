import {
  collectOsmHeuristicTagSuggestions,
  maproulettePriorityFromOsmHeuristic,
} from './osmHeuristicTagSuggestions'
import { describe, expect, it } from 'vitest'

describe('collectOsmHeuristicTagSuggestions', () => {
  it('suggests primary tags from OSM name without ref/operator', () => {
    const result = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Peter-Pan-Grundschule',
        website: 'https://example.de',
      },
    })
    expect(result.signalSource).toBe('name')
    expect(result.schoolFormRule).toBe('grundschule')
    expect(result.pendingTags).toEqual({
      school: 'primary',
      'isced:level': '1',
    })
    expect(result.pendingTags.ref).toBeUndefined()
    expect(result.pendingTags['operator:type']).toBeUndefined()
    expect(result.groups[0]?.title).toContain('OSM-Namen')
    expect(maproulettePriorityFromOsmHeuristic(result)).toBe('prio1')
  })

  it('uses URL when name has no form token (prio2)', () => {
    const result = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Schule am Park',
        website: 'https://www.meine-gesamtschule.de',
      },
    })
    expect(result.signalSource).toBe('url')
    expect(result.schoolFormRule).toBe('gesamtschule')
    expect(result.pendingTags.school).toBe('secondary')
    expect(maproulettePriorityFromOsmHeuristic(result)).toBe('prio2')
  })

  it('maps school:de when name/URL have no token', () => {
    const result = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Waldschule',
        'school:de': 'Grundschule',
      },
    })
    expect(result.signalSource).toBe('school:de')
    expect(result.pendingTags).toEqual({
      school: 'primary',
      'isced:level': '1',
    })
  })

  it('completes partial primary tags without inventing secondary isced', () => {
    const partial = collectOsmHeuristicTagSuggestions({
      osmTags: { amenity: 'school', 'isced:level': '1' },
    })
    expect(partial.signalSource).toBe('partial')
    expect(partial.pendingTags).toEqual({ school: 'primary' })
    expect(maproulettePriorityFromOsmHeuristic(partial)).toBe('prio2')

    const secondaryOnly = collectOsmHeuristicTagSuggestions({
      osmTags: { amenity: 'school', school: 'secondary' },
    })
    expect(secondaryOnly.pendingTags).toEqual({})
    expect(secondaryOnly.signalSource).toBeNull()
  })

  it('skips compound names', () => {
    const result = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Grund- und Hauptschule Beispiel',
      },
    })
    expect(result.pendingTags).toEqual({})
  })

  it('skips URL, school:de, and partial when the name is compound', () => {
    const fromUrl = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Grund- und Hauptschule Beispiel',
        website: 'https://www.grundschule-beispiel.de',
      },
    })
    expect(fromUrl.pendingTags).toEqual({})

    const fromSchoolDe = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Grundschule und Gymnasium Campus',
        'school:de': 'Grundschule',
      },
    })
    expect(fromSchoolDe.pendingTags).toEqual({})

    const fromPartial = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Grund- und Realschule Beispiel',
        'isced:level': '1',
      },
    })
    expect(fromPartial.pendingTags).toEqual({})
  })

  it('returns empty when already fully tagged for the heuristic', () => {
    const result = collectOsmHeuristicTagSuggestions({
      osmTags: {
        amenity: 'school',
        name: 'Grundschule Test',
        school: 'primary',
        'isced:level': '1',
      },
    })
    expect(result.pendingTags).toEqual({})
  })
})
