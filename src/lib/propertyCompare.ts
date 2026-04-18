import {
  addressCompareTargetsFromOsmParts,
  flattenOfficialForCompare,
  flattenOsmTagsForCompare,
  normalizeAddressMatchKey,
  normalizeSchoolNameForMatch,
} from './compareMatchKeys'
import { schoolTypeStringIndicatesFachschule } from './officialFachschule'
import { schoolTypeStringIndicatesGrundschule, tagValueEqualsProposed } from './officialGrundschule'
import {
  type SecondarySchoolKind,
  resolveSecondarySchoolKindFromSchoolType,
} from './officialSecondarySchool'

type CompareRowBoth = [string, string, string]
type CompareRowSingle = [string, string]
type AddressCompareOsmKey = 'street' | 'housenumber'
type GrundschuleCompareOsmKey = 'isced:level' | 'school'
type SecondarySchoolCompareOsmKey = 'isced:level' | 'school'
type FachschuleCompareOsmKey = 'amenity'
type ProviderOperatorCompareOsmKey = 'operator'
type LegalStatusOperatorTypeCompareOsmKey = 'operator:type'

export type AddressCompareGroup = {
  kind: 'address'
  officialKey: 'address'
  officialValue: string | null
  osmKeys: readonly ['street', 'housenumber']
  osmValues: Record<AddressCompareOsmKey, string | null>
  compareTargets: string[]
  consumedKeys: string[]
}

export type GrundschuleCompareGroup = {
  kind: 'grundschule'
  officialKey: 'school_type'
  officialValue: string | null
  osmKeys: readonly ['isced:level', 'school']
  osmValues: Record<GrundschuleCompareOsmKey, string | null>
  isEquivalentMatch: boolean
  consumedKeys: string[]
}

export type SecondarySchoolCompareGroup = {
  kind: 'secondarySchool'
  variant: SecondarySchoolKind
  officialKey: 'school_type'
  officialValue: string | null
  osmKeys: readonly ['isced:level', 'school']
  osmValues: Record<SecondarySchoolCompareOsmKey, string | null>
  isEquivalentMatch: boolean
  consumedKeys: string[]
}

export type FachschuleCompareGroup = {
  kind: 'fachschule'
  officialKey: 'school_type'
  officialValue: string | null
  osmKeys: readonly ['amenity']
  osmValues: Record<FachschuleCompareOsmKey, string | null>
  isEquivalentMatch: boolean
  consumedKeys: string[]
}

export type ProviderOperatorCompareGroup = {
  kind: 'providerOperator'
  officialKey: 'provider'
  officialValue: string | null
  osmKeys: readonly ['operator']
  osmValues: Record<ProviderOperatorCompareOsmKey, string | null>
  isEquivalentMatch: boolean
  consumedKeys: string[]
}

export type LegalStatusOperatorTypeCompareGroup = {
  kind: 'legalStatusOperatorType'
  officialKey: 'legal_status'
  officialValue: string | null
  osmKeys: readonly ['operator:type']
  osmValues: Record<LegalStatusOperatorTypeCompareOsmKey, string | null>
  isEquivalentMatch: boolean
  consumedKeys: string[]
}

export type PropertyCompareGroup =
  | AddressCompareGroup
  | GrundschuleCompareGroup
  | SecondarySchoolCompareGroup
  | FachschuleCompareGroup
  | ProviderOperatorCompareGroup
  | LegalStatusOperatorTypeCompareGroup

export { normalizeAddressCompareString } from './compareMatchKeys'

type ExpectedOperatorTypeFromOfficial = 'public' | 'private'

export function officialLegalStatusIndicatesPublic(
  legalStatus: string | null | undefined,
): boolean {
  return expectedOperatorTypeFromOfficialString(legalStatus) === 'public'
}

function expectedOperatorTypeFromOfficialString(
  value: string | null | undefined,
): ExpectedOperatorTypeFromOfficial | null {
  const normalized = normalizeSchoolNameForMatch(value)
  if (!normalized) return null
  if (normalized.includes('oeffentlich')) return 'public'
  if (normalized.includes('privat') || normalized.includes('private')) return 'private'
  return null
}

function expectedOperatorTypeFromOfficialProperties(
  legalStatus: string | null | undefined,
  provider: string | null | undefined,
): ExpectedOperatorTypeFromOfficial | null {
  const fromLegalStatus = expectedOperatorTypeFromOfficialString(legalStatus)
  if (fromLegalStatus) return fromLegalStatus
  return expectedOperatorTypeFromOfficialString(provider)
}

function buildAddressCompareGroup(
  offMap: Map<string, string>,
  osmMap: Map<string, string>,
): AddressCompareGroup | null {
  const officialValue = offMap.get('address') ?? null
  const street = osmMap.get('street') ?? null
  const housenumber = osmMap.get('housenumber') ?? null
  if (officialValue == null) return null

  const targets = addressCompareTargetsFromOsmParts(street, housenumber)
  if (targets.length === 0) return null
  const normalizedOfficial = normalizeAddressMatchKey(officialValue)
  const targetKeys = targets.map((v) => normalizeAddressMatchKey(v))
  if (!targetKeys.includes(normalizedOfficial)) return null
  return {
    kind: 'address',
    officialKey: 'address',
    officialValue,
    osmKeys: ['street', 'housenumber'],
    osmValues: { street, housenumber },
    compareTargets: targets,
    consumedKeys: ['address', 'street', 'housenumber'],
  }
}

function buildGrundschuleCompareGroup(
  offMap: Map<string, string>,
  osmMap: Map<string, string>,
): GrundschuleCompareGroup | null {
  const officialValue = offMap.get('school_type') ?? null
  if (officialValue == null || !schoolTypeStringIndicatesGrundschule(officialValue)) return null

  const isced = osmMap.get('isced:level') ?? null
  const school = osmMap.get('school') ?? null
  if (isced == null && school == null) return null
  const isEquivalentMatch =
    tagValueEqualsProposed(isced ?? undefined, '1') ||
    tagValueEqualsProposed(school ?? undefined, 'primary')

  return {
    kind: 'grundschule',
    officialKey: 'school_type',
    officialValue,
    osmKeys: ['isced:level', 'school'],
    osmValues: { 'isced:level': isced, school },
    isEquivalentMatch,
    consumedKeys: ['school_type', 'isced:level', 'school'],
  }
}

function buildFachschuleCompareGroup(
  offMap: Map<string, string>,
  osmMap: Map<string, string>,
): FachschuleCompareGroup | null {
  const officialValue = offMap.get('school_type') ?? null
  if (officialValue == null || !schoolTypeStringIndicatesFachschule(officialValue)) return null

  const amenity = osmMap.get('amenity') ?? null
  if (amenity == null) return null
  const isEquivalentMatch = tagValueEqualsProposed(amenity ?? undefined, 'college')

  return {
    kind: 'fachschule',
    officialKey: 'school_type',
    officialValue,
    osmKeys: ['amenity'],
    osmValues: { amenity },
    isEquivalentMatch,
    consumedKeys: ['school_type', 'amenity'],
  }
}

function buildSecondarySchoolCompareGroup(
  offMap: Map<string, string>,
  osmMap: Map<string, string>,
): SecondarySchoolCompareGroup | null {
  const officialValue = offMap.get('school_type') ?? null
  const variant = resolveSecondarySchoolKindFromSchoolType(officialValue)
  if (officialValue == null || variant == null) return null

  const isced = osmMap.get('isced:level') ?? null
  const school = osmMap.get('school') ?? null
  if (isced == null && school == null) return null
  const hasSecondary = tagValueEqualsProposed(school ?? undefined, 'secondary')
  const hasIsced23 = tagValueEqualsProposed(isced ?? undefined, '2;3')
  const hasIsced2 = tagValueEqualsProposed(isced ?? undefined, '2')

  let isEquivalentMatch = false
  if (variant === 'gymnasium') isEquivalentMatch = hasSecondary || hasIsced23
  else if (variant === 'gesamtschule') isEquivalentMatch = hasSecondary || hasIsced23 || hasIsced2
  else isEquivalentMatch = hasSecondary || hasIsced2

  return {
    kind: 'secondarySchool',
    variant,
    officialKey: 'school_type',
    officialValue,
    osmKeys: ['isced:level', 'school'],
    osmValues: { 'isced:level': isced, school },
    isEquivalentMatch,
    consumedKeys: ['school_type', 'isced:level', 'school'],
  }
}

function buildProviderOperatorCompareGroup(
  offMap: Map<string, string>,
  osmMap: Map<string, string>,
): ProviderOperatorCompareGroup | null {
  const provider = offMap.get('provider') ?? null
  const operator = osmMap.get('operator') ?? null
  if (provider == null || operator == null) return null

  const isEquivalentMatch =
    provider != null &&
    operator != null &&
    normalizeSchoolNameForMatch(provider) === normalizeSchoolNameForMatch(operator)

  return {
    kind: 'providerOperator',
    officialKey: 'provider',
    officialValue: provider,
    osmKeys: ['operator'],
    osmValues: { operator },
    isEquivalentMatch,
    consumedKeys: ['provider', 'operator'],
  }
}

function buildLegalStatusOperatorTypeCompareGroup(
  offMap: Map<string, string>,
  osmMap: Map<string, string>,
): LegalStatusOperatorTypeCompareGroup | null {
  const legalStatus = offMap.get('legal_status') ?? null
  const provider = offMap.get('provider') ?? null
  const expectedOperatorType = expectedOperatorTypeFromOfficialProperties(legalStatus, provider)
  if (expectedOperatorType == null) return null

  const operatorType = osmMap.get('operator:type') ?? null
  if (operatorType == null) return null
  const isEquivalentMatch = normalizeSchoolNameForMatch(operatorType) === expectedOperatorType

  return {
    kind: 'legalStatusOperatorType',
    officialKey: 'legal_status',
    officialValue: legalStatus,
    osmKeys: ['operator:type'],
    osmValues: { 'operator:type': operatorType },
    isEquivalentMatch,
    consumedKeys: ['legal_status', 'operator:type'],
  }
}

export function comparePropertySections(
  official: Record<string, unknown> | null | undefined,
  osm: Record<string, string> | null | undefined,
): {
  both: CompareRowBoth[]
  onlyO: CompareRowSingle[]
  onlyS: CompareRowSingle[]
  compareGroups: PropertyCompareGroup[]
} {
  const offMap = flattenOfficialForCompare(official ?? {})
  const osmMap = flattenOsmTagsForCompare(osm ?? {})
  const compareGroups: PropertyCompareGroup[] = []
  const consumedKeys = new Set<string>()
  const addressGroup = buildAddressCompareGroup(offMap, osmMap)
  if (addressGroup) {
    compareGroups.push(addressGroup)
    for (const key of addressGroup.consumedKeys) consumedKeys.add(key)
  }
  const grundschuleGroup = buildGrundschuleCompareGroup(offMap, osmMap)
  if (grundschuleGroup) {
    compareGroups.push(grundschuleGroup)
    for (const key of grundschuleGroup.consumedKeys) consumedKeys.add(key)
  }
  const secondarySchoolGroup = buildSecondarySchoolCompareGroup(offMap, osmMap)
  if (secondarySchoolGroup) {
    compareGroups.push(secondarySchoolGroup)
    for (const key of secondarySchoolGroup.consumedKeys) consumedKeys.add(key)
  }
  const fachschuleGroup = buildFachschuleCompareGroup(offMap, osmMap)
  if (fachschuleGroup) {
    compareGroups.push(fachschuleGroup)
    for (const key of fachschuleGroup.consumedKeys) consumedKeys.add(key)
  }
  const providerOperatorGroup = buildProviderOperatorCompareGroup(offMap, osmMap)
  if (providerOperatorGroup) {
    compareGroups.push(providerOperatorGroup)
    for (const key of providerOperatorGroup.consumedKeys) consumedKeys.add(key)
  }
  const legalStatusOperatorTypeGroup = buildLegalStatusOperatorTypeCompareGroup(offMap, osmMap)
  if (legalStatusOperatorTypeGroup) {
    compareGroups.push(legalStatusOperatorTypeGroup)
    for (const key of legalStatusOperatorTypeGroup.consumedKeys) consumedKeys.add(key)
  }
  const keys = new Set([...offMap.keys(), ...osmMap.keys()])
  const both: CompareRowBoth[] = []
  const onlyO: CompareRowSingle[] = []
  const onlyS: CompareRowSingle[] = []
  for (const k of [...keys].sort((a, b) => a.localeCompare(b, 'de'))) {
    if (consumedKeys.has(k)) continue
    const os = offMap.get(k) ?? null
    const ss = osmMap.get(k) ?? null
    if (os != null && ss != null) both.push([k, os, ss])
    else if (os != null) onlyO.push([k, os])
    else if (ss != null) onlyS.push([k, ss])
  }
  return { both, onlyO, onlyS, compareGroups }
}
