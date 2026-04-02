/** Calendar date in Europe/Berlin as `YYYY-MM-DD` (for bucketing pipeline runs / charts). */
const berlinDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function berlinCalendarDateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return berlinDateFormatter.format(d)
}
