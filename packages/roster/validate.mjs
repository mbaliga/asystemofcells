// Dependency-free checks for roster.public.json and screenshots/manifest.json.
// Run: node packages/roster/validate.mjs   (also part of the root build)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')
const errors = []
const fail = (m) => errors.push(m)
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

const STATUS = ['live', 'beta', 'soon', 'building']
const TISSUES = ['daily-cells', 'ambient-cells', 'maker-cells', 'connective-tissue']
const TYPES = ['A', 'B', 'C', 'D']
const KINDS = ['app', 'design-system', 'typeface', 'plugins', 'watchface']
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const HEX = /^#[0-9a-fA-F]{6}$/
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const isStr = (v) => typeof v === 'string' && v.length > 0
const isUri = (v) => isStr(v) && (/^https?:\/\/\S+$/.test(v) || /^\/[^\s]*$/.test(v))
const isHttp = (v) => isStr(v) && /^https?:\/\/\S+$/.test(v)

// --- roster ---------------------------------------------------------------
const roster = read(path.join(here, 'roster.public.json'))
const seen = new Set()
const imageryKeys = new Set()
if (!Array.isArray(roster.cells)) fail('roster: "cells" must be an array')
for (const c of roster.cells || []) {
  const w = `roster cell "${c.slug ?? '?'}"`
  for (const f of ['slug', 'name', 'tissue', 'type', 'status', 'accent', 'oneLiner']) {
    if (!isStr(c[f])) fail(`${w}: missing or empty "${f}"`)
  }
  if (typeof c.isHub !== 'boolean') fail(`${w}: "isHub" must be a boolean`)
  if (isStr(c.slug)) {
    if (!SLUG.test(c.slug)) fail(`${w}: slug must be lowercase-hyphenated`)
    if (seen.has(c.slug)) fail(`${w}: duplicate slug`)
    seen.add(c.slug)
  }
  if (c.tissue && !TISSUES.includes(c.tissue)) fail(`${w}: bad tissue "${c.tissue}"`)
  if (c.type && !TYPES.includes(c.type)) fail(`${w}: bad type "${c.type}"`)
  if (c.status && !STATUS.includes(c.status)) fail(`${w}: bad status "${c.status}"`)
  if (c.accent && !HEX.test(c.accent)) fail(`${w}: accent must be #RRGGBB`)
  if (c.repo !== undefined && !(typeof c.repo === 'string' && REPO.test(c.repo))) fail(`${w}: repo must be owner/name`)
  if (c.packageId !== undefined && !isStr(c.packageId)) fail(`${w}: packageId must be a string`)
  if (c.hidden !== undefined && typeof c.hidden !== 'boolean') fail(`${w}: hidden must be a boolean`)
  if (c.model !== undefined && c.model !== 'freemium') fail(`${w}: model must be "freemium"`)
  if (c.kind !== undefined && !KINDS.includes(c.kind)) fail(`${w}: bad kind "${c.kind}"`)
  if (c.imagery !== undefined && !isStr(c.imagery)) fail(`${w}: imagery must be a string`)
  imageryKeys.add(c.imagery || c.slug)
  if (c.install !== undefined) {
    if (typeof c.install !== 'object' || c.install === null || Array.isArray(c.install)) fail(`${w}: install must be an object`)
    else {
      for (const [k, v] of Object.entries(c.install)) {
        if (!['play', 'fdroid', 'github'].includes(k)) fail(`${w}: install.${k} is not a known store`)
        else if (!isHttp(v)) fail(`${w}: install.${k} must be an http(s) URL`)
      }
    }
  }
  if (c.web !== undefined) {
    if (!c.web || !isStr(c.web.label) || !isUri(c.web.href)) fail(`${w}: web needs a label and an href`)
  }
  if (c.leaves !== undefined && !(c.leaves && isStr(c.leaves.heading) && isStr(c.leaves.body))) {
    fail(`${w}: leaves needs heading and body`)
  }
  for (const f of ['privacyUrl', 'ctaUrl', 'readerUrl']) if (c[f] !== undefined && !isUri(c[f])) fail(`${w}: ${f} is not a URL`)
  if (c.hubUrl !== undefined && !isHttp(c.hubUrl)) fail(`${w}: hubUrl must be an http(s) URL`)
  if (c.isHub && !c.hubUrl) fail(`${w}: a hub cell needs hubUrl`)
  if (c.verify !== undefined && !(Array.isArray(c.verify) && c.verify.every((v) => typeof v === 'string'))) {
    fail(`${w}: verify must be an array of strings`)
  }
}
for (const c of roster.cells || []) {
  if (c.parent && !seen.has(c.parent)) fail(`roster cell "${c.slug}": parent "${c.parent}" is not a cell`)
}

// --- wings ----------------------------------------------------------------
const wingsPath = path.join(here, 'wings.json')
if (fs.existsSync(wingsPath)) {
  const wings = read(wingsPath).wings
  if (!Array.isArray(wings)) fail('wings: "wings" must be an array')
  else {
    const ws = new Set()
    for (const x of wings) {
      for (const f of ['slug', 'name', 'eyebrow', 'href', 'oneLiner']) if (!isStr(x[f])) fail(`wing "${x.slug ?? '?'}": missing "${f}"`)
      if (!HEX.test(x.accent || '')) fail(`wing "${x.slug}": accent must be #RRGGBB`)
      if (ws.has(x.slug)) fail(`wing "${x.slug}": duplicate`)
      ws.add(x.slug)
    }
  }
}

// --- screenshot manifest --------------------------------------------------
// Imagery keys that are not roster cells but are allowed in the manifest.
const EXTRA_IMAGERY = ['tools']
const manifestPath = path.join(repoRoot, 'screenshots/manifest.json')
const LANES = ['device', 'preview', 'web', 'render', 'art']
const ROLES = ['hero', 'feature', 'gallery']
const SCHEMES = ['light', 'dark', null]
const VIEWPORTS = ['phone', 'tablet', 'desktop', 'watch', 'figma', null]
if (!fs.existsSync(manifestPath)) fail('screenshots/manifest.json is missing')
else {
  const m = read(manifestPath)
  if (m.version !== 1) fail('manifest: version must be 1')
  if (!Array.isArray(m.entries)) fail('manifest: entries must be an array')
  const ids = new Set()
  for (const e of m.entries || []) {
    const w = `manifest entry "${e.id ?? '?'}"`
    for (const f of ['id', 'imagery', 'role', 'lane', 'label', 'src']) if (!isStr(e[f])) fail(`${w}: missing "${f}"`)
    if (isStr(e.id)) {
      if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(e.id)) fail(`${w}: id pattern is a.b.c, lowercase`)
      if (ids.has(e.id)) fail(`${w}: duplicate id`)
      ids.add(e.id)
    }
    if (e.role && !ROLES.includes(e.role)) fail(`${w}: bad role`)
    if (e.lane && !LANES.includes(e.lane)) fail(`${w}: bad lane`)
    if (isStr(e.label) && e.label.length > 80) fail(`${w}: label is over 80 characters`)
    if (e.scheme !== undefined && !SCHEMES.includes(e.scheme)) fail(`${w}: bad scheme`)
    if (e.viewport !== undefined && !VIEWPORTS.includes(e.viewport)) fail(`${w}: bad viewport`)
    if (e.mask !== undefined && ![null, 'circle'].includes(e.mask)) fail(`${w}: bad mask`)
    for (const f of ['w', 'h']) if (e[f] !== undefined && !Number.isInteger(e[f])) fail(`${w}: ${f} must be an integer`)
    if (e.sample_data !== undefined && typeof e.sample_data !== 'boolean') fail(`${w}: sample_data must be a boolean`)
    if (e.source !== undefined && (typeof e.source !== 'object' || e.source === null)) fail(`${w}: source must be an object`)
    if (e.device !== undefined && e.device !== null) {
      if (typeof e.device !== 'object') fail(`${w}: device must be an object or null`)
      else if (!isStr(e.device.model) || !isStr(e.device.android)) fail(`${w}: device needs model and android`)
    }
    if (e.lane === 'device' && !(e.device && typeof e.device === 'object')) fail(`${w}: lane "device" requires a device block`)
    if (isStr(e.imagery) && !imageryKeys.has(e.imagery) && !EXTRA_IMAGERY.includes(e.imagery)) {
      fail(`${w}: imagery "${e.imagery}" matches no roster cell`)
    }
    if (isStr(e.src) && !fs.existsSync(path.join(repoRoot, e.src))) fail(`${w}: src "${e.src}" does not exist`)
  }
}

if (errors.length) {
  console.error(`roster check FAILED (${errors.length}):`)
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log(`roster check OK (${roster.cells.length} cells)`)
