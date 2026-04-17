import { de } from '../i18n/de'
import type { StateMapBbox } from '../lib/useStateMapBbox'

const btnBase =
  'pointer-events-auto relative inline-flex items-center bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-zinc-600 ring-inset hover:bg-zinc-700/80 focus:z-10 disabled:cursor-not-allowed disabled:opacity-50'

export function StateMapBboxToolbar({
  hasFilterBbox,
  currentBbox,
  onApplyBbox,
  onClearBbox,
}: {
  hasFilterBbox: boolean
  currentBbox: StateMapBbox | null
  onApplyBbox: (bbox: StateMapBbox) => void
  onClearBbox: () => void
}) {
  const apply = () => {
    if (!currentBbox) return
    onApplyBbox(currentBbox)
  }

  const disabled = currentBbox == null

  return (
    <fieldset className="pointer-events-none absolute bottom-3 left-1/2 isolate z-10 m-0 inline-flex min-w-0 -translate-x-1/2 rounded-md border-0 p-0 shadow-none">
      <legend className="sr-only">{de.state.mapBboxToolbarAria}</legend>
      <button
        type="button"
        disabled={disabled}
        onClick={apply}
        className={`${btnBase} ${hasFilterBbox ? 'rounded-l-md' : 'rounded-md'}`}
      >
        {de.state.mapFilterListButton}
      </button>
      {hasFilterBbox && (
        <button
          type="button"
          disabled={disabled}
          onClick={onClearBbox}
          className={`${btnBase} -ml-px rounded-r-md`}
        >
          {de.state.mapFilterClear}
        </button>
      )}
    </fieldset>
  )
}
