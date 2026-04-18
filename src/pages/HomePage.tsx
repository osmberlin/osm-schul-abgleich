import { HomeGermanyStats } from '../components/home/HomeGermanyStats'
import { HomeHeader } from '../components/home/HomeHeader'
import { HomeHistorySection } from '../components/home/HomeHistorySection'
import { HomeOfficialSourcesSection } from '../components/home/HomeOfficialSourcesSection'
import { HomeStateList } from '../components/home/HomeStateList'
import { OsmLocateErrBanner } from '../components/OsmLocateErrBanner'
import { de } from '../i18n/de'
import { germanyHistoryFromRuns } from '../lib/matchHistoryFromRuns'
import { runsQueryOptions, summaryQueryOptions } from '../lib/sharedDatasetQueries'
import { STATE_ORDER } from '../lib/stateConfig'
import { useQuery } from '@tanstack/react-query'

export function HomePage() {
  const q = useQuery({
    ...summaryQueryOptions(),
    retry: 1,
  })

  const runsQ = useQuery({
    ...runsQueryOptions(),
    retry: 1,
  })

  const germanyHistoryPoints = runsQ.data
    ? germanyHistoryFromRuns(runsQ.data.runs, STATE_ORDER)
    : []

  const byCode = new Map((q.data?.states ?? []).map((l) => [l.code, l]))

  const states = q.data?.states ?? []
  const germanyTotals =
    states.length === 0
      ? null
      : states.reduce(
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

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <HomeHeader />

      <OsmLocateErrBanner />

      {q.isLoading && <p className="text-zinc-400">{de.home.loading}</p>}
      {q.isError && <p className="text-amber-200">{de.home.error}</p>}
      {q.isSuccess && q.data.states.length === 0 && (
        <p className="text-zinc-400">{de.home.empty}</p>
      )}

      {q.isSuccess && q.data.states.length > 0 && germanyTotals && (
        <HomeGermanyStats totals={germanyTotals} />
      )}

      {q.isSuccess && q.data.states.length > 0 && <HomeStateList byCode={byCode} />}

      {runsQ.isSuccess && <HomeHistorySection points={germanyHistoryPoints} />}

      <HomeOfficialSourcesSection />
    </div>
  )
}
