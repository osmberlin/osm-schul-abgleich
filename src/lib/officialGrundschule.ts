function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** True if official Jedeschule data indicates a Grundschule (type or name). */
export function isOfficialGrundschule(input: {
  officialName: string | null
  officialProperties: Record<string, unknown> | null | undefined
}): boolean {
  const name = input.officialName?.trim() ?? ''
  if (name && norm(name).includes('grundschule')) return true

  const st = input.officialProperties?.school_type
  if (typeof st !== 'string' || !st.trim()) return false
  const n = norm(st)
  if (n.includes('grundschule')) return true
  return false
}

export function tagValueEqualsProposed(current: string | undefined, proposed: string): boolean {
  return (current?.trim() ?? '') === proposed.trim()
}
