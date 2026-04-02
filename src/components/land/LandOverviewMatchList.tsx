import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'
import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { formatMatchRowListId } from '../../lib/formatOsmRef'
import type { LandMatchCategory } from '../../lib/landMatchCategories'
import { matchRowDisplayName } from '../../lib/matchRowInBbox'
import { CategoryLegendSwatch } from '../CategoryLegendSwatch'

type ListMatchRow = {
  key: string
  category: LandMatchCategory
  officialId: string | null
  osmType: 'way' | 'relation' | 'node' | null
  osmId: string | null
  officialName: string | null
  osmName: string | null
  officialProperties?: Record<string, unknown> | null
  matchMode?: 'distance' | 'distance_and_name' | 'name'
  distanceMeters: number | null
}

export function LandOverviewMatchList({
  code,
  listMatches,
  matchesLength,
  enabledCategoriesLength,
  visibleMatchesLength,
}: {
  code: string
  listMatches: ListMatchRow[]
  matchesLength: number
  enabledCategoriesLength: number
  visibleMatchesLength: number
}) {
  return (
    <>
      <h2 className="mt-10 mb-2 flex flex-row flex-wrap items-center gap-x-2 text-lg font-semibold text-zinc-100">
        <span>{de.land.table}</span>
        <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-300/90 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-700">
          {formatDeInteger(listMatches.length)}
        </span>
      </h2>
      <div className="overflow-hidden border-y border-zinc-700 bg-zinc-900/40 shadow-none outline outline-zinc-100/10 max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 sm:rounded-lg sm:border sm:border-zinc-700">
        {listMatches.length === 0 ? (
          <p className="px-3 py-3 text-center text-sm text-zinc-400 sm:p-4">
            {matchesLength === 0
              ? '—'
              : enabledCategoriesLength === 0
                ? de.land.mapNoVisibleCategories
                : visibleMatchesLength === 0
                  ? de.land.tableFilteredEmpty
                  : de.land.tableBboxEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-700">
            {listMatches.slice(0, 500).map((row) => {
              const title = matchRowDisplayName(row)
              const subId = formatMatchRowListId(row)
              return (
                <li key={row.key}>
                  <Link
                    to="/bundesland/$code/schule/$matchKey"
                    params={{ code, matchKey: row.key }}
                    className="relative flex justify-between gap-x-3 px-3 py-2.5 hover:bg-zinc-800/50 sm:gap-x-6 sm:px-5 sm:py-3.5"
                    aria-label={`${de.land.detail}: ${title}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm/5 font-semibold text-zinc-100">{title}</p>
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        <CategoryLegendSwatch category={row.category} />
                        <span className="min-w-0 text-xs font-medium text-zinc-300">
                          {de.land.categoryLabel[row.category]}
                        </span>
                        {row.category === 'matched' && row.matchMode && (
                          <span className="min-w-0 text-xs text-zinc-400">
                            · {de.detail.matchModeLabel[row.matchMode]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-x-3">
                      {(subId !== '' || row.distanceMeters != null) && (
                        <div className="flex max-w-[min(100%,12rem)] flex-col items-end gap-y-0.5">
                          {subId !== '' && (
                            <p className="text-right font-mono text-xs/5 text-zinc-400">{subId}</p>
                          )}
                          {row.distanceMeters != null && (
                            <p className="text-xs/5 text-right text-zinc-400 tabular-nums">
                              {de.land.tableDistanceAway.replace(
                                '{meters}',
                                formatDeInteger(row.distanceMeters),
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      <ChevronRightIcon aria-hidden className="size-5 flex-none text-zinc-500" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {listMatches.length > 500 && (
          <p className="border-t border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 sm:px-4">
            … erste 500 von {formatDeInteger(listMatches.length)}
          </p>
        )}
      </div>
    </>
  )
}
