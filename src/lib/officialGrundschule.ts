import { schoolTypeStringIndicatesGrundschule } from './schoolFormRules'

export { schoolTypeStringIndicatesGrundschule }

/** True if the Jedeschule `school_type` string indicates Grundschule (substring match). */
/** True if official Jedeschule data indicates a Grundschule (type or name). */
export function isOfficialGrundschule(input: {
  officialName: string | null
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  const name = input.officialName?.trim().toLowerCase() ?? ''
  if (name.includes('grundschule')) return true
  const st = input.officialProperties?.school_type
  return schoolTypeStringIndicatesGrundschule(typeof st === 'string' ? st : null)
}

export function tagValueEqualsProposed(current: string | undefined, proposed: string): boolean {
  return (current?.trim() ?? '') === proposed.trim()
}
