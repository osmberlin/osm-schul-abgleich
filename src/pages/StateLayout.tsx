import { CategoryLegendSwatch } from '../components/CategoryLegendSwatch'
import { de } from '../i18n/de'
import { fetchStateOverviewBundle } from '../lib/fetchStateOverviewBundle'
import { formatDeInteger } from '../lib/formatNumber'
import { formatSchoolWhereSubtitle } from '../lib/schoolWhere'
import { type StateCode, STATE_LABEL_DE } from '../lib/stateConfig'
import type { StateMatchCategory } from '../lib/stateMatchCategories'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useParams, useRouterState } from '@tanstack/react-router'
import { useMemo } from 'react'

export function StateLayout() {
  const { stateKey } = useParams({ strict: false }) as { stateKey: string }
  const label = STATE_LABEL_DE[stateKey as StateCode] ?? stateKey

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const schuleKeyDecoded = useMemo(() => {
    const m = pathname.match(/^\/bundesland\/[^/]+\/schule\/(.+)$/)
    if (!m?.[1]) return null
    try {
      return decodeURIComponent(m[1])
    } catch {
      return m[1]
    }
  }, [pathname])

  const schuleQ = useQuery({
    queryKey: ['schule-detail', stateKey, schuleKeyDecoded],
    queryFn: () => fetchStateOverviewBundle(stateKey),
    enabled: !!stateKey && !!schuleKeyDecoded,
  })

  const schuleRow = useMemo(() => {
    if (!schuleKeyDecoded || !schuleQ.data) return null
    return schuleQ.data.matches.find((r) => r.key === schuleKeyDecoded) ?? null
  }, [schuleQ.data, schuleKeyDecoded])

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
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
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
          <p className="mb-6 text-sm leading-snug text-zinc-400">
            {formatSchoolWhereSubtitle(
              label,
              stateKey,
              schuleRow.officialProperties ?? null,
              schuleRow.osmTags ?? null,
            )}
            {schuleRow.category === 'matched' && schuleRow.distanceMeters != null && (
              <>
                {' \u00B7 '}
                {de.detail.abstand}: {formatDeInteger(schuleRow.distanceMeters)} m
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-zinc-100">{label}</h1>
          <p className="mb-6 text-sm text-zinc-400">{de.detail.notFound}</p>
        </>
      )
    ) : (
      <h1 className="mb-6 min-w-0 text-2xl font-semibold text-zinc-100">
        {de.state.overviewTitle.replace('{name}', label).replace('{stateKey}', stateKey)}
      </h1>
    )

  return (
    <div className="mx-auto max-w-5xl p-4 pb-10">
      {titleBlock}
      <Outlet />
    </div>
  )
}
