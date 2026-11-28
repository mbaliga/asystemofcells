// Builds Alloy Forge (the web CAD) from the pinned commit in forge.ref and copies it to
// apps/asoc-com/public/alloy/forge/, so it ships at /alloy/forge/ as plain static files. Astro copies public/
// verbatim and never injects into it, so the analytics boundary (see README) holds: the tool is
// never counted. The built output is gitignored; only the pin is committed.
//
// Failure policy: a broken Forge fetch must not take the whole marketing site down. By default a
// failure prints a loud warning and exits 0 (the site deploys without /alloy/forge/). Set FORGE_STRICT=1
// to make it fatal. FORGE_SKIP=1 skips the step. FORGE_REPO overrides the git source (testing).
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'apps/asoc-com/public/alloy/forge')
const strict = process.env.FORGE_STRICT === '1'
const repo = process.env.FORGE_REPO || 'https://github.com/mbaliga/Alloy.git'

function sh(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, npm_config_loglevel: 'error' } })
}

function* walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield p
  }
}

function main() {
  if (process.env.FORGE_SKIP === '1') { console.log('fetch-forge: skipped (FORGE_SKIP=1)'); return }
  const pin = readFileSync(join(root, 'forge.ref'), 'utf8').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'))
  if (!/^[0-9a-f]{40}$/.test(pin || '')) throw new Error('forge.ref must hold a full 40-character commit SHA')
  const work = mkdtempSync(join(tmpdir(), 'forge-'))
  try {
    console.log(`fetch-forge: ${repo} @ ${pin}`)
    sh('git', ['init', '-q', work])
    sh('git', ['fetch', '-q', '--depth', '1', repo, pin], work)
    sh('git', ['checkout', '-q', 'FETCH_HEAD'], work)
    const forge = join(work, 'forge')
    sh('npm', ['ci', '--no-audit', '--no-fund'], forge)
    sh('npm', ['run', 'build'], forge)
    const dist = join(forge, 'dist')
    if (!existsSync(join(dist, 'index.html'))) throw new Error('Forge build produced no dist/index.html')
    // Boundary: the tool must never carry the Vercel analytics script.
    for (const f of walk(dist)) {
      if (/\.(html|js|mjs)$/.test(f) && /vercel[^\n]{0,40}(insights|analytics)/i.test(readFileSync(f, 'utf8'))) {
        throw new Error(`analytics boundary: ${f} references Vercel analytics`)
      }
    }
    rmSync(target, { recursive: true, force: true })
    mkdirSync(dirname(target), { recursive: true })
    cpSync(dist, target, { recursive: true })
    console.log(`fetch-forge: Forge ${pin.slice(0, 9)} copied to apps/asoc-com/public/alloy/forge`)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

try {
  main()
} catch (err) {
  console.error(`\nfetch-forge: FAILED: ${err.message}\n`)
  if (strict) process.exit(1)
  console.error('fetch-forge: continuing without /alloy/forge/ (set FORGE_STRICT=1 to make this fatal)')
  rmSync(target, { recursive: true, force: true })
}
