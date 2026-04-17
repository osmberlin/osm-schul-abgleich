import { STATE_FACET_MATCH_MODES } from './stateOverviewItemsSearch'
import { stateRouteApi } from './stateRouteApi'
import { useNavigate } from '@tanstack/react-router'

/**
 * URL-backed explorer filters for Bundesland overview (itemsjs facets + name scope + full-text).
 */
export function useStateOverviewExplorerFilter() {
  const search = stateRouteApi.useSearch()
  const navigate = useNavigate({ from: '/bundesland/$stateKey' })
  const exploreQ = search.lq ?? ''
  const nameScope = search.lscope ?? 'both'
  const matchModes = search.lmm ?? []
  const iscedLevels = search.lisc ?? []
  const geoBoundaryIssues = search.lgeo ?? []
  const schoolKinds = search.lsk ?? []

  function setExploreQ(nextValue: string) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => ({
        ...prev,
        lq: nextValue === '' ? undefined : nextValue,
      }),
    })
  }

  function setNameScope(nextValue: 'both' | 'official' | 'osm') {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => ({
        ...prev,
        lscope: nextValue === 'both' ? undefined : nextValue,
      }),
    })
  }

  function toggleMatchMode(mode: (typeof STATE_FACET_MATCH_MODES)[number], on: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => {
        const cur = prev.lmm ?? []
        const next = new Set(cur)
        if (on) next.add(mode)
        else next.delete(mode)
        const arr = [...next]
        return {
          ...prev,
          lmm: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function toggleIscedLevel(level: 'yes' | 'no', on: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => {
        const cur = prev.lisc ?? []
        const next = new Set(cur)
        if (on) next.add(level)
        else next.delete(level)
        const arr = [...next]
        return {
          ...prev,
          lisc: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function toggleGeoBoundaryIssue(v: 'yes' | 'no', on: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => {
        const cur = prev.lgeo ?? []
        const next = new Set(cur)
        if (on) next.add(v)
        else next.delete(v)
        const arr = [...next]
        return {
          ...prev,
          lgeo: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function toggleSchoolKind(kind: string, on: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => {
        const cur = prev.lsk ?? []
        const next = new Set(cur)
        if (on) next.add(kind)
        else next.delete(kind)
        const arr = [...next]
        return {
          ...prev,
          lsk: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function resetExplorer() {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => ({
        ...prev,
        lq: undefined,
        lscope: undefined,
        lmm: undefined,
        lisc: undefined,
        lgeo: undefined,
        lsk: undefined,
      }),
    })
  }

  return {
    exploreQ,
    setExploreQ,
    nameScope,
    setNameScope,
    matchModes,
    toggleMatchMode,
    iscedLevels,
    toggleIscedLevel,
    geoBoundaryIssues,
    toggleGeoBoundaryIssue,
    schoolKinds,
    toggleSchoolKind,
    resetExplorer,
  }
}
