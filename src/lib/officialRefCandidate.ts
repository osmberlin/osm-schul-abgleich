import { stateCodeFromSchoolId } from './stateConfig'

const KNOWN_FALLBACK_SEGMENT_MARKERS = new Set(['UUID', 'FB', 'FBA'])

function splitOfficialIdSegments(id: string): string[] {
  return id
    .split('-')
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

function isLikelyFallbackMarker(segment: string): boolean {
  const s = segment.trim().toUpperCase()
  if (s === '') return false
  return KNOWN_FALLBACK_SEGMENT_MARKERS.has(s)
}

/**
 * Candidate for proposing `ref=*` from official school id.
 * Returns null for likely fallback/synthetic ids.
 */
export function officialRefCandidateFromSchoolId(
  officialId: string | null | undefined,
): string | null {
  const id = String(officialId ?? '').trim()
  if (id === '') return null
  if (!stateCodeFromSchoolId(id)) return null

  const segments = splitOfficialIdSegments(id)
  if (segments.length < 2) return null

  const middleSegments = segments.slice(1, -1)
  if (middleSegments.some((segment) => isLikelyFallbackMarker(segment))) return null

  const refCandidate = segments.at(-1)?.trim() ?? ''
  if (refCandidate === '') return null
  if (/^(unknown|unk)$/i.test(refCandidate)) return null
  return refCandidate
}
