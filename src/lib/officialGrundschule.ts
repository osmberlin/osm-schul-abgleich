import {
  resolveSchoolFormRuleFromOfficial,
  schoolTypeStringIndicatesGrundschule,
} from './schoolFormRules'

export { schoolTypeStringIndicatesGrundschule }

/** True if official Jedeschule data indicates a Grundschule (same rules as Schulform resolve). */
export function isOfficialGrundschule(input: {
  officialName: string | null
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  return resolveSchoolFormRuleFromOfficial(input) === 'grundschule'
}

export function tagValueEqualsProposed(current: string | undefined, proposed: string): boolean {
  return (current?.trim() ?? '') === proposed.trim()
}
