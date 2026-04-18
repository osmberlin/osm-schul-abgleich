function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** True if the Jedeschule `school_type` string indicates Fachschule (substring match). */
export function schoolTypeStringIndicatesFachschule(s: string | null | undefined): boolean {
  if (typeof s !== 'string' || !s.trim()) return false
  return norm(s).includes('fachschule')
}
