import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const COMPRESSIBLE_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.geojson',
  '.svg',
  '.txt',
  '.xml',
])

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (entry.isFile()) out.push(p)
  }
  return out
}

function isCompressible(p: string): boolean {
  return COMPRESSIBLE_EXTENSIONS.has(path.extname(p).toLowerCase())
}

async function main() {
  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('dist')
  const files = await walk(outDir)
  let originalBytes = 0
  let gzipBytes = 0
  let brotliBytes = 0
  let processed = 0

  for (const filePath of files) {
    if (!isCompressible(filePath)) continue
    const fileStat = await stat(filePath)
    if (fileStat.size < 1024) continue

    const content = await readFile(filePath)
    const gz = gzipSync(content, { level: 9 })
    const br = brotliCompressSync(content, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 6,
      },
    })

    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(`${filePath}.gz`, gz)
    await writeFile(`${filePath}.br`, br)

    originalBytes += content.byteLength
    gzipBytes += gz.byteLength
    brotliBytes += br.byteLength
    processed += 1
  }

  const mib = (b: number) => (b / (1024 * 1024)).toFixed(2)
  console.log(`[compress-dist] files: ${processed}`)
  console.log(`[compress-dist] original: ${mib(originalBytes)} MiB`)
  console.log(`[compress-dist] gzip: ${mib(gzipBytes)} MiB`)
  console.log(`[compress-dist] brotli: ${mib(brotliBytes)} MiB`)
}

void main()
