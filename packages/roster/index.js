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
  beta: 'Join the beta',
  soon: 'Notify me',
}

export function ctaLabel(status) {
  return STATUS_CTA[status] || 'Get it'
}
