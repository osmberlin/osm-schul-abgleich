function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** True if the Jedeschule `school_type` string indicates Grundschule (substring match). */
export function schoolTypeStringIndicatesGrundschule(s: string | null | undefined): boolean {
  if (typeof s !== 'string' || !s.trim()) return false
  return norm(s).includes('grundschule')
}

/** True if official Jedeschule data indicates a Grundschule (type or name). */
export function isOfficialGrundschule(input: {
  officialName: string | null
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  const name = input.officialName?.trim() ?? ''
  if (name && norm(name).includes('grundschule')) return true

  const st = input.officialProperties?.school_type
  return schoolTypeStringIndicatesGrundschule(typeof st === 'string' ? st : null)
}

export function tagValueEqualsProposed(current: string | undefined, proposed: string): boolean {
  return (current?.trim() ?? '') === proposed.trim()
}
