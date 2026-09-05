/** @type {import('knip').KnipConfig} */
// Tune entry/ignoreBinaries per tech-stack references/knip.md
const strict = process.env.KNIP_STRICT === '1'

export default {
  entry: ['src/**/*.test.ts', 'scripts/**/*.ts', 'analysis/**/*.ts'],
  ignore: [],
  ignoreBinaries: [],
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'error',
    unlisted: 'error',
    binaries: 'error',
    exports: strict ? 'error' : 'warn',
    types: strict ? 'error' : 'warn',
    enumMembers: strict ? 'error' : 'warn',
    duplicates: 'warn',
  },
}
