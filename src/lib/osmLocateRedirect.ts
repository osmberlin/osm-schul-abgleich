import { fetchOsmCentroidOverpass } from './fetchOsmCentroidOverpass'
import type { OsmStyleMapTriple } from './osmStyleMapQueryParam'
import { serializeOsmStyleMapSearchParam } from './osmStyleMapQueryParam'
import { parseOsmIdInput } from './parseOsmIdInput'
import { resolveStateCodeForLonLat } from './stateCodeForLonLatFromBoundaries'
import { redirect } from '@tanstack/react-router'

const OSM_LOCATE_ZOOM = 16

function mapTripleForCentroid(lon: number, lat: number): OsmStyleMapTriple {
  return [OSM_LOCATE_ZOOM, lat, lon]
}

/**
 * TanStack Router `beforeLoad` helper: if `osm` is non-empty, resolve via Overpass + Bundesland
 * and **throw** `redirect` to `/bundesland/$stateKey?map=…` or to `/?osmLocateErr=…` on failure.
 * If `osm` is empty, returns normally (no-op).
 */
export async function runOsmLocateRedirect(osmRaw: string): Promise<void> {
  const osm = osmRaw.trim()
  if (!osm) return

  const parsed = parseOsmIdInput(osm)
  if (!parsed) {
    throw redirect({
      to: '/',
      search: { osmLocateErr: 'invalid' },
      replace: true,
    })
  }

  let lon: number
  let lat: number
  try {
    ;[lon, lat] = await fetchOsmCentroidOverpass(parsed)
  } catch {
    throw redirect({
      to: '/',
      search: { osmLocateErr: 'fetch' },
      replace: true,
    })
  }

  const stateKey = await resolveStateCodeForLonLat(lon, lat)
  if (!stateKey) {
    throw redirect({
      to: '/',
      search: { osmLocateErr: 'outside' },
      replace: true,
    })
  }

  const mapStr = serializeOsmStyleMapSearchParam(mapTripleForCentroid(lon, lat))
  throw redirect({
    to: '/bundesland/$stateKey',
    params: { stateKey },
    search: { map: mapStr },
    replace: true,
  })
}
