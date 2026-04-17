import { stateSchuleRouteApi } from './stateRouteApi'
import { useNavigate } from '@tanstack/react-router'

/**
 * Path params are URI-decoded by TanStack Router. `schoolKey` is the bundle row id
 * (`matches[].key` in schools_matches.json), not necessarily `officialId`.
 */
export function useSchoolDetailRoute() {
  const { stateKey, schoolKey } = stateSchuleRouteApi.useParams()
  const navigate = useNavigate({ from: '/bundesland/$stateKey/schule/$schoolKey' })
  return { stateKey, schoolKey, navigate }
}
