// The homepage sections beyond the apps: architecture (past projects), shop
// (collectibles) and prints (3D prints someone can ask for). Apps are the
// existing roster; this file owns the other three and the one list of all four,
// in nav order.
//
// Content here is the owner's alone. Nothing is invented: the shipped entries
// are flagged `placeholder: true`, exist only so the pages and the conveyor can
// be built and checked, and are dropped from a production build (see
// placeholdersHidden). A section with no real entries then renders its honest
// "nothing published yet" state instead of fake work.
import architecture from './sections/architecture.public.json' with { type: 'json' }
import shop from './sections/shop.public.json' with { type: 'json' }
import prints from './sections/prints.public.json' with { type: 'json' }

// Nav order, left to right. `href` is the section's own real page (apps is the
// homepage itself), so every nav link works with no JavaScript. Accents avoid
// leaning on a red/green contrast; the selected state is also carried by
// weight and an underline, never by colour alone.
export const SECTIONS = [
  { slug: 'apps', label: 'Apps', accent: '#8E7BFF', href: '/', blurb: 'Small, quiet apps, on your device.' },
  {
    slug: 'architecture',
    label: 'Architecture',
    accent: '#7EB5C8',
    href: '/architecture/',
    blurb: 'Past architecture projects.',
  },
  { slug: 'shop', label: 'Shop', accent: '#E8A33D', href: '/shop/', blurb: 'Collectibles, made in small editions.' },
  {
    slug: 'prints',
    label: 'Prints',
    accent: '#C87EA8',
    href: '/prints/',
    blurb: 'Ask for a 3D print of one of these, made to order.',
  },
]

export const AVAILABILITY_LABEL = { available: 'Available', 'sold-out': 'Sold out', soon: 'Soon' }

const FILES = { architecture, shop, prints }
const HEX = /^#[0-9a-fA-F]{6}$/

// A production deploy (Vercel sets VERCEL_ENV at build time) must never show a
// placeholder; previews and local builds do, so the pages and the conveyor can
// be seen working. ASOC_SHOW_PLACEHOLDERS=1 overrides, for a deliberate
// staging build.
export function placeholdersHidden() {
  return process.env.VERCEL_ENV === 'production' && process.env.ASOC_SHOW_PLACEHOLDERS !== '1'
}

function validate(slug, items) {
  const seen = new Set()
  for (const it of items) {
    const where = `@asoc/roster sections/${slug}: "${it.key || it.name || '?'}"`
    for (const f of ['key', 'name', 'oneLiner', 'accent']) {
      if (!it[f] || typeof it[f] !== 'string') throw new Error(`${where} is missing "${f}"`)
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.key)) throw new Error(`${where}: key must be lowercase-hyphenated`)
    if (seen.has(it.key)) throw new Error(`${where}: duplicate key`)
    seen.add(it.key)
    if (!HEX.test(it.accent)) throw new Error(`${where}: accent must be a #RRGGBB hex`)
    if (it.availability && !AVAILABILITY_LABEL[it.availability]) {
      throw new Error(`${where}: availability must be one of ${Object.keys(AVAILABILITY_LABEL).join(', ')}`)
    }
    if (it.image && (!it.image.src || !it.image.alt)) throw new Error(`${where}: image needs both src and alt`)
    if (it.options) {
      for (const o of it.options) {
        if (!o.label || !Array.isArray(o.values) || o.values.length === 0) {
          throw new Error(`${where}: each option needs a label and a non-empty values list`)
        }
      }
    }
  }
}

export function getSection(slug) {
  return SECTIONS.find((s) => s.slug === slug) || null
}

// The entries of architecture / shop / prints that this build may show.
export function getSectionItems(slug) {
  const file = FILES[slug]
  if (!file) return []
  validate(slug, file.items)
  return placeholdersHidden() ? file.items.filter((it) => !it.placeholder) : file.items
}

export function getSectionItem(slug, key) {
  return getSectionItems(slug).find((it) => it.key === key) || null
}

// "Price on request" is the honest default: a price is only shown when the
// owner has written one.
export function priceLine(item) {
  return item.price ? item.price : 'Price on request'
}

// The short line under a name: what kind of thing it is.
export function kickerFor(slug, item) {
  if (item.placeholder && slug !== 'apps') return 'Placeholder'
  if (slug === 'architecture') return [item.type, item.year, item.place].filter(Boolean).join(' · ') || 'Architecture'
  if (slug === 'shop') return item.edition || 'Collectible'
  if (slug === 'prints') {
    const material = (item.options || []).find((o) => /material/i.test(o.label))
    return material ? material.values.join(' / ') : '3D print'
  }
  return ''
}

// A conveyor/search tile for an entry of one of the three sections. The Apps
// tiles are built from the roster in the homepage component, in the same shape.
export function tileOf(slug, item) {
  const section = getSection(slug)
  return {
    key: `${slug}/${item.key}`,
    name: item.name,
    section: slug,
    sectionLabel: section.label,
    kicker: kickerFor(slug, item),
    status: item.availability ? AVAILABILITY_LABEL[item.availability] : '',
    oneLiner: item.oneLiner,
    color: item.accent,
    href: `/${slug}/${item.key}/`,
    external: false,
    image: item.image || null,
    placeholder: !!item.placeholder,
  }
}
