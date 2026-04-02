import { parseAsArrayOf, parseAsStringLiteral, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { LAND_MATCH_CATEGORIES, type LandMatchCategory } from './landMatchCategories'

/** Mutable full list + stable reference for nuqs default / “all categories” URL value. */
const DEFAULT_LAND_MATCH_CATEGORIES: LandMatchCategory[] = [...LAND_MATCH_CATEGORIES]

const categoryItemParser = parseAsStringLiteral(LAND_MATCH_CATEGORIES)

const catsParser = parseAsArrayOf(categoryItemParser)
  .withDefault(DEFAULT_LAND_MATCH_CATEGORIES)
  .withOptions({ history: 'replace' })

/**
 * URL-synced legend / filter for Bundesland map + Trefferliste (`?cats=matched&cats=osm_only` …).
 * Same idea as the OSM-Grenzabgleich `useAreaReportCategoryFilter`.
 */
export function useLandCategoryFilter() {
  const [cats, setCats] = useQueryState('cats', catsParser)

  const enabledSet = useMemo(() => new Set(cats), [cats])

  const setCategoryEnabled = useCallback(
    (c: LandMatchCategory, enabled: boolean) => {
      void setCats((prev) => {
        const cur = prev ?? DEFAULT_LAND_MATCH_CATEGORIES
        const next = new Set(cur)
        if (enabled) next.add(c)
        else next.delete(c)
        const arr = DEFAULT_LAND_MATCH_CATEGORIES.filter((x) => next.has(x))
        return arr.length === DEFAULT_LAND_MATCH_CATEGORIES.length
          ? DEFAULT_LAND_MATCH_CATEGORIES
          : arr
      })
    },
    [setCats],
  )

  return {
    /** Categories currently enabled (drives list + map; synced with URL). */
    enabledCategories: cats,
    enabledSet,
    setCategoryEnabled,
    isCategoryEnabled: (c: LandMatchCategory) => enabledSet.has(c),
  }
}
