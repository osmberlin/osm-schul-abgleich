import { ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useMemo } from 'react'
import {
  CategoryLegendSwatch,
  OfficialNoCoordLegendSwatch,
} from '../components/CategoryLegendSwatch'
import { MatchCountsHistoryChart } from '../components/MatchCountsHistoryChart'
import { PageBreadcrumb } from '../components/PageBreadcrumb'
import { ReadOnlyStatBlock, StatBlocksRow } from '../components/StatBlocks'
import { de } from '../i18n/de'
import { formatDeInteger } from '../lib/formatNumber'
import { CATEGORY_INNER_HEX, OFFICIAL_NO_COORD_INNER_HEX } from '../lib/matchCategoryTheme'
import { MATCH_CHART_LABELS } from '../lib/matchChartLabels'
import { germanyHistoryFromRuns } from '../lib/matchHistoryFromRuns'
import { runsJsonUrl, summaryJsonUrl } from '../lib/paths'
import { runsFileSchema, summaryFileSchema } from '../lib/schemas'
import { type LandCode, STATE_LABEL_DE, STATE_ORDER } from '../lib/stateConfig'
import { LAND_MATCH_CATEGORIES } from '../lib/useLandCategoryFilter'

const PIE_CX = 20
const PIE_CY = 20
const PIE_R = 18
const TAU = Math.PI * 2

/** Wedge from center, clockwise from 12 o'clock. */
function pieWedgePath(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  const span = endRad - startRad
  if (span <= 1e-9) return ''
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  if (Math.abs(span - TAU) < 1e-6) return ''
  const largeArc = span > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

/** Kompaktes Tortendiagramm — Reihenfolge CVD: matched … bis zuletzt `official_no_coord` (Bordeaux). */
function MiniPie({
  matched,
  officialOnly,
  osmOnly,
  matchAmbiguous,
  officialNoCoord,
}: {
  matched: number
  officialOnly: number
  osmOnly: number
  matchAmbiguous: number
  officialNoCoord: number
}) {
  const t = matched + officialOnly + osmOnly + matchAmbiguous + officialNoCoord
  if (t === 0) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden>
        <span className="text-zinc-400">—</span>
      </div>
    )
  }

  const slices: { key: string; n: number; fill: string }[] = [
    { key: 'matched', n: matched, fill: CATEGORY_INNER_HEX.matched },
    { key: 'official', n: officialOnly, fill: CATEGORY_INNER_HEX.official_only },
    { key: 'osm', n: osmOnly, fill: CATEGORY_INNER_HEX.osm_only },
    { key: 'ambig', n: matchAmbiguous, fill: CATEGORY_INNER_HEX.match_ambiguous },
    { key: 'nocoord', n: officialNoCoord, fill: OFFICIAL_NO_COORD_INNER_HEX },
  ]

  let cum = 0
  const paths: ReactNode[] = []

  for (const s of slices) {
    const frac = s.n / t
    if (frac <= 0) continue
    if (frac >= 1 - 1e-9) {
      paths.push(
        <circle
          key={s.key}
          cx={PIE_CX}
          cy={PIE_CY}
          r={PIE_R}
          fill={s.fill}
          className="stroke-zinc-100 dark:stroke-zinc-800"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />,
      )
      break
    }
    const startRad = -Math.PI / 2 + cum * TAU
    const endRad = -Math.PI / 2 + (cum + frac) * TAU
    const d = pieWedgePath(PIE_CX, PIE_CY, PIE_R, startRad, endRad)
    cum += frac
    if (!d) continue
    paths.push(
      <path
        key={s.key}
        d={d}
        fill={s.fill}
        className="stroke-zinc-100 dark:stroke-zinc-800"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />,
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" role="img" className="shrink-0">
        <title>
          {de.land.categoryLabel.matched} {formatDeInteger(matched)},{' '}
          {de.land.categoryLabel.official_only} {formatDeInteger(officialOnly)},{' '}
          {de.land.categoryLabel.osm_only} {formatDeInteger(osmOnly)},{' '}
          {de.land.categoryLabel.match_ambiguous} {formatDeInteger(matchAmbiguous)},{' '}
          {de.land.officialNoCoordKpi} {formatDeInteger(officialNoCoord)}
        </title>
        {paths}
      </svg>
    </div>
  )
}

export function HomePage() {
  const showNoCoordInfo = () => {
    window.alert(de.land.officialNoCoordKpiInfoAlert)
  }

  const q = useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const r = await fetch(summaryJsonUrl())
      if (!r.ok) throw new Error(String(r.status))
      return summaryFileSchema.parse(await r.json())
    },
    retry: 1,
  })

  const runsQ = useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const r = await fetch(runsJsonUrl())
      if (!r.ok) throw new Error(String(r.status))
      return runsFileSchema.parse(await r.json())
    },
    retry: 1,
  })

  const germanyHistoryPoints = useMemo(
    () => (runsQ.data ? germanyHistoryFromRuns(runsQ.data.runs, STATE_ORDER) : []),
    [runsQ.data],
  )

  const byCode = new Map((q.data?.lands ?? []).map((l) => [l.code, l]))

  const germanyTotals = useMemo(() => {
    const lands = q.data?.lands ?? []
    if (lands.length === 0) return null
    return lands.reduce(
      (acc, l) => ({
        matched: acc.matched + l.counts.matched,
        official_only: acc.official_only + l.counts.official_only,
        osm_only: acc.osm_only + l.counts.osm_only,
        match_ambiguous: acc.match_ambiguous + l.counts.ambiguous,
        official_no_coord: acc.official_no_coord + l.counts.official_no_coord,
      }),
      {
        matched: 0,
        official_only: 0,
        osm_only: 0,
        match_ambiguous: 0,
        official_no_coord: 0,
      },
    )
  }, [q.data?.lands])

  return (
    <div className="mx-auto max-w-5xl p-6 pb-16">
      <div className="mb-6">
        <PageBreadcrumb />
      </div>
      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 dark:text-brand-100">
          {de.appTitle}
        </h1>
        <p className="mt-3 text-lg text-zinc-700 dark:text-zinc-300">{de.home.heading}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {de.home.leadIntro}
          <a
            href={de.home.links.jedeschule.href}
            className="font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800 dark:text-emerald-300 dark:decoration-emerald-300/30"
            target="_blank"
            rel="noreferrer"
          >
            {de.home.links.jedeschule.label}
          </a>
          {de.home.leadBetween}
          <a
            href={de.home.links.osmSchoolTag.href}
            className="font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800 dark:text-emerald-300 dark:decoration-emerald-300/30"
            target="_blank"
            rel="noreferrer"
          >
            {de.home.links.osmSchoolTag.label}
          </a>
          {de.home.leadOutro}
        </p>
      </header>

      {q.isLoading && <p className="text-zinc-500">{de.home.loading}</p>}
      {q.isError && <p className="text-amber-800 dark:text-amber-200">{de.home.error}</p>}
      {q.isSuccess && q.data.lands.length === 0 && <p className="text-zinc-500">{de.home.empty}</p>}

      {q.isSuccess && q.data.lands.length > 0 && germanyTotals && (
        <StatBlocksRow aria-label={de.home.globalKpiAria} className="mb-6">
          {LAND_MATCH_CATEGORIES.map((cat) => (
            <ReadOnlyStatBlock
              key={cat}
              swatch={<CategoryLegendSwatch category={cat} />}
              label={de.land.categoryLabel[cat]}
              value={formatDeInteger(germanyTotals[cat])}
            />
          ))}
          <ReadOnlyStatBlock
            swatch={<OfficialNoCoordLegendSwatch />}
            label={de.land.officialNoCoordKpi}
            labelAddon={
              <button
                type="button"
                className="inline-flex rounded text-zinc-500 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                aria-label={de.land.officialNoCoordKpiInfoButton}
                onClick={showNoCoordInfo}
              >
                <InformationCircleIcon className="size-4" aria-hidden />
              </button>
            }
            value={formatDeInteger(germanyTotals.official_no_coord)}
          />
        </StatBlocksRow>
      )}

      {q.isSuccess && q.data.lands.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm outline outline-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-900/40 dark:shadow-none dark:outline-zinc-100/10">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {STATE_ORDER.map((code) => {
              const land = byCode.get(code) ?? null
              const label = STATE_LABEL_DE[code as LandCode]
              return (
                <li key={code}>
                  <Link
                    to="/bundesland/$code"
                    params={{ code }}
                    className="relative flex items-center justify-between gap-x-4 px-4 py-4 hover:bg-zinc-50 sm:gap-x-6 sm:px-6 dark:hover:bg-zinc-800/50"
                    aria-label={`${de.home.toLand}: ${label}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <MiniPie
                        matched={land?.counts.matched ?? 0}
                        officialOnly={land?.counts.official_only ?? 0}
                        osmOnly={land?.counts.osm_only ?? 0}
                        matchAmbiguous={land?.counts.ambiguous ?? 0}
                        officialNoCoord={land?.counts.official_no_coord ?? 0}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm/5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {label}
                        </p>
                        {land && (
                          <div className="mt-1 text-xs text-zinc-500">
                            {de.land.categoryLabel.matched} {formatDeInteger(land.counts.matched)} ·{' '}
                            {de.land.categoryLabel.official_only}{' '}
                            {formatDeInteger(land.counts.official_only)} ·{' '}
                            {de.land.categoryLabel.osm_only} {formatDeInteger(land.counts.osm_only)}{' '}
                            · {de.land.categoryLabel.match_ambiguous}{' '}
                            {formatDeInteger(land.counts.ambiguous)} · {de.land.officialNoCoordKpi}{' '}
                            {formatDeInteger(land.counts.official_no_coord)}
                            {land.osmSource === 'cached' ? ' · OSM-Cache' : ''}
                          </div>
                        )}
                        {!land && (
                          <div className="mt-1 text-xs text-zinc-500">Keine Zusammenfassung</div>
                        )}
                      </div>
                    </div>
                    <ChevronRightIcon
                      aria-hidden
                      className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {runsQ.isSuccess && germanyHistoryPoints.length > 0 && (
        <section className="mt-10" aria-label={de.home.historyHeading}>
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {de.home.historyHeading}
          </h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{de.home.historyLead}</p>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm outline outline-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-900/40 dark:shadow-none dark:outline-zinc-100/10">
            <MatchCountsHistoryChart
              points={germanyHistoryPoints}
              categoryLabels={MATCH_CHART_LABELS}
              chartDescription={de.home.historyHeading}
            />
          </div>
        </section>
      )}
    </div>
  )
}
