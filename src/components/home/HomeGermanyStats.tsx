import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { LAND_MATCH_CATEGORIES } from '../../lib/landMatchCategories'
import { CategoryLegendSwatch, OfficialNoCoordLegendSwatch } from '../CategoryLegendSwatch'
import { ReadOnlyStatBlock, StatBlocksRow } from '../StatBlocks'
import { InformationCircleIcon } from '@heroicons/react/20/solid'

type GermanyTotals = {
  matched: number
  official_only: number
  osm_only: number
  match_ambiguous: number
  official_no_coord: number
}

export function HomeGermanyStats({ totals }: { totals: GermanyTotals }) {
  return (
    <StatBlocksRow aria-label={de.home.globalKpiAria} className="mb-6">
      {LAND_MATCH_CATEGORIES.map((cat) => (
        <ReadOnlyStatBlock
          key={cat}
          swatch={<CategoryLegendSwatch category={cat} />}
          label={de.land.categoryLabel[cat]}
          value={formatDeInteger(totals[cat])}
        />
      ))}
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
        value={formatDeInteger(totals.official_no_coord)}
      />
    </StatBlocksRow>
  )
}
