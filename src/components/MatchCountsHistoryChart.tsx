import type { ReactNode } from 'react'
import { formatDeInteger } from '../lib/formatNumber'
import type { LandMatchCategory } from '../lib/landMatchCategories'
import { CATEGORY_INNER_HEX, OFFICIAL_NO_COORD_INNER_HEX } from '../lib/matchCategoryTheme'
import {
  MATCH_HISTORY_STACK_KEYS,
  type MatchHistoryChartLabels,
  type MatchHistorySegmentKey,
  type MatchHistoryStackPoint,
} from '../lib/matchHistoryFromRuns'

/** SVG `viewBox` width/height (user units). The element uses `width="100%"`, so this defines aspect ratio and internal layout. */
const VB_W = 800
const VB_H = 232
/** Padding inside the viewBox: plot area is x in [PAD_L, VB_W - PAD_R], y in [PAD_T, VB_H - PAD_B]. */
const PAD_L = 40 // left: max-Y tick (`textAnchor="end"`) + gap before bars
const PAD_R = 16 // right: margin past the x baseline
const PAD_T = 12 // top: room above stacks for the Y tick
const PAD_B = 56 // bottom: space for x-axis date labels (drawn near `VB_H − 12`)

function stackSegmentFill(key: MatchHistorySegmentKey): string {
  if (key === 'official_no_coord') return OFFICIAL_NO_COORD_INNER_HEX
  return CATEGORY_INNER_HEX[key as LandMatchCategory]
}

function stackTotal(p: MatchHistoryStackPoint): number {
  return p.matched + p.official_only + p.osm_only + p.match_ambiguous + p.official_no_coord
}

function formatXLabel(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Berlin',
  })
}

function ariaSummary(points: MatchHistoryStackPoint[], labels: MatchHistoryChartLabels): string {
  return points
    .map((p) => {
      const parts = MATCH_HISTORY_STACK_KEYS.map(
        (k) => `${labels[k]} ${formatDeInteger(p[k])}`,
      ).join(', ')
      return `${formatXLabel(p.finishedAt)}: ${parts}`
    })
    .join(' — ')
}

type Props = {
  points: MatchHistoryStackPoint[]
  categoryLabels: MatchHistoryChartLabels
  /** Shown as chart `<title>` and screen-reader summary. */
  chartDescription: string
}

/**
 * Gestapelte Balken: x = Laufzeitpunkt (`finishedAt`), y = Summe aller KPI-Zähler inkl. `official_no_coord`.
 */
export function MatchCountsHistoryChart({ points, categoryLabels, chartDescription }: Props) {
  if (points.length === 0) return null

  const chartW = VB_W - PAD_L - PAD_R
  const chartH = VB_H - PAD_T - PAD_B
  const yBase = PAD_T + chartH

  let maxY = 1
  for (const p of points) {
    const t = stackTotal(p)
    if (t > maxY) maxY = t
  }

  const n = points.length
  const slot = chartW / n
  const labelStep = n <= 14 ? 1 : Math.ceil(n / 12)

  const bars: ReactNode[] = []
  const labels: ReactNode[] = []

  for (let i = 0; i < n; i++) {
    const p = points[i]
    if (p === undefined) continue
    const barW = Math.max(3, slot * 0.7)
    const cx = PAD_L + i * slot + (slot - barW) / 2
    let y = yBase
    const segments: React.ReactNode[] = []
    for (const cat of MATCH_HISTORY_STACK_KEYS) {
      const v = p[cat]
      if (v <= 0) continue
      const h = (v / maxY) * chartH
      y -= h
      segments.push(
        <rect
          key={cat}
          x={cx}
          y={y}
          width={barW}
          height={h}
          fill={stackSegmentFill(cat)}
          className="stroke-zinc-800"
          strokeWidth={0.5}
        />,
      )
    }
    bars.push(<g key={p.finishedAt + String(i)}>{segments}</g>)

    if (i % labelStep === 0 || i === n - 1) {
      const lx = PAD_L + i * slot + slot / 2
      labels.push(
        <text
          key={`lab-${i}`}
          x={lx}
          y={VB_H - 12}
          textAnchor="middle"
          className="fill-zinc-400 text-[11px]"
        >
          {formatXLabel(p.finishedAt)}
        </text>,
      )
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        height={VB_H}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        className="min-h-[232px] min-w-[280px] text-zinc-100"
        aria-label={chartDescription}
      >
        <title>{chartDescription}</title>
        <desc>{ariaSummary(points, categoryLabels)}</desc>
        {/* Y axis baseline */}
        <line
          x1={PAD_L}
          y1={yBase}
          x2={VB_W - PAD_R}
          y2={yBase}
          className="stroke-zinc-600"
          strokeWidth={1}
        />
        <text
          x={PAD_L - 4}
          y={PAD_T + 10}
          textAnchor="end"
          className="fill-zinc-500 text-[10px] tabular-nums"
        >
          {formatDeInteger(maxY)}
        </text>
        {bars}
        {labels}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-700 pt-3">
        {MATCH_HISTORY_STACK_KEYS.map((cat) => (
          <div key={cat} className="flex items-center gap-2 text-xs text-zinc-400">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: stackSegmentFill(cat) }}
              aria-hidden
            />
            <span>{categoryLabels[cat]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
