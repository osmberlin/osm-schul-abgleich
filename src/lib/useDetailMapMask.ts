import { stateSchuleRouteApi } from './stateRouteApi'
import { useNavigate } from '@tanstack/react-router'

/** URL-synced toggle for Bundesland mask on detail map (`?mask=0` to hide). */
export function useDetailMapMask() {
  const search = stateSchuleRouteApi.useSearch()
  const navigate = useNavigate({ from: '/bundesland/$stateKey/schule/$schoolKey' })
  const showMapMask = search.mask ?? true

  const setShowMapMask = (next: boolean) => {
    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        mask: next ? undefined : false,
      }),
    })
  }

  return { showMapMask, setShowMapMask }
}
