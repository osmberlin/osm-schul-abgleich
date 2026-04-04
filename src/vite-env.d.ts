/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OSM_OAUTH_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
