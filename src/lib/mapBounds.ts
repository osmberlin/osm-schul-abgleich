import type { LandMapBbox } from './useLandMapBbox'

export type MapBoundsLike = {
  getWest(): number
  getSouth(): number
  getEast(): number
  getNorth(): number
}

export function boundsToBboxParam(bounds: MapBoundsLike): LandMapBbox {
  return [
    Number(bounds.getWest().toFixed(4)),
    Number(bounds.getSouth().toFixed(4)),
    Number(bounds.getEast().toFixed(4)),
    Number(bounds.getNorth().toFixed(4)),
  ]
}
