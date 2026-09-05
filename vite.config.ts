import { copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite'

/**
 * GitHub Pages has no server-side fallback to index.html. Unknown paths return
 * 404 before the SPA loads. GH Pages serves custom 404.html for those URLs; a
 * copy of index.html lets TanStack Router read the real path and render.
 * @see https://github.com/orgs/community/discussions/36010
 */
function spaGithubPages404(): Plugin {
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'spa-github-pages-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      root = config.root
    },
    closeBundle() {
      const dir = resolve(root, outDir)
      copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'))
    },
  }
}

export default defineConfig({
  /** Custom domain is subdomain root (`schulabgleich.osm-verkehrswende.org`), not `/repo/`. */
  base: '/',
  plugins: [tailwindcss(), viteReact({ compiler: true }), spaGithubPages404()],
  server: {
    port: 5174,
    strictPort: true,
    /** Use 127.0.0.1 so OSM OAuth redirect can be `http://127.0.0.1:5174/osm-oauth-land.html`. */
    host: '127.0.0.1',
    fs: {
      // Bun globalStore realpaths packages into ~/.bun/install/cache/links (Fontsource woff2).
      // Extend defaults — do not replace the workspace root.
      // @see https://github.com/vitejs/vite/issues/22662
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        resolve(homedir(), '.bun/install/cache/links'),
      ],
    },
  },
  build: {
    target: browserslistToEsbuild(),
    /** Emit `.map` files for production debugging and error stack traces. */
    sourcemap: true,
  },
})
