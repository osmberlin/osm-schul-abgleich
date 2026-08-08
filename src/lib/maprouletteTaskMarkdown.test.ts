import {
  buildMaprouletteOsmHeuristicTaskMarkdown,
  buildMaprouletteTaskMarkdown,
  resolveSchoolWebsiteHref,
  schoolWebsiteHref,
} from './maprouletteTaskMarkdown'
import { describe, expect, it } from 'vitest'

describe('schoolWebsiteHref', () => {
  it('adds https when scheme is missing', () => {
    expect(schoolWebsiteHref('schule.example.org')).toBe('https://schule.example.org')
  })

  it('keeps existing http(s) URLs', () => {
    expect(schoolWebsiteHref('https://schule.example.org/')).toBe('https://schule.example.org/')
  })
})

describe('resolveSchoolWebsiteHref', () => {
  it('prefers official website over OSM tags', () => {
    expect(
      resolveSchoolWebsiteHref({
        officialProperties: { website: 'https://amtlich.example/' },
        osmTags: { website: 'https://osm.example/' },
      }),
    ).toBe('https://amtlich.example/')
  })

  it('falls back to OSM contact:website', () => {
    expect(
      resolveSchoolWebsiteHref({
        officialProperties: null,
        osmTags: { 'contact:website': 'osm.example' },
      }),
    ).toBe('https://osm.example')
  })
})

describe('buildMaprouletteTaskMarkdown', () => {
  it('lists school website under Hilfsmittel when available', () => {
    const md = buildMaprouletteTaskMarkdown({
      stateKey: 'BE',
      schoolKey: 'match-BE-1',
      schoolName: 'Testschule',
      osmTypeId: 'way/4763894',
      suggestions: {
        groups: [],
        pendingTags: { ref: '03P11' },
      },
      officialProperties: { website: 'https://www.buergel-grundschule.de' },
      osmTags: { amenity: 'school' },
    })
    expect(md).toContain('## Hilfsmittel')
    expect(md).toContain(
      '* [Schulabgleich Detailseite](https://schulabgleich.osm-verkehrswende.org/bundesland/BE/schule/match-BE-1)',
    )
    expect(md).toContain('* [OpenStreetMap](https://www.openstreetmap.org/way/4763894)')
    expect(md).toContain('* [Website der Schule](https://www.buergel-grundschule.de)')
  })

  it('omits website line when neither source has one', () => {
    const md = buildMaprouletteTaskMarkdown({
      stateKey: 'BE',
      schoolKey: 'match-BE-1',
      schoolName: 'Testschule',
      osmTypeId: 'way/1',
      suggestions: { groups: [], pendingTags: { ref: 'x' } },
      officialProperties: {},
      osmTags: {},
    })
    expect(md).not.toContain('Website der Schule')
  })
})

describe('buildMaprouletteOsmHeuristicTaskMarkdown', () => {
  it('states OSM-only provenance and lists pending tags', () => {
    const md = buildMaprouletteOsmHeuristicTaskMarkdown({
      stateKey: 'BY',
      schoolKey: 'osm-BY-1',
      schoolName: 'Muster-Grundschule',
      osmTypeId: 'node/1',
      suggestions: {
        groups: [
          {
            kind: 'grundschule',
            title: 'Vorschlag aus OSM-Namen (Grundschule)',
            lead: 'Im OSM-Namen kommt „grundschule“ vor.',
            tags: [
              { key: 'school', value: 'primary' },
              { key: 'isced:level', value: '1' },
            ],
          },
        ],
        pendingTags: { school: 'primary', 'isced:level': '1' },
        signalSource: 'name',
        schoolFormRule: 'grundschule',
        matchedToken: 'grundschule',
      },
      osmTags: { name: 'Muster-Grundschule', website: 'https://gs.example.de' },
    })
    expect(md).toContain('nicht aus amtlichen Schuldaten')
    expect(md).toContain('Vorschlag aus OSM-Namen')
    expect(md).toContain('`school=primary`')
    expect(md).toContain('Website der Schule')
    expect(md).not.toContain('amtlichen Daten')
  })
})
