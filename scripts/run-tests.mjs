import { spawn } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const testsDir = path.join(root, 'tests')

async function findTests(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return findTests(full)
      return entry.isFile() && entry.name.endsWith('.test.ts') ? [full] : []
    }),
  )
  return files.flat()
}

const tests = await findTests(testsDir)

if (tests.length === 0) {
  console.log('No tests found.')
  process.exit(0)
}

const outdir = await mkdtemp(path.join(tmpdir(), 'wardrobe-tests-'))

try {
  await build({
    entryPoints: tests,
    outdir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    sourcemap: 'inline',
    logLevel: 'silent',
    define: {
      'import.meta.env.DEV': 'false',
      'import.meta.env.PROD': 'true',
      'import.meta.env.MODE': '"test"',
    },
  })

  const bundles = tests.map((test) => path.join(outdir, path.basename(test).replace(/\.ts$/, '.js')))
  const child = spawn(process.execPath, ['--test', ...bundles], {
    cwd: root,
    stdio: 'inherit',
  })

  const code = await new Promise((resolve) => {
    child.on('exit', resolve)
  })
  process.exitCode = code ?? 1
} finally {
  await rm(outdir, { force: true, recursive: true })
}
