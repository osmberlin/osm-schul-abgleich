import {
  STATE_FACET_MATCH_MODES,
  STATE_FACET_OSM_AMENITY,
  STATE_FACET_SCHOOL_FORM_COMBO,
  STATE_FACET_SCHOOL_FORM_FAMILY,
} from './stateOverviewItemsSearch'
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
  const osmAmenities = search.loa ?? []
  const schoolFormFamilies = search.lsfam ?? []
  const schoolFormCombos = search.lscombo ?? []

  function setExploreQ(nextValue: string) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
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
      resetScroll: false,
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
      resetScroll: false,
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

  function setIscedLevel(level: 'all' | 'yes' | 'no') {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
      search: (prev) => ({
        ...prev,
        lisc: level === 'all' ? undefined : [level],
      }),
    })
  }

  function toggleGeoBoundaryIssue(v: 'yes' | 'no', on: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
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
      resetScroll: false,
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

  function toggleOsmAmenity(v: (typeof STATE_FACET_OSM_AMENITY)[number], on: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
      search: (prev) => {
        const cur = prev.loa ?? []
        const next = new Set(cur)
        if (on) next.add(v)
        else next.delete(v)
        const arr = [...next].filter((x): x is (typeof STATE_FACET_OSM_AMENITY)[number] =>
          STATE_FACET_OSM_AMENITY.includes(x as (typeof STATE_FACET_OSM_AMENITY)[number]),
        )
        return {
          ...prev,
          loa: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function setSchoolFormFamilies(values: (typeof STATE_FACET_SCHOOL_FORM_FAMILY)[number][]) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
      search: (prev) => {
        const arr = values.filter((x): x is (typeof STATE_FACET_SCHOOL_FORM_FAMILY)[number] =>
          STATE_FACET_SCHOOL_FORM_FAMILY.includes(
            x as (typeof STATE_FACET_SCHOOL_FORM_FAMILY)[number],
          ),
        )
        return {
          ...prev,
          lsfam: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function setSchoolFormCombos(values: (typeof STATE_FACET_SCHOOL_FORM_COMBO)[number][]) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
      search: (prev) => {
        const arr = values.filter((x): x is (typeof STATE_FACET_SCHOOL_FORM_COMBO)[number] =>
          STATE_FACET_SCHOOL_FORM_COMBO.includes(
            x as (typeof STATE_FACET_SCHOOL_FORM_COMBO)[number],
          ),
        )
        return {
          ...prev,
          lscombo: arr.length === 0 ? undefined : arr,
        }
      },
    })
  }

  function resetExplorer() {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      resetScroll: false,
      search: (prev) => ({
        ...prev,
        lq: undefined,
        lscope: undefined,
        lmm: undefined,
        lisc: undefined,
        lgeo: undefined,
        lsk: undefined,
        loa: undefined,
        lsfam: undefined,
        lscombo: undefined,
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
    setIscedLevel,
    geoBoundaryIssues,
    toggleGeoBoundaryIssue,
    schoolKinds,
    toggleSchoolKind,
    osmAmenities,
    toggleOsmAmenity,
    schoolFormFamilies,
    setSchoolFormFamilies,
    schoolFormCombos,
    setSchoolFormCombos,
    resetExplorer,
  }
}
