import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { CATEGORY_INNER_HEX } from '../../lib/matchCategoryTheme'
import { type StateCode, STATE_LABEL_DE, STATE_ORDER } from '../../lib/stateConfig'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'
import { type ReactNode } from 'react'

const PIE_CX = 20
const PIE_CY = 20
const PIE_R = 18
const TAU = Math.PI * 2

type StateSummaryLike = {
  counts: {
    matched: number
    official_only: number
    osm_only: number
    ambiguous: number
    official_no_coord: number
  }
  osmSource?: string
}

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
  const total = matched + officialOnly + osmOnly + matchAmbiguous + officialNoCoord
  if (total === 0) {
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
    { key: 'nocoord', n: officialNoCoord, fill: CATEGORY_INNER_HEX.official_no_coord },
  ]

  let cum = 0
  const paths: ReactNode[] = []

  for (const slice of slices) {
    const frac = slice.n / total
    if (frac <= 0) continue
    if (frac >= 1 - 1e-9) {
      paths.push(
        <circle
          key={slice.key}
          cx={PIE_CX}
          cy={PIE_CY}
          r={PIE_R}
          fill={slice.fill}
          className="stroke-zinc-800"
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
        key={slice.key}
        d={d}
        fill={slice.fill}
        className="stroke-zinc-800"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />,
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" role="img" className="shrink-0">
        <title>
          {de.state.categoryLabel.matched} {formatDeInteger(matched)},{' '}
          {de.state.categoryLabel.official_only} {formatDeInteger(officialOnly)},{' '}
          {de.state.categoryLabel.osm_only} {formatDeInteger(osmOnly)},{' '}
          {de.state.categoryLabel.match_ambiguous} {formatDeInteger(matchAmbiguous)},{' '}
          {de.state.categoryLabel.official_no_coord} {formatDeInteger(officialNoCoord)}
        </title>
        {paths}
      </svg>
    </div>
  )
}

export function HomeStateList({ byCode }: { byCode: Map<string, StateSummaryLike> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/40 shadow-none outline outline-zinc-100/10">
      <ul className="divide-y divide-zinc-700">
        {STATE_ORDER.map((code) => {
          const row = byCode.get(code) ?? null
          const label = STATE_LABEL_DE[code as StateCode]
          return (
            <li key={code}>
              <Link
                to="/bundesland/$stateKey"
                params={{ stateKey: code }}
                className="relative flex items-center justify-between gap-x-3 px-3 py-2.5 hover:bg-zinc-800/50 sm:gap-x-6 sm:px-5 sm:py-3.5"
                aria-label={`${de.home.toState}: ${label}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <MiniPie
                    matched={row?.counts.matched ?? 0}
                    officialOnly={row?.counts.official_only ?? 0}
                    osmOnly={row?.counts.osm_only ?? 0}
                    matchAmbiguous={row?.counts.ambiguous ?? 0}
                    officialNoCoord={row?.counts.official_no_coord ?? 0}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm/5 font-semibold text-zinc-100">{label}</p>
                    {row && (
                      <div className="mt-1 text-xs text-zinc-400">
                        {de.state.categoryLabel.matched} {formatDeInteger(row.counts.matched)} ·{' '}
                        {de.state.categoryLabel.official_only}{' '}
                        {formatDeInteger(row.counts.official_only)} ·{' '}
                        {de.state.categoryLabel.osm_only} {formatDeInteger(row.counts.osm_only)} ·{' '}
                        {de.state.categoryLabel.match_ambiguous}{' '}
                        {formatDeInteger(row.counts.ambiguous)} ·{' '}
                        {de.state.categoryLabel.official_no_coord}{' '}
                        {formatDeInteger(row.counts.official_no_coord)}
                        {row.osmSource === 'cached' ? ' · OSM-Cache' : ''}
                      </div>
                    )}
                    {!row && (
                      <div className="mt-1 text-xs text-zinc-400">Keine Zusammenfassung</div>
                    )}
                  </div>
                </div>
                <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-zinc-500" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
