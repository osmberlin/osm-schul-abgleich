import { StateOverviewFiltersDisclosure } from '../components/state/StateOverviewFiltersDisclosure'
import { StateOverviewHistorySection } from '../components/state/StateOverviewHistorySection'
import { StateOverviewMatchList } from '../components/state/StateOverviewMatchList'
import { StateOverviewStats } from '../components/state/StateOverviewStats'
import { StateMap } from '../components/StateMap'
import { de } from '../i18n/de'
import { stateHistoryFromRuns } from '../lib/matchHistoryFromRuns'
import {
  buildOfficialSchoolLonLatIndexFromPoints,
  matchesToOverviewMapPoints,
  matchRowIncludedWhenStateMapBboxActive,
} from '../lib/matchRowInBbox'
import { runsQueryOptions, summaryQueryOptions } from '../lib/sharedDatasetQueries'
import {
  stateBoundaryQueryOptions,
  stateListSearchQueryOptions,
  stateOsmMetaQueryOptions,
  stateOverviewQueryOptions,
} from '../lib/stateDatasetQueries'
import {
  collectFilteredIdsFromSearchResult,
  createStateMatchItemsJsEngine,
  searchStateMatchesWithExplorer,
} from '../lib/stateOverviewItemsSearch'
import { useStateCategoryFilter } from '../lib/useStateCategoryFilter'
import { useStateOverviewExplorerFilter } from '../lib/useStateOverviewExplorerFilter'
import { useStateOverviewMapState } from '../lib/useStateOverviewMapState'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { MapProvider } from 'react-map-gl/maplibre'

export function StateOverview() {
  const { stateKey } = useParams({ strict: false }) as { stateKey: string }
  const navigate = useNavigate()
  const statsInputId = useId()
  const historyHeadingId = useId()
  const { enabledSet, enabledCategories, setCategoryEnabled, isCategoryEnabled } =
    useStateCategoryFilter()
  const { mapCamera, setMapCamera, bboxFilter, setBboxFilter, clearBboxFilter } =
    useStateOverviewMapState()
  const explorer = useStateOverviewExplorerFilter()
  const hasExplorerSearchParams =
    explorer.exploreQ.trim() !== '' ||
    explorer.nameScope !== 'both' ||
    explorer.matchModes.length > 0 ||
    explorer.iscedLevels.length > 0 ||
    explorer.geoBoundaryIssues.length > 0 ||
    explorer.schoolKinds.length > 0 ||
    explorer.osmAmenities.length > 0
  const [listSearchRequested, setListSearchRequested] = useState(false)
  const showSearch = listSearchRequested || hasExplorerSearchParams
  const showList = listSearchRequested

  const summaryQ = useQuery(summaryQueryOptions())
  const runsQ = useQuery(runsQueryOptions())

  const stateSummary = summaryQ.data?.states.find((l) => l.code === stateKey)

  const stateHistoryPoints = runsQ.data ? stateHistoryFromRuns(runsQ.data.runs, stateKey) : []

  const dataQ = useQuery({ ...stateOverviewQueryOptions(stateKey), enabled: !!stateKey })
  const boundaryQ = useQuery({ ...stateBoundaryQueryOptions(stateKey), enabled: !!stateKey })
  const listSearchQ = useQuery({
    ...stateListSearchQueryOptions(stateKey),
    enabled: !!stateKey && showSearch,
  })
  const metaQ = useQuery({ ...stateOsmMetaQueryOptions(stateKey), enabled: !!stateKey })

  const mapMatches = dataQ.data?.matches ?? []
  const listSearchMatches = listSearchQ.data ?? []

  const officialPoints = dataQ.data?.officialPoints
  const officialLonLatIndex =
    !officialPoints || Object.keys(officialPoints).length === 0
      ? null
      : buildOfficialSchoolLonLatIndexFromPoints(officialPoints)

  const mapMatchesAfterBbox = !bboxFilter
    ? mapMatches
    : mapMatches.filter((r) =>
        matchRowIncludedWhenStateMapBboxActive(r, bboxFilter, officialLonLatIndex),
      )
  const listSearchMatchesAfterBbox = !bboxFilter
    ? listSearchMatches
    : listSearchMatches.filter((r) =>
        matchRowIncludedWhenStateMapBboxActive(r, bboxFilter, officialLonLatIndex),
      )

  const itemsEngine = createStateMatchItemsJsEngine(listSearchMatchesAfterBbox)
  const exploreResult =
    !showSearch || listSearchMatchesAfterBbox.length === 0
      ? null
      : searchStateMatchesWithExplorer(itemsEngine, {
          query: explorer.exploreQ,
          nameScope: explorer.nameScope,
          matchModes: explorer.matchModes,
          iscedLevels: explorer.iscedLevels,
          geoBoundaryIssues: explorer.geoBoundaryIssues,
          schoolKinds: explorer.schoolKinds,
          osmAmenities: explorer.osmAmenities,
        })
  const explorerIds = exploreResult ? collectFilteredIdsFromSearchResult(exploreResult) : null

  const mapMatchesAfterExplorer = !explorerIds
    ? mapMatchesAfterBbox
    : mapMatchesAfterBbox.filter((r) => explorerIds.has(r.key))
  const listSearchMatchesAfterExplorer = !explorerIds
    ? listSearchMatchesAfterBbox
    : listSearchMatchesAfterBbox.filter((r) => explorerIds.has(r.key))

  const catCounts = {
    matched: 0,
    official_only: 0,
    osm_only: 0,
    match_ambiguous: 0,
    official_no_coord: 0,
  }
  for (const r of mapMatchesAfterExplorer) {
    catCounts[r.category]++
  }

  const visibleMapMatches = mapMatchesAfterExplorer.filter((r) => enabledSet.has(r.category))
  const listMatches = listSearchMatchesAfterExplorer.filter((r) => enabledSet.has(r.category))

  const mapMatchPoints = matchesToOverviewMapPoints(visibleMapMatches, officialLonLatIndex)

  if (dataQ.isLoading || summaryQ.isLoading) {
    return <p className="text-zinc-400">{de.state.loading}</p>
  }
  if (dataQ.isError || !dataQ.data) {
    return <p className="text-red-400">{de.state.error}</p>
  }

  return (
    <div>
      {stateSummary?.osmSource === 'cached' && (
        <div
          className="mb-4 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-100"
          role="status"
        >
          {de.state.osmCachedBanner}
          {metaQ.data?.overpassQueriedAt != null && (
            <span className="mt-1 block text-xs opacity-90">
              Stand: {String(metaQ.data.overpassResponseTimestamp ?? metaQ.data.overpassQueriedAt)}
            </span>
          )}
        </div>
      )}

      <StateOverviewStats
        catCounts={catCounts}
        statsInputId={statsInputId}
        isCategoryEnabled={isCategoryEnabled}
        setCategoryEnabled={setCategoryEnabled}
      />
      <div className="mt-4 mb-6 flex flex-wrap gap-2">
        {!showSearch && (
          <button
            type="button"
            onClick={() => setListSearchRequested(true)}
            className="rounded-md border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-900/40"
          >
            {de.state.showSearchButton}
          </button>
        )}
      </div>

      {showSearch && (
        <>
          {listSearchQ.isLoading ? (
            <p className="mb-4 text-sm text-zinc-400">{de.state.loadingListSearch}</p>
          ) : (
            <StateOverviewFiltersDisclosure
              exploreQ={explorer.exploreQ}
              setExploreQ={(q) => {
                void explorer.setExploreQ(q)
              }}
              nameScope={explorer.nameScope}
              setNameScope={(s) => {
                void explorer.setNameScope(s)
              }}
              matchModes={explorer.matchModes}
              toggleMatchMode={explorer.toggleMatchMode}
              iscedLevels={explorer.iscedLevels}
              toggleIscedLevel={explorer.toggleIscedLevel}
              geoBoundaryIssues={explorer.geoBoundaryIssues}
              toggleGeoBoundaryIssue={explorer.toggleGeoBoundaryIssue}
              schoolKinds={explorer.schoolKinds}
              toggleSchoolKind={explorer.toggleSchoolKind}
              osmAmenities={explorer.osmAmenities}
              toggleOsmAmenity={explorer.toggleOsmAmenity}
              resetExplorer={explorer.resetExplorer}
              aggregations={exploreResult?.data.aggregations}
              filteredCount={listSearchMatchesAfterExplorer.length}
              bboxTotalCount={listSearchMatchesAfterBbox.length}
            />
          )}
        </>
      )}

      {enabledCategories.length === 0 ? (
        <div
          className="flex h-[440px] items-center justify-center rounded-lg border border-zinc-700 px-4 text-center"
          role="status"
        >
          <p className="text-sm text-zinc-400">{de.state.mapNoVisibleCategories}</p>
        </div>
      ) : (
        <MapProvider>
          <StateMap
            matchPoints={mapMatchPoints}
            height={440}
            enabledCategories={enabledSet}
            stateCode={stateKey}
            stateBoundary={boundaryQ.data ?? null}
            mapCamera={mapCamera}
            onMapCameraChange={setMapCamera}
            bboxFilter={bboxFilter}
            onApplyBboxFilter={setBboxFilter}
            onClearBboxFilter={clearBboxFilter}
            onSchoolClick={(schoolKey) =>
              void navigate({
                to: '/bundesland/$stateKey/schule/$schoolKey',
                params: { stateKey, schoolKey },
                search: (prev) => ({
                  ...prev,
                  map: undefined,
                  bbox: undefined,
                }),
              })
            }
          />
        </MapProvider>
      )}

      {!showList && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setListSearchRequested(true)}
            className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
          >
            {de.state.showListButton}
          </button>
        </div>
      )}

      {showList && (
        <>
          {listSearchQ.isLoading ? (
            <p className="mt-8 text-sm text-zinc-400">{de.state.loadingListSearch}</p>
          ) : (
            <StateOverviewMatchList
              code={stateKey}
              listMatches={listMatches}
              matchesLength={listSearchMatches.length}
              enabledCategoriesLength={enabledCategories.length}
              visibleMatchesLength={listMatches.length}
              listBboxActive={bboxFilter != null}
              matchesAfterBboxCount={listSearchMatchesAfterBbox.length}
              exploreFilteredCount={listSearchMatchesAfterExplorer.length}
            />
          )}
        </>
      )}

      <StateOverviewHistorySection
        code={stateKey}
        historyHeadingId={historyHeadingId}
        isLoading={runsQ.isLoading}
        isError={runsQ.isError}
        points={stateHistoryPoints}
      />
    </div>
  )
}
