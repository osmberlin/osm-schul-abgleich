import {
  resolveSecondarySchoolKindFromSchoolType,
  type SecondarySchoolKind,
} from './schoolFormRules'

export { resolveSecondarySchoolKindFromSchoolType, type SecondarySchoolKind }

/** True if official Jedeschule data indicates one of the supported secondary school kinds. */
export function isOfficialSecondarySchoolKind(input: {
  officialName: string | null
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  const name = input.officialName?.trim() ?? ''
  if (resolveSecondarySchoolKindFromSchoolType(name)) return true

  const st = input.officialProperties?.school_type
  return resolveSecondarySchoolKindFromSchoolType(typeof st === 'string' ? st : null) != null
}
