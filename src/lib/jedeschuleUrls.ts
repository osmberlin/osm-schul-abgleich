/** Weekly nationwide dump (same data as the jedeschule.codefor.de API). */
export const JEDESCHULE_WEEKLY_CSV_URL =
  'https://jedeschule.codefor.de/csv-data/latest.csv' as const

/** Single-school JSON as in the UI (“Auf JedeSchule öffnen (JSON)”). */
export function jedeschuleSchoolJsonUrl(officialId: string): string {
  return `https://jedeschule.codefor.de/schools/${encodeURIComponent(officialId)}`
}
