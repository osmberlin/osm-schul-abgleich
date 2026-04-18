import { de } from '../../i18n/de'

export type SchoolOsmWikiLink = {
  href: string
  label: string
}

const DEFAULT_WIKI_LINKS: readonly SchoolOsmWikiLink[] = [
  {
    href: 'https://wiki.openstreetmap.org/wiki/DE:Tag:amenity%3Dschool',
    label: 'Tag:amenity=school',
  },
  {
    href: 'https://wiki.openstreetmap.org/wiki/DE:Key:school',
    label: 'Key:school',
  },
  {
    href: 'https://wiki.openstreetmap.org/wiki/DE:Key:isced:level#Werte_f%C3%BCr_Deutschland',
    label: 'Key:isced:level',
  },
] as const

export function SchoolOsmTagWikiLinks({ links }: { links?: readonly SchoolOsmWikiLink[] }) {
  const wikiLinks = links ?? DEFAULT_WIKI_LINKS
  return (
    <p className="mt-3 text-sm text-zinc-300">
      {de.osm.schoolTagWikiLead}{' '}
      <span className="text-emerald-300">
        {wikiLinks.map((link, idx) => (
          <span key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer" className="underline">
              {link.label}
            </a>
            {idx < wikiLinks.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </p>
  )
}
