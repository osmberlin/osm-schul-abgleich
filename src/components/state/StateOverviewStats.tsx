import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from '../../lib/stateMatchCategories'
import { CategoryLegendSwatch } from '../CategoryLegendSwatch'
import { LayerToggleStatBlock, StatBlocksRow } from '../StatBlocks'

type CategoryCounts = Record<StateMatchCategory, number>

export function StateOverviewStats({
  catCounts,
  statsInputId,
  isCategoryEnabled,
  setCategoryEnabled,
}: {
  catCounts: CategoryCounts
  statsInputId: string
  isCategoryEnabled: (category: StateMatchCategory) => boolean
  setCategoryEnabled: (category: StateMatchCategory, enabled: boolean) => void
}) {
  return (
    <StatBlocksRow aria-label={de.state.legendRowAria} className="mb-6">
      {STATE_MATCH_CATEGORIES.map((cat) => {
        const count = catCounts[cat]
        const disabled = count === 0
        return (
          <LayerToggleStatBlock
            key={cat}
            inputId={`${statsInputId}-${cat}`}
            checked={disabled ? false : isCategoryEnabled(cat)}
            disabled={disabled}
            onChange={(on) => setCategoryEnabled(cat, on)}
            label={de.state.categoryLabel[cat]}
            labelAddon={
              cat === 'official_no_coord' ? (
                <button
                  type="button"
                  className="inline-flex rounded text-zinc-400 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  aria-label={de.state.officialNoCoordKpiInfoButton}
                  onClick={(e) => {
                    e.preventDefault()
                    window.alert(de.state.officialNoCoordKpiInfoAlert)
                  }}
                >
                  <InformationCircleIcon className="size-4" aria-hidden />
                </button>
              ) : undefined
            }
            value={formatDeInteger(count)}
            swatch={<CategoryLegendSwatch category={cat} />}
          />
        )
      })}
    </StatBlocksRow>
  )
}
