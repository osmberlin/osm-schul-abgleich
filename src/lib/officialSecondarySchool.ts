import {
  resolveSchoolFormRuleFromOfficial,
  resolveSecondarySchoolKindFromSchoolType,
  type SecondarySchoolKind,
} from './schoolFormRules'

export { resolveSecondarySchoolKindFromSchoolType, type SecondarySchoolKind }

/** True if official Jedeschule data indicates one of the supported secondary school kinds. */
export function isOfficialSecondarySchoolKind(input: {
  officialName: string | null
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  const rule = resolveSchoolFormRuleFromOfficial(input)
  return rule != null && rule !== 'grundschule'
}
