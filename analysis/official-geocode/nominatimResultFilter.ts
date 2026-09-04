const REJECTED_PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'municipality',
  'hamlet',
  'suburb',
  'county',
  'state',
  'country',
  'region',
  'island',
  'quarter',
  'neighbourhood',
  'postcode',
])

export function hasHouseNumber(address: string): boolean {
  return /\d/.test(address)
}

export function isRejectedNominatimClassType(cls: string, type: string): boolean {
  const c = cls.trim().toLowerCase()
  const t = type.trim().toLowerCase()
  if (c === 'boundary') return true
  if (t === 'postcode') return true
  if (c === 'place' && REJECTED_PLACE_TYPES.has(t)) return true
  return false
}

function normalizePostcode(value: string): string {
  return value.trim().replace(/\s+/g, '')
}

export function postcodeMatches(
  queriedZip: string | null | undefined,
  resultPostcode: string | null | undefined,
): boolean {
  if (queriedZip == null || queriedZip.trim() === '') return true
  const q = normalizePostcode(queriedZip)
  if (q === '') return true
  if (resultPostcode == null || resultPostcode.trim() === '') return true
  return q === normalizePostcode(resultPostcode)
}

export type ClassifyNominatimHitArgs = {
  class: string
  type: string
  queriedZip?: string | null
  resultPostcode?: string | null
}

export function classifyNominatimHit(args: ClassifyNominatimHitArgs): 'ok' | 'rejected' {
  if (isRejectedNominatimClassType(args.class, args.type)) return 'rejected'
  if (!postcodeMatches(args.queriedZip, args.resultPostcode)) return 'rejected'
  return 'ok'
}
