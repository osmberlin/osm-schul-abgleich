import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { STATE_MATCH_CATEGORIES } from '../../lib/stateMatchCategories'
import { CategoryLegendSwatch } from '../CategoryLegendSwatch'
import { ReadOnlyStatBlock, StatBlocksRow } from '../StatBlocks'

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
      {STATE_MATCH_CATEGORIES.map((cat) => (
        <ReadOnlyStatBlock
          key={cat}
          swatch={<CategoryLegendSwatch category={cat} />}
          label={de.state.categoryLabel[cat]}
          labelAddon={
            cat === 'official_no_coord' ? (
              <button
                type="button"
                className="inline-flex rounded text-zinc-400 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                aria-label={de.state.officialNoCoordKpiInfoButton}
                onClick={() => window.alert(de.state.officialNoCoordKpiInfoAlert)}
              >
                <InformationCircleIcon className="size-4" aria-hidden />
              </button>
            ) : undefined
          }
          value={formatDeInteger(totals[cat])}
        />
      ))}
    </StatBlocksRow>
  )
}
