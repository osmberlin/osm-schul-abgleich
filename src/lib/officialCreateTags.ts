import { officialRefCandidateFromSchoolId } from './officialRefCandidate'
import { officialLegalStatusIndicatesPublic } from './propertyCompare'
import {
  PRIMARY_SUGGEST_TAGS,
  SECONDARY_SUGGEST_TAGS_BY_KIND,
  resolveSchoolFormRuleFromOfficial,
  type SchoolFormRule,
} from './schoolFormRules'

/** Normalize a school website string to an https URL, or null if empty. */
function normalizeWebsiteHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) return `https:${t}`
  return `https://${t}`
}

export type OfficialCreateTagsInput = {
  officialId: string | null | undefined
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
}

export type OfficialCreateTagsResult = {
  /** Strong gate passed — safe to emit a MapRoulette create task. */
  ok: true
  formRule: SchoolFormRule
  name: string
  /** Full proposed create tag package (amenity + name + form + optional extras). */
  tags: Record<string, string>
  /** Raw official address line for task markdown when street/housenumber were not parsed. */
  addressGuidance: string | null
}

export type OfficialCreateTagsRejected = {
  ok: false
  reason: 'missing_name' | 'no_form_rule'
}

/**
 * Parse a simple German "Street 12" / "Street 12a" line into OSM addr parts.
 * Returns null when the shape is ambiguous (ranges, multiple numbers, etc.).
 */
export function parseGermanStreetHousenumber(
  address: string | null | undefined,
): { street: string; housenumber: string } | null {
  if (typeof address !== 'string') return null
  const t = address.trim().replace(/\s+/g, ' ')
  if (!t) return null
  const m = t.match(/^(.+?)\s+(\d+[a-zA-Z]?)$/u)
  if (!m) return null
  const street = m[1]?.trim() ?? ''
  const housenumber = m[2]?.trim() ?? ''
  if (!street || !housenumber) return null
  return { street, housenumber }
}

function stringProp(props: Record<string, unknown> | null | undefined, key: string): string | null {
  const raw = props?.[key]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

function officialProviderValue(
  officialProperties: Record<string, unknown> | null | undefined,
): string | null {
  return stringProp(officialProperties, 'provider')
}

function isGenericKommunalProvider(provider: string): boolean {
  return /^öffentlich\s*\(\s*kommune\s*\)$/i.test(provider.trim())
}

function formTagsForRule(rule: SchoolFormRule): Record<string, string> {
  if (rule === 'grundschule') {
    return Object.fromEntries(PRIMARY_SUGGEST_TAGS.map((t) => [t.key, t.value]))
  }
  const specs = SECONDARY_SUGGEST_TAGS_BY_KIND[rule]
  const out: Record<string, string> = {}
  for (const spec of specs) {
    // Gesamtschule lists isced alternatives; keep the first (2;3), same as Tag Fix.
    if (out[spec.key] != null) continue
    out[spec.key] = spec.value
  }
  return out
}

/**
 * Strong create package from official data: requires name + Schulform rule.
 * Always proposes amenity=school, name, school/isced; adds addr/ref/contact/operator when present.
 */
export function collectOfficialCreateTags(
  input: OfficialCreateTagsInput,
): OfficialCreateTagsResult | OfficialCreateTagsRejected {
  const nameFromProps = stringProp(input.officialProperties, 'name')
  const name = (input.officialName?.trim() || nameFromProps || '').trim()
  if (!name) return { ok: false, reason: 'missing_name' }

  const formRule = resolveSchoolFormRuleFromOfficial({
    officialName: name,
    officialProperties: input.officialProperties ?? null,
  })
  if (!formRule) return { ok: false, reason: 'no_form_rule' }

  const tags: Record<string, string> = {
    amenity: 'school',
    name,
    ...formTagsForRule(formRule),
  }

  const ref = officialRefCandidateFromSchoolId(input.officialId)
  if (ref) tags.ref = ref

  const address = stringProp(input.officialProperties, 'address')
  const parsed = parseGermanStreetHousenumber(address)
  let addressGuidance: string | null = null
  if (parsed) {
    tags['addr:street'] = parsed.street
    tags['addr:housenumber'] = parsed.housenumber
  } else if (address) {
    addressGuidance = address
  }

  const postcode = stringProp(input.officialProperties, 'zip')
  if (postcode) tags['addr:postcode'] = postcode
  const city = stringProp(input.officialProperties, 'city')
  if (city) tags['addr:city'] = city

  const website = normalizeWebsiteHref(input.officialProperties?.website)
  if (website) tags.website = website

  const phone = stringProp(input.officialProperties, 'phone')
  if (phone) tags.phone = phone

  const legalStatus = stringProp(input.officialProperties, 'legal_status')
  if (officialLegalStatusIndicatesPublic(legalStatus)) {
    tags['operator:type'] = 'government'
    const provider = officialProviderValue(input.officialProperties)
    if (provider && !isGenericKommunalProvider(provider)) {
      tags.operator = provider
    }
  }

  return { ok: true, formRule, name, tags, addressGuidance }
}
