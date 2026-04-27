import { cn } from './cn'
import { TZDate } from '@date-fns/tz'
import { format, formatDistanceToNow, isValid } from 'date-fns'
import { de as deLocale } from 'date-fns/locale/de'

const BERLIN = 'Europe/Berlin'

function parseStatusInstantToBerlin(value: string): TZDate | null {
  const t = value.trim()
  if (!t) return null
  const asBerlin = new TZDate(t, BERLIN)
  if (isValid(asBerlin)) return asBerlin
  const fallback = new Date(t)
  if (!isValid(fallback)) return null
  return new TZDate(fallback.getTime(), BERLIN)
}

export function StatusDateTime({
  value,
  className,
  variant = 'default',
  dateClassName,
  timeClassName,
  relativeClassName,
}: {
  value: string
  className?: string
  variant?: 'default' | 'kpi' | 'inline'
  dateClassName?: string
  timeClassName?: string
  relativeClassName?: string
}) {
  const berlin = parseStatusInstantToBerlin(value)
  if (!berlin) {
    return <span className={className}>{value}</span>
  }
  if (variant === 'kpi') {
    return (
      <span className={cn('inline-flex min-h-0 flex-col gap-1', className)}>
        <span className={cn('text-2xl font-semibold', dateClassName)}>
          {format(berlin, 'd. MMM yyyy', { locale: deLocale })}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
          <span className={cn('text-sm font-medium text-zinc-400', timeClassName)}>
            {format(berlin, 'HH:mm', { locale: deLocale })}
          </span>
          <span aria-hidden>·</span>
          <span className={cn('truncate text-sm font-medium text-zinc-500', relativeClassName)}>
            {formatDistanceToNow(berlin, { locale: deLocale, addSuffix: true })}
          </span>
        </span>
      </span>
    )
  }
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-baseline gap-1.5 text-sm text-zinc-300', className)}>
        <span>{format(berlin, 'PPp', { locale: deLocale })}</span>
        <span aria-hidden className={cn('text-zinc-500', timeClassName)}>
          ·
        </span>
        <span className={cn('text-zinc-500', relativeClassName)}>
          {formatDistanceToNow(berlin, { locale: deLocale, addSuffix: true })}
        </span>
      </span>
    )
  }
  return (
    <span className={cn('inline-flex min-h-0 flex-col gap-0.5 leading-snug', className)}>
      <span className="text-sm leading-snug">{format(berlin, 'PPp', { locale: deLocale })}</span>
      <span className={cn('text-xs leading-snug text-zinc-500', relativeClassName)}>
        {formatDistanceToNow(berlin, { locale: deLocale, addSuffix: true })}
      </span>
    </span>
  )
}
