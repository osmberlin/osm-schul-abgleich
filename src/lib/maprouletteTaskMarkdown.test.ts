import { describe, expect, it } from 'vitest'
import {
  buildMaprouletteCreateSchoolTaskMarkdown,
  buildMaprouletteOsmHeuristicTaskMarkdown,
  buildMaprouletteTaskMarkdown,
  resolveSchoolWebsiteHref,
  schoolWebsiteHref,
} from './maprouletteTaskMarkdown'
import { collectOfficialCreateTags } from './officialCreateTags'

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
  it('uses compact official layout with website and detail links under CTA', () => {
    const md = buildMaprouletteTaskMarkdown({
      stateKey: 'BE',
      schoolKey: 'match-BE-1',
      schoolName: 'Testschule',
      osmTypeId: 'way/4763894',
      suggestions: {
        groups: [
          {
            kind: 'gymnasium',
            title: 'Vorschlag aus amtlichen Daten (Gymnasium)',
            lead: 'unused in MR',
            tags: [
              { key: 'school', value: 'secondary' },
              { key: 'isced:level', value: '2;3' },
            ],
          },
          {
            kind: 'oeffentlicheTraegerschaft',
            title: 'Vorschlag aus amtlichen Daten (in öffentlicher Trägerschaft)',
            lead: 'unused',
            tags: [{ key: 'operator:type', value: 'government' }],
          },
        ],
        pendingTags: {
          school: 'secondary',
          'isced:level': '2;3',
          'operator:type': 'government',
        },
      },
      officialProperties: { website: 'https://www.buergel-grundschule.de' },
      osmTags: { amenity: 'school' },
    })
    expect(md).toContain('## Testschule, Berlin')
    expect(md).toContain(
      'Auf Basis der amtlichen Daten haben wir diese Vorschläge abgeleitet. Prüfe sie und übernehme sie dann, wenn sie plausibel sind.',
    )
    expect(md).toContain('* [Zur Website der Schule.](https://www.buergel-grundschule.de)')
    expect(md).toContain(
      '* [Zur Detailseite im Schulabgleich.](https://schulabgleich.osm-verkehrswende.org/bundesland/BE/schule/match-BE-1)',
    )
    expect(md).toContain('### Als "Gymnasium" taggen')
    expect(md).toContain('### Als "in öffentlicher Trägerschaft" taggen')
    expect(md).toContain('school=secondary')
    expect(md).toContain('isced:level=2;3')
    expect(md).toContain('operator:type=government')
    expect(md).not.toContain('## Hilfsmittel')
    expect(md).not.toContain('OpenStreetMap')
    expect(md).not.toContain('way/4763894')
    expect(md).not.toContain('Vorschlag aus amtlichen Daten')
  })

  it('omits website line when neither source has one', () => {
    const md = buildMaprouletteTaskMarkdown({
      stateKey: 'BE',
      schoolKey: 'match-BE-1',
      schoolName: 'Testschule',
      osmTypeId: 'way/1',
      suggestions: {
        groups: [
          {
            kind: 'ref',
            title: 'Vorschlag aus amtlichen Daten (ref)',
            lead: 'unused',
            tags: [{ key: 'ref', value: 'x' }],
          },
        ],
        pendingTags: { ref: 'x' },
      },
      officialProperties: {},
      osmTags: {},
    })
    expect(md).not.toContain('Zur Website der Schule')
    expect(md).toContain('Zur Detailseite im Schulabgleich')
    expect(md).toContain('### Diese offizielle Referenz-ID taggen')
    expect(md).toContain('Eine eindeutige `ref` macht den Datenabgleich bedeutend einfacher.')
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

describe('buildMaprouletteCreateSchoolTaskMarkdown', () => {
  it('uses compact layout aligned with official Tag Fix', () => {
    const create = collectOfficialCreateTags({
      officialId: 'BE-03P11',
      officialName: 'Grundschule Test',
      officialProperties: {
        school_type: 'Grundschule',
        address: 'Am Park 12-14',
        city: 'Berlin',
        zip: '10115',
        website: 'https://gs.example.de',
      },
    })
    expect(create.ok).toBe(true)
    if (!create.ok) return

    const md = buildMaprouletteCreateSchoolTaskMarkdown({
      stateKey: 'BE',
      schoolKey: 'official-BE-03P11',
      create,
      officialProperties: {
        school_type: 'Grundschule',
        website: 'https://gs.example.de',
      },
    })
    expect(md).toContain('## Grundschule Test, Berlin')
    expect(md).toContain('fehlt aber noch in OSM')
    expect(md).toContain('* [Zur Website der Schule.](https://gs.example.de)')
    expect(md).toContain(
      '* [Zur Detailseite im Schulabgleich.](https://schulabgleich.osm-verkehrswende.org/bundesland/BE/schule/official-BE-03P11)',
    )
    expect(md).toContain('### Vorgeschlagene Tags')
    expect(md).toContain('amenity=school')
    expect(md).toContain('school=primary')
    expect(md).toContain('### Adresse (Hinweis)')
    expect(md).toContain('Am Park 12-14')
    expect(md).not.toContain('## Hilfsmittel')
    expect(md).not.toContain('openstreetmap.org')
    expect(md).not.toContain('`amenity=school`')
  })
})
