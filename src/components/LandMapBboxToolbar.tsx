import { useMap } from 'react-map-gl/maplibre'
import { de } from '../i18n/de'
import { boundsToBboxParam } from '../lib/mapBounds'
import type { LandMapBbox } from '../lib/useLandMapBbox'

const btnBase =
  'pointer-events-auto relative inline-flex items-center bg-white px-3 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-300 ring-inset hover:bg-zinc-50 focus:z-10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600 dark:hover:bg-zinc-700/80'

export function LandMapBboxToolbar({
  mapId,
  mapReady,
  hasUrlBbox,
  visible,
  onApplyBbox,
  onClearBbox,
}: {
  mapId: string
  mapReady: boolean
  hasUrlBbox: boolean
  visible: boolean
  onApplyBbox: (bbox: LandMapBbox) => void
  onClearBbox: () => void
}) {
  const mapRef = useMap()[mapId]

  if (!visible) return null

  const apply = () => {
    const map = mapRef?.getMap()
    if (!map) return
    onApplyBbox(boundsToBboxParam(map.getBounds()))
  }

  const disabled = !mapReady || !mapRef

  return (
    <fieldset className="pointer-events-none absolute bottom-3 left-1/2 z-10 m-0 inline-flex min-w-0 -translate-x-1/2 isolate rounded-md border-0 p-0 shadow-xs dark:shadow-none">
      <legend className="sr-only">{de.land.mapBboxToolbarAria}</legend>
      <button
        type="button"
        disabled={disabled}
        onClick={apply}
        className={`${btnBase} ${hasUrlBbox ? 'rounded-l-md' : 'rounded-md'}`}
      >
        {de.land.mapFilterListButton}
      </button>
      {hasUrlBbox && (
        <button
          type="button"
          disabled={disabled}
          onClick={onClearBbox}
          className={`${btnBase} -ml-px rounded-r-md`}
        >
          {de.land.mapFilterClear}
        </button>
      )}
    </fieldset>
  )
}
