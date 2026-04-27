import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

export const CHANGELOG_REGISTRY_PATH = path.join('changelog', 'registry.yaml')
export const CHANGELOG_MARKDOWN_PATH = 'CHANGELOG.md'
export const CHANGELOG_JSON_PATH = path.join('public', 'changelog.gen.json')
export const CHANGELOG_ONLY_ALLOWED_PATHS = new Set<string>([
  CHANGELOG_REGISTRY_PATH,
  CHANGELOG_MARKDOWN_PATH,
  CHANGELOG_JSON_PATH,
])

const refsSchema = z.array(z.string().trim().min(1)).min(1)

const visibleEntrySchema = z.object({
  hide: z.literal(false),
  refs: refsSchema,
  descriptionMd: z.string().trim().min(1),
})

const hiddenEntrySchema = z.object({
  hide: z.literal(true),
  refs: refsSchema,
  descriptionMd: z.never().optional(),
})

const entryNormalizedSchema = z.discriminatedUnion('hide', [visibleEntrySchema, hiddenEntrySchema])

const entryInputSchema = z
  .object({
    hide: z.boolean().optional(),
    refs: refsSchema,
    descriptionMd: z.string().optional(),
  })
  .transform((entry) => ({
    hide: entry.hide ?? false,
    refs: entry.refs,
    descriptionMd: entry.descriptionMd,
  }))
  .pipe(entryNormalizedSchema)

const registrySchema = z.object({
  entries: z.array(entryInputSchema),
})

export type ChangelogEntry = z.infer<typeof entryNormalizedSchema>
export type ChangelogRegistry = z.infer<typeof registrySchema>

type GitCommandOptions = {
  cwd: string
  acceptNonZero?: boolean
}

export async function readRegistry(projectRoot: string): Promise<ChangelogRegistry> {
  const abs = path.join(projectRoot, CHANGELOG_REGISTRY_PATH)
  const text = await readFile(abs, 'utf8')
  const parsed = Bun.YAML.parse(text)
  return registrySchema.parse(parsed)
}

export async function writeRegistry(
  projectRoot: string,
  registry: ChangelogRegistry,
): Promise<void> {
  const abs = path.join(projectRoot, CHANGELOG_REGISTRY_PATH)
  await mkdir(path.dirname(abs), { recursive: true })
  const lines: string[] = ['entries:']
  for (const entry of registry.entries) {
    lines.push('  - refs:')
    for (const ref of entry.refs) {
      lines.push(`      - '${ref.replaceAll("'", "''")}'`)
    }
    if (entry.hide) {
      lines.push('    hide: true')
      continue
    }
    lines.push('    descriptionMd: |')
    for (const line of entry.descriptionMd.split('\n')) {
      lines.push(`      ${line}`)
    }
  }
  const yaml = `${lines.join('\n')}\n`
  await writeFile(abs, yaml, 'utf8')
}

export async function runGit(args: string[], options: GitCommandOptions): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    cwd: options.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const code = await proc.exited
  const stdout = (await new Response(proc.stdout).text()).trim()
  const stderr = (await new Response(proc.stderr).text()).trim()
  if (code !== 0 && !options.acceptNonZero) {
    throw new Error(`git ${args.join(' ')} failed (${code})${stderr ? `: ${stderr}` : ''}`)
  }
  return stdout
}

export async function resolveCommitRef(
  projectRoot: string,
  ref: string,
): Promise<{ ref: string; hash: string | null }> {
  const raw = await runGit(['rev-parse', '--verify', `${ref}^{commit}`], {
    cwd: projectRoot,
    acceptNonZero: true,
  })
  if (!raw) return { ref, hash: null }
  const hash = raw.split('\n')[0]?.trim() ?? ''
  return { ref, hash: hash || null }
}

export async function listFirstParentHeadHistory(projectRoot: string): Promise<string[]> {
  const out = await runGit(['rev-list', '--first-parent', 'HEAD'], { cwd: projectRoot })
  if (!out) return []
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export type CommitInfo = {
  hash: string
  committedAtIso: string
  subject: string
  body: string
}

export async function readCommitInfo(projectRoot: string, ref: string): Promise<CommitInfo> {
  const fmt = '%H%x00%cI%x00%s%x00%b'
  const out = await runGit(['show', '-s', `--format=${fmt}`, '--no-patch', ref], {
    cwd: projectRoot,
  })
  const [hash = '', committedAtIso = '', subject = '', body = ''] = out.split('\u0000')
  if (!hash || !committedAtIso || !subject) {
    throw new Error(`Could not parse commit metadata for ref "${ref}".`)
  }
  return { hash, committedAtIso, subject, body: body.trim() }
}

export async function listCommitChangedPaths(projectRoot: string, ref: string): Promise<string[]> {
  const out = await runGit(['show', '--name-only', '--pretty=format:', '--no-renames', ref], {
    cwd: projectRoot,
  })
  if (!out) return []
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function isChangelogOnlyPath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/')
  return CHANGELOG_ONLY_ALLOWED_PATHS.has(normalized)
}

export async function isChangelogOnlyCommit(projectRoot: string, ref: string): Promise<boolean> {
  const paths = await listCommitChangedPaths(projectRoot, ref)
  if (paths.length === 0) return false
  return paths.every((p) => isChangelogOnlyPath(p))
}

export function monthKeyFromIsoDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.valueOf())) {
    throw new Error(`Invalid ISO date "${isoDate}".`)
  }
  return isoDate.slice(0, 7)
}

export type CoverageSlice = {
  anchorHash: string | null
  commitsSinceAnchor: string[]
}

export function sliceCommitsSinceAnchor(
  firstParentHeadHistory: string[],
  registeredHashes: Set<string>,
): CoverageSlice {
  const anchorIndex = firstParentHeadHistory.findIndex((hash) => registeredHashes.has(hash))
  if (anchorIndex === -1) {
    return {
      anchorHash: null,
      commitsSinceAnchor: firstParentHeadHistory,
    }
  }
  return {
    anchorHash: firstParentHeadHistory[anchorIndex] ?? null,
    commitsSinceAnchor: firstParentHeadHistory.slice(0, anchorIndex),
  }
}

export function shortHash(hash: string): string {
  return hash.slice(0, 7)
}
