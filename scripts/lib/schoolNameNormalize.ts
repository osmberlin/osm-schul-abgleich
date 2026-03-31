/**
 * Normalize school names for matcher equality: strip `(...)`, lowercase,
 * German umlaut folding (ä→ae, …), strip remaining diacritics, collapse whitespace.
 */
export function normalizeSchoolNameForMatch(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') return ''
  let s = name.replace(/\([^)]*\)/g, ' ')
  s = s.trim().toLowerCase()
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  try {
    s = s.normalize('NFD').replace(/\p{M}/gu, '')
  } catch {
    // `\p{M}` requires ES2022; fallback if unavailable
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }
  return s.replace(/\s+/g, ' ').trim()
}
