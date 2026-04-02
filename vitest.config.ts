import { defineConfig } from 'vitest/config'

/**
 * Zod v4’s package exports use a custom `@zod/source` condition (see zod `package.json` `exports`).
 * Vitest runs code through Vite’s resolver; without these conditions, `import { z } from 'zod'` can
 * resolve to a broken interop shape (`z` undefined). Same pattern as upstream:
 * https://github.com/colinhacks/zod/blob/main/vitest.config.ts
 */
export default defineConfig({
  resolve: {
    conditions: ['@zod/source', 'default'],
    externalConditions: ['@zod/source', 'default'],
  },
  ssr: {
    resolve: {
      conditions: ['@zod/source', 'default'],
      externalConditions: ['@zod/source', 'default'],
    },
  },
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
})
