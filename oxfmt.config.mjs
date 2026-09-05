import { defineConfig } from 'oxfmt'

// FMC default — aligned with tilda-geo (single quotes) and trassenscout (ignore/build paths).
// ignorePatterns: keep in sync with oxlint.config.mjs.
export default defineConfig({
  useTabs: false,
  tabWidth: 2,
  printWidth: 100,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  semi: false,
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: 'lf',
  sortImports: {
    newlinesBetween: false,
  },
  sortTailwindcss: {
    stylesheet: 'src/index.css',
    functions: ['cn', 'clsx', 'twMerge', 'twJoin'],
  },
  sortPackageJson: true,
  ignorePatterns: [
    '.agents/**',
    '.cursor/**',
    '.output/**',
    'dist/**',
    'public/**',
    'playwright-report/**',
    'test-results/**',
  ],
})
