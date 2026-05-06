import { de } from '../i18n/de'
import { cn } from '../lib/cn'
import { formatDeInteger } from '../lib/formatNumber'
import { MATCH_RADIUS_M } from '../lib/matchRadius'

export type DetailMapMaskToggleProps = {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  className?: string
}

/** Switch + label for the school detail map dim mask (match radius context). */
export function DetailMapMaskToggle({
  checked,
  onCheckedChange,
  className,
}: DetailMapMaskToggleProps) {
  return (
    <label className={cn('inline-flex shrink-0 cursor-pointer items-center gap-1.5', className)}>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          aria-label={`${de.detail.mapMask}, ${formatDeInteger(MATCH_RADIUS_M)} m`}
          className="peer sr-only"
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span className="peer-checked:ring-brand-500/50 absolute inset-0 rounded-full bg-brand-950/90 ring-1 ring-brand-800/60 transition-colors duration-200 ease-in-out ring-inset peer-checked:bg-brand-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500" />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-brand-50 shadow-sm ring-1 ring-brand-900/35 transition-transform duration-200 ease-in-out peer-checked:translate-x-4" />
      </span>
      <span className="flex flex-col text-xs leading-snug text-zinc-400">
        <span>{de.detail.mapMask}</span>
        <span>{formatDeInteger(MATCH_RADIUS_M)}m</span>
      </span>
    </label>
  )
}
