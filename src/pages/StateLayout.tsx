import { useQuery } from '@tanstack/react-query'
import { Outlet, Link, useParams, useRouterState } from '@tanstack/react-router'
import { CategoryLegendSwatch } from '../components/CategoryLegendSwatch'
import { de } from '../i18n/de'
import { buildMaprouletteIdEditorUrlFromBbox } from '../lib/editorLinks'
import { stateHasMaproulette } from '../lib/maprouletteAvailability'
import { germanyMatchesCsvUrl } from '../lib/paths'
import { SCHOOLS_MATCH_CSV_DOWNLOAD_FILE_NAME } from '../lib/schoolsMatchCsv'
import { type StateCode, STATE_BOUNDS, STATE_LABEL_DE } from '../lib/stateConfig'
import { stateListSearchQueryOptions } from '../lib/stateDatasetQueries'
import type { StateMatchCategory } from '../lib/stateMatchCategories'

const MAPROULETTE_LINK_CLASS_NAME =
  'inline-flex shrink-0 items-center rounded-md bg-brand-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-900'
const CSV_DOWNLOAD_LINK_CLASS_NAME =
  'inline-flex shrink-0 items-center rounded-md border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800'

export function StateLayout() {
  const { stateKey } = useParams({ strict: false }) as { stateKey: string }
  const label = STATE_LABEL_DE[stateKey as StateCode] ?? stateKey

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const m = pathname.match(/^\/bundesland\/[^/]+\/schule\/(.+)$/)
  let schuleKeyDecoded: string | null = null
  if (m?.[1]) {
    try {
      schuleKeyDecoded = decodeURIComponent(m[1])
    } catch {
      schuleKeyDecoded = m[1]
    }
  }

  const schuleQ = useQuery({
    ...stateListSearchQueryOptions(stateKey),
    enabled: !!stateKey && !!schuleKeyDecoded,
  })

  const schuleRow =
    !schuleKeyDecoded || !schuleQ.data
      ? null
      : (schuleQ.data.find((r) => r.key === schuleKeyDecoded) ?? null)

  const overviewMaprouletteUrl =
    schuleKeyDecoded == null && stateHasMaproulette(stateKey)
      ? buildMaprouletteIdEditorUrlFromBbox(STATE_BOUNDS[stateKey as StateCode])
      : null

  const titleBlock =
    schuleKeyDecoded != null ? (
      schuleQ.isLoading ? (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-zinc-500">…</h1>
          <p className="mb-6 text-sm text-zinc-400">{de.state.loading}</p>
        </>
      ) : schuleQ.isError ? (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-zinc-100">{label}</h1>
          <p className="mb-6 text-sm text-red-400">{de.state.error}</p>
        </>
      ) : schuleRow ? (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
            <h1 className="min-w-0 text-2xl font-semibold text-zinc-100">
              {schuleRow.officialName ?? schuleRow.osmName ?? '—'}
            </h1>
            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              <CategoryLegendSwatch category={schuleRow.category as StateMatchCategory} />
              <span className="text-sm font-medium text-zinc-200">
                {de.state.categoryLabel[schuleRow.category as StateMatchCategory] ??
                  schuleRow.category}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-zinc-100">{label}</h1>
          <p className="mb-6 text-sm text-zinc-400">{de.detail.notFound}</p>
        </>
      )
    ) : (
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
        <h1 className="min-w-0 text-2xl font-semibold text-zinc-100">
          {de.state.overviewTitle.replace('{name}', label).replace('{stateKey}', stateKey)}
        </h1>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Link to="/download" className={CSV_DOWNLOAD_LINK_CLASS_NAME}>
            {de.navDownload}
          </Link>
          <a
            href={germanyMatchesCsvUrl()}
            download={SCHOOLS_MATCH_CSV_DOWNLOAD_FILE_NAME}
            className={CSV_DOWNLOAD_LINK_CLASS_NAME}
          >
            {de.download.overviewLink}
          </a>
          {overviewMaprouletteUrl ? (
            <a
              href={overviewMaprouletteUrl}
              target="_blank"
              rel="noreferrer"
              className={MAPROULETTE_LINK_CLASS_NAME}
            >
              {de.state.editMaproulette}
            </a>
          ) : null}
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl p-4 pb-10">
      {titleBlock}
      <Outlet />
    </div>
  )
}
