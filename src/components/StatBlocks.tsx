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
      className={`flex min-w-0 flex-row flex-nowrap gap-x-0 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-0 [&>*]:border-l [&>*]:border-zinc-200 [&>*]:pl-3 [&>*]:first:border-l-0 [&>*]:first:pl-0 dark:[&>*]:border-white/15 ${className}`}
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
}: {
  inputId: string
  checked: boolean
  onChange: (next: boolean) => void
  swatch: ReactNode
  label: string
  value: ReactNode
  disabled?: boolean
}) {
  const interactive =
    'group flex flex-col-reverse gap-y-2 transition-colors hover:bg-zinc-200/50 focus-within:bg-zinc-200/50 dark:hover:bg-zinc-800/60 dark:focus-within:bg-zinc-800/60'
  const inert = 'flex flex-col-reverse gap-y-2 opacity-55'

  return (
    <div className={disabled ? inert : interactive} aria-disabled={disabled || undefined}>
      <dt
        className={
          `min-w-0 text-base/7 text-zinc-600 transition-colors dark:text-zinc-400 ` +
          (disabled ? '' : 'group-hover:text-zinc-800 dark:group-hover:text-zinc-200')
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
              `col-start-1 row-start-1 mt-0.5 size-4 shrink-0 rounded border-zinc-400 text-emerald-700 focus:ring-emerald-600 dark:border-zinc-500 dark:bg-zinc-800 dark:text-emerald-500 ` +
              (disabled ? 'cursor-not-allowed opacity-60' : '')
            }
            checked={checked}
            onChange={(e) => {
              if (disabled) return
              onChange(e.target.checked)
            }}
          />
          <span className="col-start-2 min-w-0 text-sm leading-snug">{label}</span>
        </label>
      </dt>
      <dd
        className={
          `text-pretty font-semibold text-2xl tracking-tight text-zinc-900 tabular-nums dark:text-zinc-100 sm:text-3xl ` +
          (disabled
            ? ''
            : 'transition-colors group-hover:text-zinc-950 dark:group-hover:text-white')
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

/** Read-only KPI cell (Startseite, `official_no_coord`); Farbkreis bei der Zahl, Label darunter volle Breite. */
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
    <div className="flex flex-col-reverse gap-y-2">
      <dt className="min-w-0 text-base/7 text-zinc-600 dark:text-zinc-400">
        <span className="flex min-w-0 flex-nowrap items-center gap-1 text-sm leading-snug">
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={label}>
            {label}
          </span>
          {labelAddon ? <span className="shrink-0">{labelAddon}</span> : null}
        </span>
      </dt>
      <dd className="flex min-w-0 items-center gap-2 text-pretty font-semibold text-2xl tracking-tight text-zinc-900 tabular-nums dark:text-zinc-100 sm:text-3xl">
        <span className="inline-flex shrink-0 items-center">{swatch}</span>
        <span className="min-w-0">{value}</span>
      </dd>
    </div>
  )
}
