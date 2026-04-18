import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from './stateMatchCategories'
import { stateRouteApi } from './stateRouteApi'
import { useNavigate } from '@tanstack/react-router'

/** Mutable full list + stable reference for default / “all categories” URL value. */
const DEFAULT_STATE_MATCH_CATEGORIES: StateMatchCategory[] = [...STATE_MATCH_CATEGORIES]

/** URL-synced legend / filter for Bundesland map + Trefferliste (`?cats=...`). */
export function useStateCategoryFilter() {
  const search = stateRouteApi.useSearch()
  const navigate = useNavigate({ from: '/bundesland/$stateKey' })
  const cats = search.cats ?? DEFAULT_STATE_MATCH_CATEGORIES

  const enabledSet = new Set(cats)

  function setCategoryEnabled(c: StateMatchCategory, enabled: boolean) {
    void navigate({
      unsafeRelative: 'path',
      replace: true,
      search: (prev) => {
        const cur = prev.cats ?? DEFAULT_STATE_MATCH_CATEGORIES
        const next = new Set(cur)
        if (enabled) next.add(c)
        else next.delete(c)
        const arr = DEFAULT_STATE_MATCH_CATEGORIES.filter((x) => next.has(x))
        return {
          ...prev,
          cats: arr.length === DEFAULT_STATE_MATCH_CATEGORIES.length ? undefined : arr,
        }
      },
    })
  }

  return {
    /** Categories currently enabled (drives list + map; synced with URL). */
    enabledCategories: cats,
    enabledSet,
    setCategoryEnabled,
    isCategoryEnabled: (c: StateMatchCategory) => enabledSet.has(c),
  }
}
