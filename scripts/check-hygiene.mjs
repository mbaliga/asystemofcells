#!/usr/bin/env node
// Repo hygiene checks. No dependencies; run from anywhere:
//   node scripts/check-hygiene.mjs
//
// (a) tracked paths contain no characters that are illegal on Windows
// (b) the root nooz/ copies are byte-identical to the ones served from
//     apps/asoc-com/public/nooz/ (reader and privacy page)
// (c) @vercel/analytics never reaches the Nooz reader or the tools

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const fail = (check, msg) => failures.push(`[${check}] ${msg}`)

// Files tracked by git, or a directory walk when not in a checkout.
function listFiles() {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    return out.split('\0').filter(Boolean)
  } catch {
    return walk(root).map((p) => relative(root, p).split(sep).join('/'))
  }
}

function walk(dir) {
  const skip = new Set(['node_modules', '.git', 'dist', '.astro'])
  const out = []
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

const files = listFiles()

// (a) Windows-illegal path characters, reserved device names, trailing dot/space.
const illegalChars = /[<>:"|?*\\\u0000-\u001f]/
const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
for (const f of files) {
  for (const seg of f.split('/')) {
    if (illegalChars.test(seg)) fail('paths', `illegal character in path: ${JSON.stringify(f)}`)
    else if (reserved.test(seg)) fail('paths', `reserved Windows name "${seg}" in path: ${f}`)
    else if (/[. ]$/.test(seg)) fail('paths', `trailing dot or space in path: ${f}`)
  }
}

// (b) byte identity of mirrored trees.
function tree(rel) {
  const base = join(root, rel)
  const map = new Map()
  try {
    for (const p of walk(base)) map.set(relative(base, p).split(sep).join('/'), p)
  } catch {
    fail('mirror', `missing directory: ${rel}`)
  }
  return map
}

function compare(a, b) {
  const ta = tree(a)
  const tb = tree(b)
  if (ta.size === 0 || tb.size === 0) {
    if (ta.size === 0 && tb.size === 0) fail('mirror', `both ${a} and ${b} are empty or missing`)
    return
  }
  for (const [k, p] of ta) {
    if (!tb.has(k)) fail('mirror', `${b}/${k} is missing (present in ${a})`)
    else if (!readFileSync(p).equals(readFileSync(tb.get(k)))) fail('mirror', `${a}/${k} differs from ${b}/${k}`)
  }
  for (const k of tb.keys()) if (!ta.has(k)) fail('mirror', `${a}/${k} is missing (present in ${b})`)
}

compare('nooz/read', 'apps/asoc-com/public/nooz/read')
compare('nooz/privacy', 'apps/asoc-com/public/nooz/privacy')

// (c) analytics boundary: the reader and the tools are static files that must
// never load or mention Vercel analytics.
const forbidden = [/@vercel\/analytics/i, /_vercel\/insights/i, /va\.vercel-scripts\.com/i, /vercel\/speed-insights/i]
const guarded = ['nooz/read', 'apps/asoc-com/public/nooz/read', 'apps/asoc-com/public/tools']
for (const dir of guarded) {
  for (const f of files.filter((x) => x.startsWith(dir + '/'))) {
    let text
    try {
      text = readFileSync(join(root, f), 'utf8')
    } catch {
      continue
    }
    if (text.includes('\u0000')) continue // binary
    for (const re of forbidden) if (re.test(text)) fail('boundary', `${f} matches ${re}`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  console.error(`\n${failures.length} hygiene failure(s)`)
  process.exit(1)
}
console.log(`hygiene ok (${files.length} files checked)`)
