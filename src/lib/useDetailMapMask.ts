import { parseAsBoolean, useQueryState } from 'nuqs'

const detailMapMaskParser = parseAsBoolean.withDefault(true).withOptions({ history: 'replace' })

/** URL-synced toggle for Bundesland mask on detail map (`?mask=0` to hide). */
export function useDetailMapMask() {
  const [showMapMask, setShowMapMask] = useQueryState('mask', detailMapMaskParser)
  return { showMapMask, setShowMapMask }
}
