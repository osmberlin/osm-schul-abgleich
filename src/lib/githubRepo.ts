/** Public repo for “edit on GitHub” and issue links (aligned with AppFooter). */
export const GITHUB_REPO_ROOT = 'https://github.com/osmberlin/osm-schul-abgleich'

/** CI / scheduled runs (repo slug matches the live GitHub org project). */
export const GITHUB_ACTIONS_URL = 'https://github.com/osmberlin/osm-schulabgleich/actions'

/** Deployed app + `public/datasets/` (canonical public URL; Vite `base` is `/` on Pages). */
export const GITHUB_PAGES_SITE_ROOT = 'https://schulabgleich.osm-verkehrswende.org'

export const GITHUB_DEFAULT_BRANCH = 'main'

/** Absolute URL to a file under `public/datasets/` on GitHub Pages (for OSM `source` etc.). */
export function githubPagesDatasetUrl(pathUnderDatasets: string): string {
  const p = pathUnderDatasets.replace(/^\/+/, '')
  return `${GITHUB_PAGES_SITE_ROOT}/datasets/${p}`
}

/** Path to the crowd-sourced licence table (for PRs). */
export const BUNDESLAND_OFFICIAL_SOURCES_FILE = 'src/lib/bundeslandOfficialSources.ts'

export function githubBlobUrl(relativePathFromRepoRoot: string): string {
  const trimmed = relativePathFromRepoRoot.replace(/^\/+/, '')
  return `${GITHUB_REPO_ROOT}/blob/${GITHUB_DEFAULT_BRANCH}/${trimmed}`
}

export function githubCommitUrlOnDefaultBranch(ref: string): string {
  const trimmed = ref.replace(/^\/+/, '')
  return `${GITHUB_REPO_ROOT}/commit/${trimmed}?branch=${encodeURIComponent(GITHUB_DEFAULT_BRANCH)}`
}

export function githubNewIssueLicenseResearchUrl(): string {
  const q = new URLSearchParams({ template: 'license-research.yml' })
  return `${GITHUB_REPO_ROOT}/issues/new?${q.toString()}`
}
