import { de } from '../../i18n/de'
import { JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY } from '../../lib/jedeschuleDuplicateGroup'
import { comparePropertySections } from '../../lib/propertyCompare'
import type { PropertyCompareGroup } from '../../lib/propertyCompare'
import type { ReactNode } from 'react'

type TechnicalAttributes = {
  lat?: unknown
  long?: unknown
  geometryType?: unknown
  id?: unknown
  updatedTimestamp?: unknown
}

const technicalSourceKeys = new Set([
  'id',
  'lat',
  'latitude',
  'lon',
  'long',
  'longitude',
  'geometry_type',
  'geometry type',
  'geometrytype',
  'updated_timestamp',
  'update_timestamp',
])

function isTechnicalAttributeKey(key: string): boolean {
  return technicalSourceKeys.has(key.trim().toLowerCase())
}

function technicalValue(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null
  const text = String(value).trim()
  return text ? text : null
}

function technicalEntries(source: TechnicalAttributes | null | undefined): Array<[string, string]> {
  if (!source) return []
  const entries: Array<[string, string | null]> = [
    ['lat (rounded)', technicalValue(source.lat)],
    ['long (rounded)', technicalValue(source.long)],
    ['geometry_type', technicalValue(source.geometryType)],
    ['id', technicalValue(source.id)],
    ['updated_timestamp', technicalValue(source.updatedTimestamp)],
  ]
  return entries.filter((entry): entry is [string, string] => entry[1] != null)
}

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

function isEquivalentCompareGroup(group: PropertyCompareGroup): boolean {
  if (group.kind === 'address') return true
  return group.isEquivalentMatch
}

export function SchoolDetailCompareBody({
  official,
  osm,
  officialIdForHeader,
  osmTypeForHeader,
  osmIdForHeader,
  officialTechnical,
  osmTechnical,
}: {
  official: Record<string, unknown> | null | undefined
  osm: Record<string, string> | null | undefined
  officialIdForHeader: string | null
  osmTypeForHeader: 'way' | 'relation' | 'node' | null
  osmIdForHeader: string | null
  officialTechnical?: TechnicalAttributes | null
  osmTechnical?: TechnicalAttributes | null
}) {
  const { bothEqual, bothDifferent, onlyO, onlyS, compareGroups } = comparePropertySections(
    officialPropsForCompare(official),
    osm,
  )
  const equalRows = [...bothEqual]
    .filter(([k]) => k !== 'id')
    .sort(([a], [b]) => {
      const aName = a === 'name'
      const bName = b === 'name'
      if (aName && !bName) return -1
      if (!aName && bName) return 1
      return a.localeCompare(b, 'de')
    })
  const differentRows = [...bothDifferent]
    .filter(([k]) => k !== 'id')
    .sort(([a], [b]) => {
      const aName = a === 'name'
      const bName = b === 'name'
      if (aName && !bName) return -1
      if (!aName && bName) return 1
      return a.localeCompare(b, 'de')
    })
  const nameEqualRows = equalRows.filter(([k]) => k === 'name')
  const nonNameEqualRows = equalRows.filter(([k]) => k !== 'name')
  const equalCompareGroups = compareGroups.filter((group) => isEquivalentCompareGroup(group))
  const differentCompareGroups = compareGroups.filter((group) => !isEquivalentCompareGroup(group))
  const osmRefLabel =
    osmTypeForHeader && osmIdForHeader ? `${osmTypeForHeader}/${osmIdForHeader}` : null
  const officialTechnicalRows = technicalEntries(officialTechnical)
  const osmTechnicalRows = technicalEntries(osmTechnical)
  const officialOnlyRows = onlyO.filter(([k]) => !isTechnicalAttributeKey(k))
  const osmOnlyRows = onlyS.filter(([k]) => !isTechnicalAttributeKey(k))
  const hasOfficialExclusiveRows = officialOnlyRows.length > 0
  const hasOsmExclusiveRows = osmOnlyRows.length > 0
  const hasTechnicalRows = officialTechnicalRows.length > 0 || osmTechnicalRows.length > 0
  const hasCommonRows = equalRows.length > 0 || equalCompareGroups.length > 0
  const hasDifferentRows = differentRows.length > 0 || differentCompareGroups.length > 0

  function renderStandardCompareGroupRow(
    group: Exclude<PropertyCompareGroup, { kind: 'address' }>,
  ): ReactNode {
    const osmValues = group.osmValues as Record<string, string | null>
    return (
      <div
        key={`${group.kind}-${group.officialKey}`}
        className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0"
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
              value={osmValues[k] ?? '—'}
            />
          ))}
        </div>
      </div>
    )
  }

  function renderCompareGroupRow(group: PropertyCompareGroup): ReactNode {
    switch (group.kind) {
      case 'address':
        return (
          <div
            key={`${group.kind}-${group.officialKey}`}
            className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0"
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
      case 'grundschule':
      case 'secondarySchool':
      case 'fachschule':
      case 'providerOperator':
      case 'legalStatusOperatorType':
      case 'idRef':
        return renderStandardCompareGroupRow(group)
    }
    const _exhaustive: never = group
    return _exhaustive
  }

  return (
    <article aria-labelledby="school-detail-compare-both-heading">
      <section aria-labelledby="school-detail-compare-both-heading">
        <h2 id="school-detail-compare-both-heading" className="mb-3 font-semibold text-zinc-100">
          {de.detail.keysBoth}
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <header>
            <div className="border-b border-zinc-700 bg-zinc-900/50 md:hidden">
              <div className="border-b border-zinc-700 bg-amber-950/35 px-3 py-2 text-xs font-semibold tracking-wide text-amber-200">
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
              {nameEqualRows.map(([k, o, s]) => (
                <div key={k} className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
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
              {equalCompareGroups.map((group) => renderCompareGroupRow(group))}
              {nonNameEqualRows.map(([k, o, s]) => (
                <div key={k} className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
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

      <section aria-labelledby="school-detail-compare-different-heading" className="mt-10">
        <h2
          id="school-detail-compare-different-heading"
          className="mb-3 font-semibold text-zinc-100"
        >
          {de.detail.keysDifferent}
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          {!hasDifferentRows ? (
            <p className="p-2 text-sm text-zinc-400 sm:p-3">—</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {differentRows.map(([k, o, s]) => (
                <div key={k} className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
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
              {differentCompareGroups.map((group) => renderCompareGroupRow(group))}
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

      <section className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
        <section aria-labelledby="school-detail-compare-official-only-heading">
          <h2
            id="school-detail-compare-official-only-heading"
            className="mb-3 font-semibold text-zinc-100"
          >
            {de.detail.officialOnly}
          </h2>
          {!hasOfficialExclusiveRows ? (
            <p className="text-zinc-400">—</p>
          ) : (
            <ul className="m-0 list-none p-0 text-sm">
              {officialOnlyRows.map(([k, v]) => (
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
          {!hasOsmExclusiveRows ? (
            <p className="text-zinc-400">—</p>
          ) : (
            <ul className="m-0 list-none p-0 text-sm">
              {osmOnlyRows.map(([k, v]) => (
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

      <section aria-labelledby="school-detail-compare-technical-heading" className="mt-10">
        <h2
          id="school-detail-compare-technical-heading"
          className="mb-3 font-semibold text-zinc-100"
        >
          {de.detail.technicalAttributes}
        </h2>
        {!hasTechnicalRows ? (
          <p className="text-zinc-400">—</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            <section aria-label={de.detail.official}>
              {officialTechnicalRows.length === 0 ? (
                <p className="text-zinc-400">—</p>
              ) : (
                <ul className="m-0 list-none p-0 text-sm">
                  {officialTechnicalRows.map(([k, v]) => (
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
            <section aria-label={de.detail.osm}>
              {osmTechnicalRows.length === 0 ? (
                <p className="text-zinc-400">—</p>
              ) : (
                <ul className="m-0 list-none p-0 text-sm">
                  {osmTechnicalRows.map(([k, v]) => (
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
          </div>
        )}
      </section>
    </article>
  )
}
