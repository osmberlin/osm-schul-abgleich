/** User-Agent for OSM API (required by policy). */
export const OSM_API_USER_AGENT =
  'osm-schul-abgleich/0.0.0 (https://github.com/osmberlin/osm-schul-abgleich)'

/** Must match `public/` filename and entries on https://www.openstreetmap.org/oauth2/applications */
export const OSM_OAUTH_LAND_FILENAME = 'osm-oauth-land.html'

export function getOsmOAuthClientId(): string {
  const id = import.meta.env.VITE_OSM_OAUTH_CLIENT_ID
  if (!id?.trim()) {
    throw new Error('VITE_OSM_OAUTH_CLIENT_ID is not set')
  }
  return id.trim()
}

/**
 * Redirect URI for OAuth (popup): `origin` + Vite `BASE_URL` + {@link OSM_OAUTH_LAND_FILENAME}.
 * Register the resulting URLs on your OSM app (e.g. dev on 127.0.0.1, prod on GitHub Pages).
 */
export function getOsmOAuthRedirectUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return new URL(OSM_OAUTH_LAND_FILENAME, `${window.location.origin}${base}`).href
}

export function isOsmOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OSM_OAUTH_CLIENT_ID?.trim())
}
