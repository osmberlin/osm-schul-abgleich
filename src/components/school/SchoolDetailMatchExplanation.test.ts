import { describe, expect, it } from 'vitest'
import { distanceMatchExplanationKey } from './SchoolDetailMatchExplanation'

const nominatim = { coord_source: 'nominatim' }

describe('distanceMatchExplanationKey', () => {
  it('uses nominatim copy for distance modes with nominatim coord_source', () => {
    expect(distanceMatchExplanationKey('distance', nominatim)).toBe(
      'matchExplanationDistanceNominatim',
    )
    expect(distanceMatchExplanationKey('distance_and_name', nominatim)).toBe(
      'matchExplanationDistanceAndNameNominatim',
    )
    expect(distanceMatchExplanationKey('distance_and_name_prefix', nominatim)).toBe(
      'matchExplanationDistanceAndNamePrefixNominatim',
    )
  })

  it('keeps surveyed-site copy without nominatim coord_source', () => {
    expect(distanceMatchExplanationKey('distance', { coord_source: 'land' })).toBe(
      'matchExplanationDistance',
    )
    expect(distanceMatchExplanationKey('distance_and_name', {})).toBe(
      'matchExplanationDistanceAndName',
    )
    expect(distanceMatchExplanationKey('distance_and_name_prefix', null)).toBe(
      'matchExplanationDistanceAndNamePrefix',
    )
  })

  it('does not remap name, website, address, or ref', () => {
    expect(distanceMatchExplanationKey('name', nominatim)).toBe(null)
    expect(distanceMatchExplanationKey('name_prefix', nominatim)).toBe(null)
    expect(distanceMatchExplanationKey('website', nominatim)).toBe(null)
    expect(distanceMatchExplanationKey('address', nominatim)).toBe(null)
    expect(distanceMatchExplanationKey('ref', nominatim)).toBe(null)
    expect(distanceMatchExplanationKey(undefined, nominatim)).toBe(null)
  })
})
