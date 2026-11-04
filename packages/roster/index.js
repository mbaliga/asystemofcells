import roster from './roster.public.json' with { type: 'json' }
import wings from './wings.json' with { type: 'json' }

export const TISSUES = [
  { slug: 'daily-cells', label: 'Daily cells', type: 'A' },
  { slug: 'ambient-cells', label: 'Ambient cells', type: 'B' },
  { slug: 'maker-cells', label: 'Maker cells', type: 'C' },
  { slug: 'connective-tissue', label: 'Connective tissue', type: 'D' },
]

export function getRoster() {
  return roster.cells
}

// Every cell that is not `hidden`: what the conveyor, the search and the
// developer roster list. A hidden cell still has a product page (getRoster).
export function getVisibleRoster() {
  return roster.cells.filter(c => !c.hidden)
}

export function getWings() {
  return wings.wings
}

// The name shown to people. Falls back to a title-cased slug for any cell
// written before `name` existed.
export function displayName(cell) {
  return cell.name || cell.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const STORES = [
  { store: 'play', label: 'Google Play' },
  { store: 'fdroid', label: 'F-Droid / IzzyOnDroid' },
  { store: 'github', label: 'GitHub releases' },
]

// The install chooser: one entry per store the cell is really on, in a fixed
// order. Empty when there is nothing to install.
export function installLinks(cell) {
  const install = cell.install || {}
  return STORES.filter(s => install[s.store]).map(s => ({ ...s, url: install[s.store] }))
}

export function getCell(slug) {
  return roster.cells.find(c => c.slug === slug) || null
}

export function getByTissue(tissueSlug) {
  return roster.cells.filter(c => c.tissue === tissueSlug)
}

export function groupedByTissue() {
  return TISSUES.map(t => ({ ...t, cells: getByTissue(t.slug) })).filter(t => t.cells.length > 0)
}

const STATUS_CTA = {
  live: 'Get it',
  beta: 'Ask for beta access',
  soon: 'Not released yet',
  building: 'Watch the repo',
}

// One definition of the four status words, shared by the FAQ (.com) and the
// roster records (.dev) so the two sites cannot drift apart.
export const STATUS_MEANING = {
  live: 'Installable now: the page links to where you can get it.',
  beta: 'A working build exists. The page links to it, or you can ask for access.',
  soon: 'In progress and not installable yet.',
  building: 'Public source, no installable build yet: the page links to the repository.',
}

export function ctaLabel(status) {
  return STATUS_CTA[status] || 'Get it'
}

// The one call to action for a cell, or null when there is nothing honest to
// link to. A button never points at '#': a cell with a real destination
// (ctaUrl, or a hub site) gets it; a beta cell without one gets a request via
// the contact page; a 'soon' cell gets no button and says so in plain words.
export function cellCta(cell) {
  const url = cell.ctaUrl || cell.hubUrl || null
  if (url) {
    return { label: cell.ctaLabel || ctaLabel(cell.status), url, external: /^https?:/.test(url) }
  }
  if (cell.status === 'building' && cell.repo) {
    return { label: ctaLabel('building'), url: 'https://github.com/' + cell.repo, external: true }
  }
  if (cell.status === 'beta') return { label: ctaLabel('beta'), url: '/contact', external: false }
  return null
}
