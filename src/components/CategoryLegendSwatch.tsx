import type { LandMatchCategory } from '../lib/landMatchCategories'
import {
  MATCH_CATEGORY_SWATCH_CLASSES,
  OFFICIAL_NO_COORD_SWATCH_CLASSES,
} from '../lib/matchCategoryTheme'

/** Same nested-circle language as map halo + core (LandMap). */
export function CategoryLegendSwatch({
  category,
  innerClassName = 'size-1.5',
}: {
  category: LandMatchCategory
  /** Smaller inner dot (e.g. `size-1`) so outer halo reads better in legend tiles. */
  innerClassName?: string
}) {
  const c = MATCH_CATEGORY_SWATCH_CLASSES[category]
  return (
    <div className={`flex-none rounded-full p-1 ${c.outer}`} aria-hidden>
      <div className={`rounded-full ${c.inner} ${innerClassName}`} />
    </div>
  )
}

/** Summary-KPI `official_no_coord` (kein `LandMatchCategory`). */
export function OfficialNoCoordLegendSwatch() {
  const c = OFFICIAL_NO_COORD_SWATCH_CLASSES
  return (
    <div className={`flex-none rounded-full p-1 ${c.outer}`} aria-hidden>
      <div className={`size-1.5 rounded-full ${c.inner}`} />
    </div>
  )
}
