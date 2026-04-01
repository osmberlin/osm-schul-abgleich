/** Public repo for “edit on GitHub” and issue links (aligned with AppFooter). */
export const GITHUB_REPO_ROOT = 'https://github.com/tordans/osm-schul-abgleich'

export const GITHUB_DEFAULT_BRANCH = 'main'

/** Path to the crowd-sourced licence table (for PRs). */
export const BUNDESLAND_OFFICIAL_SOURCES_FILE = 'src/lib/bundeslandOfficialSources.ts'

export function githubBlobUrl(relativePathFromRepoRoot: string): string {
  const trimmed = relativePathFromRepoRoot.replace(/^\/+/, '')
  return `${GITHUB_REPO_ROOT}/blob/${GITHUB_DEFAULT_BRANCH}/${trimmed}`
}

export function githubNewIssueLicenseResearchUrl(): string {
  const q = new URLSearchParams({ template: 'license-research.yml' })
  return `${GITHUB_REPO_ROOT}/issues/new?${q.toString()}`
}
