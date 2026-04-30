import type { ReactNode } from 'react'

export function StatBlocksRow({
  children,
  className = '',
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  className?: string
  'aria-label'?: string
}) {
  return (
    <dl
      aria-label={ariaLabel}
      className={
        `grid min-w-0 grid-cols-2 gap-x-3 gap-y-4 ` +
        `[&>*]:min-w-0 ` +
        `sm:flex sm:flex-row sm:flex-nowrap sm:items-stretch sm:gap-0 ` +
        `sm:[&>*]:flex-1 sm:[&>*]:basis-0 sm:[&>*]:border-t-0 sm:[&>*]:border-l sm:[&>*]:border-white/15 sm:[&>*]:pt-0 sm:[&>*]:pl-3 ` +
        `sm:[&>*]:first:border-l-0 sm:[&>*]:first:pl-0 ` +
        className
      }
    >
      {children}
    </dl>
  )
}

/** KPI cell: Zahl oben mit Farbkreis; darunter Checkbox + Label (volle Breite für Text). */
export function LayerToggleStatBlock({
  inputId,
  checked,
  onChange,
  swatch,
  label,
  value,
  disabled = false,
  labelAddon,
}: {
  inputId: string
  checked: boolean
  onChange: (next: boolean) => void
  swatch: ReactNode
  label: string
  value: ReactNode
  disabled?: boolean
  /** e.g. info button beside the label (Land overview: amtlich ohne Koordinaten). */
  labelAddon?: ReactNode
}) {
  const interactive =
    'group flex h-full flex-col-reverse justify-end gap-y-2 transition-colors hover:bg-zinc-800/60 focus-within:bg-zinc-800/60'
  const inert = 'flex h-full flex-col-reverse justify-end gap-y-2 opacity-55'

  return (
    <div className={disabled ? inert : interactive} aria-disabled={disabled || undefined}>
      <dt
        className={
          `min-w-0 text-base/7 text-zinc-400 transition-colors ` +
          (disabled ? '' : 'group-hover:text-zinc-200')
        }
      >
        <label
          htmlFor={inputId}
          className={
            `grid w-full min-w-0 grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1 ` +
            (disabled ? 'cursor-default' : 'cursor-pointer')
          }
        >
          <input
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className={
              `col-start-1 row-start-1 mt-0.5 size-4 shrink-0 rounded border-zinc-500 bg-zinc-800 text-emerald-500 focus:ring-emerald-600 ` +
              (disabled ? 'cursor-not-allowed opacity-60' : '')
            }
            checked={checked}
            onChange={(e) => {
              if (disabled) return
              onChange(e.target.checked)
            }}
          />
          <span className="col-start-2 min-w-0 text-sm leading-snug">
            {label}
            {labelAddon ? (
              <span className="ml-1 inline-flex shrink-0 align-middle">{labelAddon}</span>
            ) : null}
          </span>
        </label>
      </dt>
      <dd
        className={
          `text-xl font-semibold tracking-tight text-pretty text-zinc-100 tabular-nums sm:text-2xl md:text-3xl ` +
          (disabled ? '' : 'transition-colors group-hover:text-white')
        }
      >
        <label
          htmlFor={inputId}
          className={`flex min-w-0 items-center gap-2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <span className="inline-flex shrink-0 items-center">{swatch}</span>
          <span className="min-w-0">{value}</span>
        </label>
      </dd>
    </div>
  )
}

/** Read-only KPI cell (Startseite); Farbkreis bei der Zahl, Label darunter volle Breite. */
export function ReadOnlyStatBlock({
  swatch,
  label,
  value,
  labelAddon,
}: {
  swatch: ReactNode
  label: string
  value: ReactNode
  labelAddon?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col-reverse justify-end gap-y-2">
      <dt className="min-w-0 text-base/7 text-zinc-400">
        <span className="flex min-w-0 flex-nowrap items-center gap-1 text-sm leading-snug">
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
            {label}
          </span>
          {labelAddon ? <span className="shrink-0">{labelAddon}</span> : null}
        </span>
      </dt>
      <dd className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight text-pretty text-zinc-100 tabular-nums sm:text-2xl md:text-3xl">
        <span className="inline-flex shrink-0 items-center">{swatch}</span>
        <span className="min-w-0">{value}</span>
      </dd>
    </div>
  )
}
