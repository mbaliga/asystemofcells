import roster from './roster.public.json' with { type: 'json' }

export const TISSUES = [
  { slug: 'daily-cells', label: 'Daily cells', type: 'A' },
  { slug: 'ambient-cells', label: 'Ambient cells', type: 'B' },
  { slug: 'maker-cells', label: 'Maker cells', type: 'C' },
  { slug: 'connective-tissue', label: 'Connective tissue', type: 'D' },
]

export function getRoster() {
  return roster.cells
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
}

// One definition of the three status words, shared by the FAQ (.com) and the
// roster records (.dev) so the two sites cannot drift apart.
export const STATUS_MEANING = {
  live: 'Installable now: the page links to where you can get it.',
  beta: 'A working build exists. The page links to it, or you can ask for access.',
  soon: 'In progress and not installable yet.',
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
  if (cell.status === 'beta') return { label: ctaLabel('beta'), url: '/contact', external: false }
  return null
}
