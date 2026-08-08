import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'

/**
 * MapRoulette project for Schulabgleich Tag Fixes.
 * https://maproulette.org/admin/project/64568
 */
export const maprouletteProjectId = 64568

/**
 * School Tag Fix challenge.
 * https://maproulette.org/admin/project/64568/challenge/56330
 * https://maproulette.org/browse/challenges/56330
 */
export const schoolTagFixesChallengeId: number | null = 56330

/** Absolute Pages URL for MapRoulette `remoteGeoJson` (must be publicly reachable). */
export const maprouletteTagFixesPublicUrl = `${GITHUB_PAGES_SITE_ROOT}/maproulette/school-tagfixes.json`
