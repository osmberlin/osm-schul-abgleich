import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'

/**
 * MapRoulette project for Schulabgleich.
 * https://maproulette.org/admin/project/64568
 */
export const maprouletteProjectId = 64568

/**
 * School Tag Fix challenge (official where licence-OK, else OSM-only; one feed).
 * https://maproulette.org/admin/project/64568/challenge/56330
 * https://maproulette.org/browse/challenges/56330
 */
export const schoolTagFixesChallengeId: number | null = 56330

/**
 * Create-school challenge for licence-OK `official_only` schools with a strong tag package.
 * https://maproulette.org/admin/project/64568/challenge/56332
 * https://maproulette.org/browse/challenges/56332
 */
export const schoolCreatesChallengeId: number | null = 56332

/** Absolute Pages URL for MapRoulette `remoteGeoJson` (must be publicly reachable). */
export const maprouletteTagFixesPublicUrl = `${GITHUB_PAGES_SITE_ROOT}/maproulette/school-tagfixes.json`

/** Absolute Pages URL for the create-school feed (no Tag Fix cooperativeWork). */
export const maprouletteSchoolCreatesPublicUrl = `${GITHUB_PAGES_SITE_ROOT}/maproulette/school-creates.json`
