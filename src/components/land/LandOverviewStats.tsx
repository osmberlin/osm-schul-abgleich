import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { LAND_MATCH_CATEGORIES, type LandMatchCategory } from '../../lib/landMatchCategories'
import { CategoryLegendSwatch, OfficialNoCoordLegendSwatch } from '../CategoryLegendSwatch'
import { LayerToggleStatBlock, ReadOnlyStatBlock, StatBlocksRow } from '../StatBlocks'
import { InformationCircleIcon } from '@heroicons/react/20/solid'

type CategoryCounts = Record<LandMatchCategory, number>

export function LandOverviewStats({
  catCounts,
  officialNoCoord,
  statsInputId,
  isCategoryEnabled,
  setCategoryEnabled,
}: {
  catCounts: CategoryCounts
  officialNoCoord: number
  statsInputId: string
  isCategoryEnabled: (category: LandMatchCategory) => boolean
  setCategoryEnabled: (category: LandMatchCategory, enabled: boolean) => void
}) {
  return (
    <StatBlocksRow aria-label={de.land.legendRowAria} className="mb-6">
      {LAND_MATCH_CATEGORIES.map((cat) => {
        const count = catCounts[cat]
        const disabled = count === 0
        return (
          <LayerToggleStatBlock
            key={cat}
            inputId={`${statsInputId}-${cat}`}
            checked={disabled ? false : isCategoryEnabled(cat)}
            disabled={disabled}
            onChange={(on) => setCategoryEnabled(cat, on)}
            label={de.land.categoryLabel[cat]}
            value={formatDeInteger(count)}
            swatch={<CategoryLegendSwatch category={cat} />}
          />
        )
      })}
      <ReadOnlyStatBlock
        swatch={<OfficialNoCoordLegendSwatch />}
        label={de.land.officialNoCoordKpi}
        labelAddon={
          <button
            type="button"
            className="inline-flex rounded text-zinc-400 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            aria-label={de.land.officialNoCoordKpiInfoButton}
            onClick={() => window.alert(de.land.officialNoCoordKpiInfoAlert)}
          >
            <InformationCircleIcon className="size-4" aria-hidden />
          </button>
        }
        value={formatDeInteger(officialNoCoord)}
      />
    </StatBlocksRow>
  )
}
