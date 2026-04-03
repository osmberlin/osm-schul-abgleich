import { de } from '../../i18n/de'
import { MATCH_CHART_LABELS } from '../../lib/matchChartLabels'
import type { MatchHistoryStackPoint } from '../../lib/matchHistoryFromRuns'
import { MatchCountsHistoryChart } from '../MatchCountsHistoryChart'

export function HomeHistorySection({ points }: { points: MatchHistoryStackPoint[] }) {
  if (points.length === 0) return null

  return (
    <section className="mt-10" aria-label={de.home.historyHeading}>
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">{de.home.historyHeading}</h2>
      <p className="mb-4 text-sm text-zinc-400">{de.home.historyLead}</p>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 shadow-none outline outline-zinc-100/10">
        <MatchCountsHistoryChart
          points={points}
          categoryLabels={MATCH_CHART_LABELS}
          chartDescription={de.home.historyHeading}
        />
      </div>
    </section>
  )
}
