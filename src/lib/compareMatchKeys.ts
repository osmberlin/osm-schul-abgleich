/**
 * Shared normalization helpers for matcher + UI compare table.
 * Keep these as the single source of truth to avoid drift.
 */
const COMPARE_KEY_ALIASES: Record<string, string> = {
  zip: 'postcode',
}

export function toComparableString(v: unknown): string | null {
  if (v == null || typeof v === 'object') return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * Canonical key for property compare: OSM `contact:email` ↔ official `email`,
 * `addr:city` ↔ official `city`, manual aliases like `zip` ↔ `postcode`, etc.
 */
export function canonicalPropertyKey(key: string): string {
  let k = key
  if (k.startsWith('contact:')) k = k.slice('contact:'.length)
  else if (k.startsWith('addr:')) k = k.slice('addr:'.length)
  return COMPARE_KEY_ALIASES[k] ?? k
}

export function flattenOfficialForCompare(o: Record<string, unknown>): Map<string, string> {
  const m = new Map<string, string>()
  for (const [k, v] of Object.entries(o)) {
    const c = canonicalPropertyKey(k)
    if (c.startsWith('_')) continue
    const s = toComparableString(v)
    if (s == null) continue
    m.set(c, s)
  }
  return m
}

/**
 * Bare keys, `addr:*`, and `contact:*` share one canonical key each; on conflict,
 * `addr:*` overrides bare, `contact:*` overrides both.
 */
export function flattenOsmTagsForCompare(osm: Record<string, string>): Map<string, string> {
  const fromBare = new Map<string, string>()
  const fromAddr = new Map<string, string>()
  const fromContact = new Map<string, string>()
  for (const [k, v] of Object.entries(osm)) {
    const c = canonicalPropertyKey(k)
    if (c.startsWith('_')) continue
    const s = toComparableString(v)
    if (s == null) continue
    if (k.startsWith('_pipeline')) continue
    if (k.startsWith('contact:')) {
      fromContact.set(c, s)
    } else if (k.startsWith('addr:')) {
      fromAddr.set(c, s)
    } else {
      fromBare.set(c, s)
    }
  }
  const merged = new Map(fromBare)
  for (const [c, v] of fromAddr) merged.set(c, v)
  for (const [c, v] of fromContact) merged.set(c, v)
  return merged
}

/**
 * Normalize school names for matcher equality: strip `(...)`, lowercase,
 * German umlaut folding (ä→ae, ...), strip remaining diacritics, collapse whitespace.
 */
export function normalizeSchoolNameForMatch(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') return ''
  let s = name.replace(/\([^)]*\)/g, ' ')
  s = s.trim().toLowerCase()
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  try {
    s = s.normalize('NFD').replace(/\p{M}/gu, '')
  } catch {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Extra normalization for Fachschule ↔ `amenity=college` matching only (does not affect `normalizeSchoolNameForMatch`).
 * Collapses common German abbreviations so OSM and official long names can match (full or prefix).
 */
export function normalizeForFachschuleCollegeMatch(name: string | null | undefined): string {
  let s = normalizeSchoolNameForMatch(name)
  if (!s) return ''
  s = s.replace(/\bstaatl\./g, 'staatliche')
  s = s.replace(/\bf\./g, 'fuer')
  return s.replace(/\s+/g, ' ').trim()
}

/** Whether the official name is treated as a Fachschule row for college OSM matching. */
export function isFachschuleOfficialName(name: string | null | undefined): boolean {
  return normalizeForFachschuleCollegeMatch(name).includes('fachschule')
}

export function normalizeAddressCompareString(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export function abbrevGermanStrasseForCompare(s: string): string {
  return s.replaceAll('Straße', 'Str.').replaceAll('straße', 'str.')
}

function expandGermanStrasseForCompare(s: string): string {
  return s.replaceAll('Str.', 'Straße').replaceAll('str.', 'straße')
}

/**
 * UI-facing equivalent strings for a street + housenumber line.
 */
export function addressCompareTargetsFromOsmParts(
  street: string | null | undefined,
  housenumber: string | null | undefined,
): string[] {
  const line = normalizeAddressCompareString([street, housenumber].filter(Boolean).join(' '))
  if (line === '') return []
  const targets = new Set<string>()
  targets.add(line)
  targets.add(normalizeAddressCompareString(abbrevGermanStrasseForCompare(line)))
  targets.add(normalizeAddressCompareString(expandGermanStrasseForCompare(line)))
  return [...targets]
}

/**
 * Canonical address key for matching. Equivalent street forms map to one key.
 */
export function normalizeAddressMatchKey(s: string | null | undefined): string {
  if (s == null) return ''
  let out = normalizeAddressCompareString(String(s)).toLowerCase()
  out = out.replace(/ß/g, 'ss')
  out = out.replace(/\bstraße\b/g, 'strasse')
  out = out.replace(/str\./g, 'strasse')
  out = out.replace(/str(?=[\s,;:/-]|$)/g, 'strasse')
  return out.replace(/\s+/g, ' ').trim()
}

export function normalizeWebsiteMatchKey(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim()
  if (t === '') return ''
  let url: URL | null = null
  try {
    url = new URL(t.startsWith('//') ? `https:${t}` : t)
  } catch {
    if (/^[a-z][a-z\d+\-.]*:/i.test(t)) return ''
    try {
      url = new URL(`https://${t}`)
    } catch {
      return ''
    }
  }
  const isDefaultPort =
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  const port = url.port && !isDefaultPort ? `:${url.port}` : ''
  let path = url.pathname || '/'
  if (path !== '/') path = path.replace(/\/+$/g, '')
  if (path === '') path = '/'
  return `${url.hostname.toLowerCase()}${port}${path}${url.search}`
}
