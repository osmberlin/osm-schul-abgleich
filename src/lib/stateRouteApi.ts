import { getRouteApi } from '@tanstack/react-router'

export const stateRouteApi = getRouteApi('/bundesland/$stateKey')
export const stateSchuleRouteApi = getRouteApi('/bundesland/$stateKey/schule/$schoolKey')
