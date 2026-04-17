import { defaultStringifySearch } from '@tanstack/react-router'

/** Query keys whose values should keep `/` and `,` visible in the address bar. */
const PRETTY_VALUE_KEYS = new Set(['map', 'bbox'])

/**
 * Encode like `URLSearchParams`, but leave `/` and `,` unescaped for selected keys
 * (TanStack’s default serializer always percent-encodes them via `URLSearchParams`).
 */
function encodeQueryValueForKey(key: string, decodedValue: string): string {
  if (PRETTY_VALUE_KEYS.has(key)) {
    return encodeURIComponent(decodedValue).replaceAll('%2F', '/').replaceAll('%2C', ',')
  }
  return encodeURIComponent(decodedValue)
}

/**
 * Drop-in replacement for TanStack Router’s `stringifySearch` that prettifies `map` and `bbox`.
 */
export function stringifySearchPretty(search: Record<string, unknown>): string {
  const defaultQs = defaultStringifySearch(search as Record<string, unknown>)
  if (!defaultQs) return ''
  const raw = defaultQs.startsWith('?') ? defaultQs.slice(1) : defaultQs
  if (!raw) return ''
  const params = new URLSearchParams(raw)
  const parts: string[] = []
  for (const [key, value] of params.entries()) {
    parts.push(`${encodeURIComponent(key)}=${encodeQueryValueForKey(key, value)}`)
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}
