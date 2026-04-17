import { de } from '../../i18n/de'
import { JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY } from '../../lib/jedeschuleDuplicateGroup'
import { comparePropertySections, normalizeAddressCompareString } from '../../lib/propertyCompare'
import type { ReactNode } from 'react'

function websiteHref(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) return `https:${t}`
  return `https://${t}`
}

function renderTagValueForKey(key: string, value: string): ReactNode {
  if (key !== 'website') return value
  const href = websiteHref(value)
  if (!href) return value
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all text-sky-400 underline underline-offset-2 hover:text-sky-300"
    >
      {value}
    </a>
  )
}

function officialPropsForCompare(
  official: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!official) return official
  const { [JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY]: _dup, ...rest } = official
  return rest
}

/** One OSM tag per list item: inline `key` + sr-only `=` + `value`. */
function ComparePropertyItem({
  listClassName,
  tagKey,
  value,
  keyClassName,
}: {
  listClassName: string
  tagKey: string
  value: ReactNode
  keyClassName: string
}) {
  return (
    <ul className={listClassName ? `m-0 list-none p-0 ${listClassName}` : 'm-0 list-none p-0'}>
      <li className="m-0 min-w-0 text-sm leading-normal break-words">
        <span className={`inline font-mono text-xs leading-normal ${keyClassName} mr-1.5`}>
          {tagKey}
        </span>
        <span className="sr-only">=</span>
        <span className="inline min-w-0 text-zinc-200">{value}</span>
      </li>
    </ul>
  )
}

export function SchoolDetailCompareBody({
  official,
  osm,
  officialIdForHeader,
  osmTypeForHeader,
  osmIdForHeader,
}: {
  official: Record<string, unknown> | null | undefined
  osm: Record<string, string> | null | undefined
  officialIdForHeader: string | null
  osmTypeForHeader: 'way' | 'relation' | 'node' | null
  osmIdForHeader: string | null
}) {
  const { both, onlyO, onlyS, compareGroups } = comparePropertySections(
    officialPropsForCompare(official),
    osm,
  )
  const bothRows = [...both]
    .filter(([k]) => k !== 'id')
    .sort(([a], [b]) => {
      const aName = a === 'name'
      const bName = b === 'name'
      if (aName && !bName) return -1
      if (!aName && bName) return 1
      return a.localeCompare(b, 'de')
    })
  const nameRows = bothRows.filter(([k]) => k === 'name')
  const nonNameBothRows = bothRows.filter(([k]) => k !== 'name')
  const osmRefLabel =
    osmTypeForHeader && osmIdForHeader ? `${osmTypeForHeader}/${osmIdForHeader}` : null
  const hasCommonRows = bothRows.length > 0 || compareGroups.length > 0

  return (
    <article aria-labelledby="school-detail-compare-both-heading">
      <section aria-labelledby="school-detail-compare-both-heading">
        <h2 id="school-detail-compare-both-heading" className="mb-3 font-semibold text-zinc-100">
          {de.detail.keysBoth}
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <header>
            <div className="border-b border-zinc-700 bg-zinc-900/50 px-2.5 py-1.5 text-xs md:hidden">
              <p className="leading-snug font-semibold tracking-wide">
                <span className="text-amber-200">
                  {de.detail.official}
                  {officialIdForHeader ? (
                    <>
                      {' \u00B7 '}
                      <span className="font-mono font-normal">{officialIdForHeader}</span>
                    </>
                  ) : null}
                </span>
                {officialIdForHeader && osmRefLabel ? (
                  <span aria-hidden className="text-zinc-400">
                    {' '}
                    {'\u00B7'}{' '}
                  </span>
                ) : null}
                <span className="text-blue-300">
                  {de.detail.osm}
                  {osmRefLabel ? (
                    <>
                      {' \u00B7 '}
                      <span className="font-mono font-normal">{osmRefLabel}</span>
                    </>
                  ) : null}
                </span>
              </p>
            </div>
            <div className="hidden grid-cols-2 gap-0 border-b border-zinc-700 bg-zinc-900/50 md:grid">
              <div className="border-r border-zinc-700 bg-amber-950/35 px-3 py-2 text-xs font-semibold tracking-wide text-amber-200">
                {de.detail.official}
                {officialIdForHeader ? (
                  <>
                    {' \u00B7 '}
                    <span className="font-mono font-normal">{officialIdForHeader}</span>
                  </>
                ) : null}
              </div>
              <div className="bg-blue-950/35 px-3 py-2 text-xs font-semibold tracking-wide text-blue-300">
                {de.detail.osm}
                {osmRefLabel ? (
                  <>
                    {' \u00B7 '}
                    <span className="font-mono font-normal">{osmRefLabel}</span>
                  </>
                ) : null}
              </div>
            </div>
          </header>
          {!hasCommonRows ? (
            <p className="p-2 text-sm text-zinc-400 sm:p-3">—</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {nameRows.map(([k, o, s]) => (
                <div key={k} className="grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
                  <ComparePropertyItem
                    listClassName="md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3"
                    tagKey={k}
                    keyClassName="text-amber-200"
                    value={renderTagValueForKey(k, o)}
                  />
                  <ComparePropertyItem
                    listClassName="md:bg-blue-950/15 md:p-3"
                    tagKey={k}
                    keyClassName="text-blue-300"
                    value={renderTagValueForKey(k, s)}
                  />
                </div>
              ))}
              {compareGroups.map((group) => {
                if (group.kind === 'address') {
                  const normalizedOfficial = group.officialValue
                    ? normalizeAddressCompareString(group.officialValue)
                    : null
                  const isMatch =
                    normalizedOfficial != null && group.compareTargets.includes(normalizedOfficial)
                  const rowTone =
                    !isMatch && normalizedOfficial != null && group.compareTargets.length > 0
                      ? 'border-l-2 border-amber-500/40'
                      : ''
                  return (
                    <div
                      key={`${group.kind}-${group.officialKey}`}
                      className={`grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0 ${rowTone}`}
                    >
                      <ComparePropertyItem
                        listClassName="md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3"
                        tagKey={group.officialKey}
                        keyClassName="text-amber-200"
                        value={group.officialValue ?? '—'}
                      />
                      <div className="space-y-1 md:bg-blue-950/15 md:p-3">
                        {group.osmKeys.map((k) => (
                          <ComparePropertyItem
                            key={`${group.kind}-${k}`}
                            listClassName=""
                            tagKey={k}
                            keyClassName="text-blue-300"
                            value={group.osmValues[k] ?? '—'}
                          />
                        ))}
                      </div>
                    </div>
                  )
                }
                if (group.kind === 'grundschule') {
                  const rowTone = group.isEquivalentMatch ? '' : 'border-l-2 border-amber-500/40'
                  return (
                    <div
                      key={`${group.kind}-${group.officialKey}`}
                      className={`grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0 ${rowTone}`}
                    >
                      <ComparePropertyItem
                        listClassName="md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3"
                        tagKey={group.officialKey}
                        keyClassName="text-amber-200"
                        value={group.officialValue ?? '—'}
                      />
                      <div className="space-y-1 md:bg-blue-950/15 md:p-3">
                        {group.osmKeys.map((k) => (
                          <ComparePropertyItem
                            key={`${group.kind}-${k}`}
                            listClassName=""
                            tagKey={k}
                            keyClassName="text-blue-300"
                            value={group.osmValues[k] ?? '—'}
                          />
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })}
              {nonNameBothRows.map(([k, o, s]) => (
                <div key={k} className="grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
                  <ComparePropertyItem
                    listClassName="md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3"
                    tagKey={k}
                    keyClassName="text-amber-200"
                    value={renderTagValueForKey(k, o)}
                  />
                  <ComparePropertyItem
                    listClassName="md:bg-blue-950/15 md:p-3"
                    tagKey={k}
                    keyClassName="text-blue-300"
                    value={renderTagValueForKey(k, s)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <nav aria-label={de.detail.compareExclusiveSectionsNavAria} className="sr-only">
        <ul>
          <li>
            <a href="#school-detail-compare-official-only-heading">{de.detail.officialOnly}</a>
          </li>
          <li>
            <a href="#school-detail-compare-osm-only-heading">{de.detail.osmOnly}</a>
          </li>
        </ul>
      </nav>

      <section className="mt-10 grid gap-8 md:grid-cols-2 md:gap-10">
        <section aria-labelledby="school-detail-compare-official-only-heading">
          <h2
            id="school-detail-compare-official-only-heading"
            className="mb-3 font-semibold text-zinc-100"
          >
            {de.detail.officialOnly}
          </h2>
          {onlyO.length === 0 ? (
            <p className="text-zinc-400">—</p>
          ) : (
            <ul className="m-0 list-none p-0 text-sm">
              {onlyO.map(([k, v]) => (
                <li key={k} className="m-0 border-b border-zinc-800 py-1.5 sm:py-2">
                  <span className="mr-1.5 inline font-mono text-xs leading-normal text-amber-200">
                    {k}
                  </span>
                  <span className="sr-only">=</span>
                  <span className="inline min-w-0 text-sm leading-normal break-words text-zinc-200">
                    {renderTagValueForKey(k, v)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="school-detail-compare-osm-only-heading">
          <h2
            id="school-detail-compare-osm-only-heading"
            className="mb-3 font-semibold text-zinc-100"
          >
            {de.detail.osmOnly}
          </h2>
          {onlyS.length === 0 ? (
            <p className="text-zinc-400">—</p>
          ) : (
            <ul className="m-0 list-none p-0 text-sm">
              {onlyS.map(([k, v]) => (
                <li key={k} className="m-0 border-b border-zinc-800 py-1.5 sm:py-2">
                  <span className="mr-1.5 inline font-mono text-xs leading-normal text-blue-300">
                    {k}
                  </span>
                  <span className="sr-only">=</span>
                  <span className="inline min-w-0 text-sm leading-normal break-words text-zinc-200">
                    {renderTagValueForKey(k, v)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </article>
  )
}
