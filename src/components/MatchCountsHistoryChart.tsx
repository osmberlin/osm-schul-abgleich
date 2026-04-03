import { berlinCalendarDateKey } from '../lib/berlinCalendarDateKey'
import { formatDeInteger } from '../lib/formatNumber'
import type { LandMatchCategory } from '../lib/landMatchCategories'
import { CATEGORY_INNER_HEX, OFFICIAL_NO_COORD_INNER_HEX } from '../lib/matchCategoryTheme'
import {
  MATCH_HISTORY_STACK_KEYS,
  type MatchHistoryChartLabels,
  type MatchHistorySegmentKey,
  type MatchHistoryStackPoint,
} from '../lib/matchHistoryFromRuns'
import { format, parseISO } from 'date-fns'
import { de as dateFnsDe } from 'date-fns/locale/de'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipPayload,
  XAxis,
  YAxis,
} from 'recharts'

type ChartRow = MatchHistoryStackPoint & { berlinDay: string }

function stackSegmentFill(key: MatchHistorySegmentKey): string {
  if (key === 'official_no_coord') return OFFICIAL_NO_COORD_INNER_HEX
  return CATEGORY_INNER_HEX[key as LandMatchCategory]
}

function stackTotal(p: MatchHistoryStackPoint): number {
  return p.matched + p.official_only + p.osm_only + p.match_ambiguous + p.official_no_coord
}

function formatBerlinDayTick(berlinDay: string): string {
  const d = parseISO(berlinDay)
  if (Number.isNaN(d.getTime())) return ''
  return format(d, 'd. MMM', { locale: dateFnsDe })
}

function ariaSummary(points: MatchHistoryStackPoint[], labels: MatchHistoryChartLabels): string {
  return points
    .map((p) => {
      const day = berlinCalendarDateKey(p.finishedAt)
      const dayLabel = day ? formatBerlinDayTick(day) : ''
      const parts = MATCH_HISTORY_STACK_KEYS.map(
        (k) => `${labels[k]} ${formatDeInteger(p[k])}`,
      ).join(', ')
      return `${dayLabel}: ${parts}`
    })
    .join(' — ')
}

function pointsToChartData(points: MatchHistoryStackPoint[]): ChartRow[] {
  return points.map((p) => {
    const berlinDay = berlinCalendarDateKey(p.finishedAt)
    return {
      ...p,
      berlinDay: berlinDay || p.finishedAt.slice(0, 10),
    }
  })
}

type Props = {
  points: MatchHistoryStackPoint[]
  categoryLabels: MatchHistoryChartLabels
  /** Used for `aria-label` and screen-reader summary (`sr-only`). */
  chartDescription: string
}

type HistoryTooltipProps = {
  active?: boolean
  payload?: TooltipPayload
  label?: string | number
  categoryLabels: MatchHistoryChartLabels
}

function HistoryTooltip({ active, payload, label, categoryLabels }: HistoryTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as ChartRow | undefined
  if (!row) return null

  const dayLabel = row.berlinDay ? formatBerlinDayTick(row.berlinDay) : String(label ?? '')
  const total = stackTotal(row)

  return (
    <div className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-zinc-100">{dayLabel}</p>
      <p className="mb-1.5 text-zinc-400">Summe: {formatDeInteger(total)}</p>
      <ul className="space-y-0.5">
        {MATCH_HISTORY_STACK_KEYS.map((key) => (
          <li key={key} className="flex justify-between gap-4 tabular-nums">
            <span className="flex min-w-0 items-center gap-2 text-zinc-400">
              <span
                className="size-2 shrink-0 rounded-sm"
                style={{ backgroundColor: stackSegmentFill(key) }}
                aria-hidden
              />
              <span className="truncate">{categoryLabels[key]}</span>
            </span>
            <span className="shrink-0 text-zinc-100">{formatDeInteger(row[key])}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Gestapelte Flächen: x = Kalendertag (Berlin), y = Summe aller KPI-Zähler inkl. `official_no_coord`.
 */
export function MatchCountsHistoryChart({ points, categoryLabels, chartDescription }: Props) {
  if (points.length === 0) return null

  const data = pointsToChartData(points)
  const n = data.length
  const labelStep = n <= 14 ? 1 : Math.ceil(n / 12)
  const tickBerlinDays = data
    .map((row, i) => ({ row, i }))
    .filter(({ i }) => i % labelStep === 0 || i === n - 1)
    .map(({ row }) => row.berlinDay)

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-h-[260px] min-w-[280px]" role="img" aria-label={chartDescription}>
        <span className="sr-only">{ariaSummary(points, categoryLabels)}</span>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="berlinDay"
              type="category"
              ticks={tickBerlinDays}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={{ stroke: '#52525b' }}
              axisLine={{ stroke: '#52525b' }}
              tickFormatter={(v: string) => formatBerlinDayTick(v)}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={{ stroke: '#52525b' }}
              axisLine={{ stroke: '#52525b' }}
              tickFormatter={(v: number) => formatDeInteger(v)}
              width={44}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <HistoryTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  categoryLabels={categoryLabels}
                />
              )}
              cursor={{ stroke: '#71717a', strokeWidth: 1 }}
            />
            {MATCH_HISTORY_STACK_KEYS.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={categoryLabels[key]}
                stackId="matchHistory"
                stroke={stackSegmentFill(key)}
                fill={stackSegmentFill(key)}
                fillOpacity={0.85}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
