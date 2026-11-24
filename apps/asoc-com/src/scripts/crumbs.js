// Breadcrumbs for the top-left "back" link: asystemofcells / Section.
// The root is always the house home. The section is the wing the page belongs
// to (Cells is the apps wing, whose home is the home page itself), or Tools.
const SECTIONS = {
  architecture: { label: 'Practice', href: '/architecture/' },
  cabinet: { label: 'The Cabinet', href: '/cabinet/' },
  prints: { label: 'Alloy prints', href: '/prints/' },
  tools: { label: 'Tools', href: '/tools/' },
}

export const CELLS = { label: 'Cells', href: '/' }

/** Crumbs after the root, from a URL path. */
export function crumbsForPath(pathname) {
  const seg = String(pathname).split('/').filter(Boolean)
  const out = []
  const s = SECTIONS[seg[0]]
  if (s) out.push({ ...s })
  // The architecture tools live one level down: Practice / Tools.
  if (seg[0] === 'architecture' && seg[1] === 'tools' && seg.length > 2) out.push({ label: 'Tools', href: '/architecture/tools/' })
  return mark(out, pathname)
}

/** Crumbs for a product page (the Cells wing). */
export function crumbsForCell(pathname) {
  return mark([{ ...CELLS }], pathname)
}

// The crumb that is this very page is text, not a link.
function mark(list, pathname) {
  const here = String(pathname).replace(/\/?$/, '/')
  return list.map((c) => ({ ...c, current: c.href === here }))
}
