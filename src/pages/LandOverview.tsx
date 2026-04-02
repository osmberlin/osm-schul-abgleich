import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { useId, useMemo } from 'react'
import { LandOverviewHistorySection } from '../components/land/LandOverviewHistorySection'
import { LandOverviewMapSection } from '../components/land/LandOverviewMapSection'
import { LandOverviewMatchList } from '../components/land/LandOverviewMatchList'
import { LandOverviewStats } from '../components/land/LandOverviewStats'
import { de } from '../i18n/de'
import { landHistoryFromRuns } from '../lib/matchHistoryFromRuns'
import {
  buildOfficialSchoolLonLatIndex,
  matchesToOverviewMapPoints,
  matchRowInLandMapBbox,
} from '../lib/matchRowInBbox'
import {
  landBoundaryUrl,
  landMatchesUrl,
  landOfficialUrl,
  landOsmMetaUrl,
  landOsmUrl,
  runsJsonUrl,
  summaryJsonUrl,
} from '../lib/paths'
import { runsFileSchema, schoolsMatchesFileSchema, summaryFileSchema } from '../lib/schemas'
import { useLandCategoryFilter } from '../lib/useLandCategoryFilter'
import { useLandMapBbox } from '../lib/useLandMapBbox'

export function LandOverview() {
  const { code } = useParams({ strict: false }) as { code: string }
  const statsInputId = useId()
  const historyHeadingId = useId()
  const { enabledSet, enabledCategories, setCategoryEnabled, isCategoryEnabled } =
    useLandCategoryFilter()
  const { bbox: listBbox, setBbox: setListBbox, clearBbox: clearListBbox } = useLandMapBbox()

  const summaryQ = useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const r = await fetch(summaryJsonUrl())
      if (!r.ok) throw new Error(String(r.status))
      return summaryFileSchema.parse(await r.json())
    },
  })

  const runsQ = useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const r = await fetch(runsJsonUrl())
      if (!r.ok) throw new Error(String(r.status))
      return runsFileSchema.parse(await r.json())
    },
  })

  const landSummary = summaryQ.data?.lands.find((l) => l.code === code)

  const landHistoryPoints = useMemo(
    () => (runsQ.data ? landHistoryFromRuns(runsQ.data.runs, code) : []),
    [runsQ.data, code],
  )

  const dataQ = useQuery({
    queryKey: ['land-data', code],
    queryFn: async () => {
      const [oRes, osmRes, mRes] = await Promise.all([
        fetch(landOfficialUrl(code)),
        fetch(landOsmUrl(code)),
        fetch(landMatchesUrl(code)),
      ])
      if (!oRes.ok || !osmRes.ok || !mRes.ok) {
        throw new Error('land fetch')
      }
      const [official, osm, matchesRaw] = await Promise.all([
        oRes.json(),
        osmRes.json(),
        mRes.json(),
      ])
      const matches = schoolsMatchesFileSchema.parse(matchesRaw)
      return {
        official,
        osm,
        matches,
      }
    },
    enabled: !!code,
  })

  const metaQ = useQuery({
    queryKey: ['land-osm-meta', code],
    queryFn: async () => {
      const r = await fetch(landOsmMetaUrl(code))
      if (!r.ok) return null
      return r.json() as Promise<Record<string, unknown>>
    },
    enabled: !!code,
  })

  const boundaryQ = useQuery({
    queryKey: ['land-boundary', code],
    queryFn: async () => {
      const r = await fetch(landBoundaryUrl(code))
      if (!r.ok) return null
      return r.json() as Promise<Feature<Polygon | MultiPolygon>>
    },
    enabled: !!code,
    staleTime: Infinity,
  })

  const matches = dataQ.data?.matches ?? []

  const officialLonLatIndex = useMemo((): Map<string, [number, number]> | null => {
    const o = dataQ.data?.official as FeatureCollection | undefined
    if (!o?.features?.length) return null
    return buildOfficialSchoolLonLatIndex(o)
  }, [dataQ.data?.official])

  const matchesForCatCounts = useMemo(() => {
    if (!listBbox) return matches
    return matches.filter((r) => matchRowInLandMapBbox(r, listBbox, officialLonLatIndex))
  }, [matches, listBbox, officialLonLatIndex])

  const catCounts = useMemo(() => {
    const z = {
      matched: 0,
      official_only: 0,
      osm_only: 0,
      match_ambiguous: 0,
    }
    for (const r of matchesForCatCounts) {
      z[r.category]++
    }
    return z
  }, [matchesForCatCounts])

  const visibleMatches = useMemo(
    () => matches.filter((r) => enabledSet.has(r.category)),
    [matches, enabledSet],
  )

  const listMatches = useMemo(() => {
    if (!listBbox) return visibleMatches
    return visibleMatches.filter((r) => matchRowInLandMapBbox(r, listBbox, officialLonLatIndex))
  }, [visibleMatches, listBbox, officialLonLatIndex])

  const mapMatchPoints = useMemo(
    () => matchesToOverviewMapPoints(listMatches, officialLonLatIndex),
    [listMatches, officialLonLatIndex],
  )

  if (dataQ.isLoading || summaryQ.isLoading) {
    return <p className="text-zinc-400">{de.land.loading}</p>
  }
  if (dataQ.isError || !dataQ.data) {
    return <p className="text-red-400">{de.land.error}</p>
  }

  return (
    <div>
      {landSummary?.osmSource === 'cached' && (
        <div
          className="mb-4 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-100"
          role="status"
        >
          {de.land.osmCachedBanner}
          {metaQ.data?.overpassQueriedAt != null && (
            <span className="mt-1 block text-xs opacity-90">
              Stand: {String(metaQ.data.overpassResponseTimestamp ?? metaQ.data.overpassQueriedAt)}
            </span>
          )}
        </div>
      )}

      <LandOverviewStats
        catCounts={catCounts}
        officialNoCoord={landSummary?.counts.official_no_coord ?? 0}
        statsInputId={statsInputId}
        isCategoryEnabled={isCategoryEnabled}
        setCategoryEnabled={setCategoryEnabled}
      />

      <LandOverviewMapSection
        enabledCategories={enabledCategories}
        enabledSet={enabledSet}
        mapMatchPoints={mapMatchPoints}
        landCode={code}
        boundary={boundaryQ.data ?? null}
        listBbox={listBbox}
        setListBbox={setListBbox}
        clearListBbox={clearListBbox}
      />

      <LandOverviewMatchList
        code={code}
        listMatches={listMatches}
        matchesLength={matches.length}
        enabledCategoriesLength={enabledCategories.length}
        visibleMatchesLength={visibleMatches.length}
      />

      <LandOverviewHistorySection
        code={code}
        historyHeadingId={historyHeadingId}
        isLoading={runsQ.isLoading}
        isError={runsQ.isError}
        points={landHistoryPoints}
      />
    </div>
  )
}
