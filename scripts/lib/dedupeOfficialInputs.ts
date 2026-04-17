import {
  flattenOfficialForCompare,
  normalizeAddressMatchKey,
  normalizeSchoolNameForMatch,
  normalizeWebsiteMatchKey,
} from '../../src/lib/compareMatchKeys'
import { JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY } from '../../src/lib/jedeschuleDuplicateGroup'
import { landCodeFromSchoolId } from '../../src/lib/stateConfig'
import type { OfficialInput } from './match'

export { JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY }

/** ~1.1 m — fingerprint only; user-facing rounding stays elsewhere. */
const FINGERPRINT_COORD_DECIMALS = 5

const FINGERPRINT_PROP_KEYS = [
  'name',
  'address',
  'city',
  'postcode',
  'school_type',
  'website',
  'phone',
  'email',
  'legal_status',
] as const

function roundCoord(n: number): number {
  if (!Number.isFinite(n)) return n
  const scale = 10 ** FINGERPRINT_COORD_DECIMALS
  return Math.round(n * scale) / scale
}

function normalizeFingerprintValue(key: string, raw: string): string {
  switch (key) {
    case 'name':
    case 'school_type':
      return normalizeSchoolNameForMatch(raw)
    case 'address':
      return normalizeAddressMatchKey(raw)
    case 'website':
      return normalizeWebsiteMatchKey(raw)
    case 'city':
    case 'email':
    case 'legal_status':
      return raw.trim().toLowerCase()
    case 'phone':
      return raw.replace(/\s+/g, '')
    case 'postcode':
      return raw.trim()
    default:
      return raw.trim().toLowerCase()
  }
}

function propertySignatureForFingerprint(props: Record<string, unknown>): string {
  const flat = flattenOfficialForCompare(props)
  for (const k of [
    'id',
    'update_timestamp',
    'land',
    'provider',
    JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY,
  ]) {
    flat.delete(k)
  }
  for (const key of flat.keys()) {
    if (key.startsWith('_') || key.startsWith('jedeschule')) {
      flat.delete(key)
    }
  }
  const tuples: [string, string][] = []
  for (const key of FINGERPRINT_PROP_KEYS) {
    const v = flat.get(key)
    if (v == null) continue
    tuples.push([key, normalizeFingerprintValue(key, v)])
  }
  tuples.sort((a, b) => a[0].localeCompare(b[0], 'en'))
  return JSON.stringify(tuples)
}

function parseUpdateTimestampMs(props: Record<string, unknown>): number | null {
  const raw = props.update_timestamp
  if (raw == null) return null
  const s = typeof raw === 'string' ? raw : String(raw)
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

function pickWinner(group: OfficialInput[]): OfficialInput {
  if (group.length === 1) return group[0]!
  return group.reduce((best, o) => {
    const ts = parseUpdateTimestampMs(o.properties)
    const bts = parseUpdateTimestampMs(best.properties)
    if (bts == null && ts == null) return o.id.localeCompare(best.id, 'en') < 0 ? o : best
    if (bts == null && ts != null) return o
    if (bts != null && ts == null) return best
    if (ts! > bts!) return o
    if (ts! < bts!) return best
    return o.id.localeCompare(best.id, 'en') < 0 ? o : best
  })
}

function hasFiniteCoord(o: OfficialInput): boolean {
  return Number.isFinite(o.lon) && Number.isFinite(o.lat)
}

function fingerprintKey(off: OfficialInput): string {
  const land = landCodeFromSchoolId(off.id)
  if (!land) {
    return `singleton|${off.id}|${roundCoord(off.lon)}|${roundCoord(off.lat)}|${propertySignatureForFingerprint(off.properties)}`
  }
  const lon = roundCoord(off.lon)
  const lat = roundCoord(off.lat)
  const propSig = propertySignatureForFingerprint(off.properties)
  return `${land}|${lon}|${lat}|${propSig}`
}

export type DedupeOfficialInputsResult = {
  officials: OfficialInput[]
  stats: {
    removedCount: number
    groupsWithDuplicates: number
    withCoordBefore: number
    withCoordAfter: number
  }
}

/**
 * Collapse duplicate JedeSchule officials (same land + rounded coords + stable props).
 * Only rows with finite lon/lat participate; others pass through unchanged.
 */
export function dedupeOfficialInputs(officials: OfficialInput[]): DedupeOfficialInputsResult {
  const noCoord: OfficialInput[] = []
  const withCoord: OfficialInput[] = []
  for (const o of officials) {
    if (hasFiniteCoord(o)) withCoord.push(o)
    else noCoord.push(o)
  }

  const byKey = new Map<string, OfficialInput[]>()
  for (const o of withCoord) {
    const k = fingerprintKey(o)
    const arr = byKey.get(k)
    if (arr) arr.push(o)
    else byKey.set(k, [o])
  }

  const winners = new Map<string, OfficialInput>()
  let groupsWithDuplicates = 0
  for (const [k, group] of byKey) {
    if (group.length > 1) groupsWithDuplicates++
    const winner = pickWinner(group)
    const nextProps = { ...winner.properties }
    delete nextProps[JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY]
    if (group.length > 1) {
      nextProps[JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY] = group.length
    }
    winners.set(k, { ...winner, properties: nextProps })
  }

  const winnerId = new Set<string>()
  for (const w of winners.values()) winnerId.add(w.id)

  const removedCount = withCoord.length - winners.size

  const out: OfficialInput[] = []
  for (const o of officials) {
    if (!hasFiniteCoord(o)) {
      out.push(o)
      continue
    }
    const k = fingerprintKey(o)
    const w = winners.get(k)
    if (w && o.id === w.id) out.push(w)
  }

  return {
    officials: out,
    stats: {
      removedCount,
      groupsWithDuplicates,
      withCoordBefore: withCoord.length,
      withCoordAfter: winners.size,
    },
  }
}
