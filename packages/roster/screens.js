// Reads screenshots/manifest.json (repo root). Entries come back in file order.
// No entry means no image: callers render nothing rather than a placeholder.
//
// The manifest lives at the repo root, outside this package. A static JSON import
// of '../../screenshots/manifest.json' breaks under the apps' preserveSymlinks
// setting (the path is resolved through node_modules/@asoc/roster), so the file
// is found by walking up from the real module path and from the working
// directory instead.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REL = path.join('screenshots', 'manifest.json')

function findManifest() {
  const starts = [path.dirname(fileURLToPath(import.meta.url)), process.cwd()]
  for (const start of starts) {
    let dir = start
    try {
      dir = fs.realpathSync(start)
    } catch {}
    for (;;) {
      const candidate = path.join(dir, REL)
      if (fs.existsSync(candidate)) return candidate
      const up = path.dirname(dir)
      if (up === dir) break
      dir = up
    }
  }
  throw new Error('@asoc/roster/screens: screenshots/manifest.json not found above ' + starts.join(' or '))
}

const manifest = JSON.parse(fs.readFileSync(findManifest(), 'utf8'))

export function getScreens(imagery, { role, lane, scheme } = {}) {
  return manifest.entries.filter(
    (e) =>
      e.imagery === imagery &&
      (role === undefined || e.role === role) &&
      (lane === undefined || e.lane === lane) &&
      (scheme === undefined || e.scheme === scheme),
  )
}

export function getHero(imagery) {
  return manifest.entries.find((e) => e.imagery === imagery && e.role === 'hero') || null
}

const LANE_LABELS = {
  device: 'Captured on device',
  preview: 'Rendered preview',
  web: 'Captured from the web app',
  render: 'Rendered',
  art: 'Artwork',
}

export function laneLabel(lane) {
  return LANE_LABELS[lane] || null
}
