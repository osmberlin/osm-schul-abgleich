import { parseAsBoolean, useQueryState } from 'nuqs'

const detailShowOtherDataParser = parseAsBoolean
  .withDefault(false)
  .withOptions({ history: 'replace' })

/** URL-synced toggle for showing additional schools on detail map (`?other=1`). */
export function useDetailShowOtherData() {
  const [showOtherData, setShowOtherData] = useQueryState('other', detailShowOtherDataParser)
  return { showOtherData, setShowOtherData }
}
