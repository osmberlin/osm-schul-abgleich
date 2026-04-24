/**
 * Pipeline run history as JSON Lines (JSONL): one minified JSON object per line, UTF-8.
 * {@link stringifyRunHistoryJsonl} sorts records deterministically so git diffs stay stable.
 */

export function compareRunRecordsStable(a: unknown, b: unknown): number {
  const ka = runSortKey(a)
  const kb = runSortKey(b)
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1
    if (ka[i] > kb[i]) return 1
  }
  return 0
}

export type RunHistoryParseDiagnostics = {
  parseErrors: number
}

export type ParsedRunHistoryWithDiagnostics = {
  runs: unknown[]
  diagnostics: RunHistoryParseDiagnostics
}

export function sortRunRecordsStable(runs: readonly unknown[]): unknown[] {
  return [...runs].sort(compareRunRecordsStable)
}

function runSortKey(r: unknown): [string, string, string, string] {
  if (typeof r !== 'object' || r === null) return ['', '', '', '']
  const o = r as Record<string, unknown>
  const startedAt = typeof o.startedAt === 'string' ? o.startedAt : ''
  const finishedAt = typeof o.finishedAt === 'string' ? o.finishedAt : ''
  const gitSha = typeof o.gitSha === 'string' ? o.gitSha : ''
  const tieBreak = JSON.stringify(r)
  return [startedAt, finishedAt, gitSha, tieBreak]
}

/**
 * Parse JSONL: non-empty lines must each be one JSON value (typically an object).
 * Returns records sorted with {@link sortRunRecordsStable}.
 */
export function parseRunHistoryJsonl(text: string): unknown[] {
  return parseRunHistoryJsonlWithDiagnostics(text).runs
}

export function parseRunHistoryJsonlWithDiagnostics(text: string): ParsedRunHistoryWithDiagnostics {
  const raw = text.replace(/\r\n/g, '\n')
  const lines = raw.split('\n')
  const out: unknown[] = []
  let parseErrors = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // Keep rendering the remaining history instead of failing the whole file.
      parseErrors += 1
      continue
    }
  }
  return {
    runs: sortRunRecordsStable(out),
    diagnostics: {
      parseErrors,
    },
  }
}

/**
 * Load run records from committed file text as JSONL (one object per line).
 */
export function parseRunHistoryFileText(text: string): unknown[] {
  return parseRunHistoryFileTextWithDiagnostics(text).runs
}

export function parseRunHistoryFileTextWithDiagnostics(
  text: string,
): ParsedRunHistoryWithDiagnostics {
  const t = text.trim()
  if (t === '') {
    return {
      runs: [],
      diagnostics: {
        parseErrors: 0,
      },
    }
  }
  return parseRunHistoryJsonlWithDiagnostics(text)
}

/** Shape expected by `runsFileSchema` in `./schemas`. */
export function runsPayloadFromHistoryText(text: string): { runs: unknown[] } {
  return { runs: parseRunHistoryFileText(text) }
}

/**
 * Serialize to JSONL: records are sorted with {@link sortRunRecordsStable}, one compact JSON per line.
 * Ends with a newline when there is at least one record.
 */
export function stringifyRunHistoryJsonl(runs: readonly unknown[]): string {
  const sorted = sortRunRecordsStable(runs)
  if (sorted.length === 0) return ''
  return `${sorted.map((r) => JSON.stringify(r)).join('\n')}\n`
}
