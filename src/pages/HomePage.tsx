import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { HomeGermanyStats } from '../components/home/HomeGermanyStats'
import { HomeHeader } from '../components/home/HomeHeader'
import { HomeHistorySection } from '../components/home/HomeHistorySection'
import { HomeLandList } from '../components/home/HomeLandList'
import { HomeOfficialSourcesSection } from '../components/home/HomeOfficialSourcesSection'
import { de } from '../i18n/de'
import { germanyHistoryFromRuns } from '../lib/matchHistoryFromRuns'
import { runsJsonUrl, summaryJsonUrl } from '../lib/paths'
import { runsFileSchema, summaryFileSchema } from '../lib/schemas'
import { STATE_ORDER } from '../lib/stateConfig'

export function HomePage() {
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
      <HomeHeader />

      {q.isLoading && <p className="text-zinc-400">{de.home.loading}</p>}
      {q.isError && <p className="text-amber-200">{de.home.error}</p>}
      {q.isSuccess && q.data.lands.length === 0 && <p className="text-zinc-400">{de.home.empty}</p>}

      {q.isSuccess && q.data.lands.length > 0 && germanyTotals && (
        <HomeGermanyStats totals={germanyTotals} />
      )}

      {q.isSuccess && q.data.lands.length > 0 && <HomeLandList byCode={byCode} />}

      {runsQ.isSuccess && <HomeHistorySection points={germanyHistoryPoints} />}

      <HomeOfficialSourcesSection />
    </div>
  )
}
