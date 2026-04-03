import { landMapBboxTupleSchema } from './zodGeo'
import { createParser, useQueryState } from 'nuqs'
import { useCallback } from 'react'

/** Map viewport bbox in WGS84: west, south, east, north (URL `?bbox=`). */
export type LandMapBbox = readonly [west: number, south: number, east: number, north: number]

const landMapBboxParser = createParser({
  parse(value) {
    const parts = value.split(',').map((x) => Number.parseFloat(x.trim()))
    const r = landMapBboxTupleSchema.safeParse(parts)
    return r.success ? (r.data as LandMapBbox) : null
  },
  serialize(value: LandMapBbox) {
    return value.map((n) => n.toFixed(4)).join(',')
  },
}).withOptions({ history: 'replace' })

/**
 * URL-synced map list filter for the Bundesland page (`?bbox=west,south,east,north`).
 */
export function useLandMapBbox() {
  const [bbox, setBbox] = useQueryState('bbox', landMapBboxParser)

  const clearBbox = useCallback(() => {
    void setBbox(null)
  }, [setBbox])

  return { bbox, setBbox, clearBbox }
}
