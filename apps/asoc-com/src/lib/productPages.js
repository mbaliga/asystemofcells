/*
 * Per-product page composition.
 *
 * This is the file that keeps fourteen product pages from being one product
 * page fourteen times. Each entry returns an ordered list of blocks, and the
 * order, the tones, and the block types differ per product because the
 * material differs per product: Nooz has ten real screenshots, Hyle has real
 * tokens, Sphere has one beautiful image and nothing to say about it, and nine
 * products have no imagery at all.
 *
 * Rules this file is built to hold:
 *  - a block only exists if a real file or a real roster field backs it,
 *  - no product gets a block whose only content would be house boilerplate,
 *  - a slug with no entry falls through to the statement archetype, which needs
 *    nothing but the roster line, so a new roster entry ships a real page on
 *    day one instead of a page full of placeholders,
 *  - cell.verify[] is internal and is never read here.
 *
 * Tone sequencing is deliberate: no two 'surface' sections may sit next to each
 * other, and the light statement pages are meant to look like the opposite of
 * the dark art-led ones.
 */
import { TISSUES } from '@asoc/roster'

const TISSUE_LABEL = Object.fromEntries(TISSUES.map((t) => [t.slug, t.label]))
const STATUS_LABEL = { live: 'Live', beta: 'Beta', soon: 'Soon' }

export function displayName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function tissueLabel(cell) {
  return TISSUE_LABEL[cell.tissue] || cell.tissue
}

export function statusLabel(cell) {
  return STATUS_LABEL[cell.status] || cell.status
}

const CONTACT = { label: 'Get in touch', href: '/contact' }

function baseFacts(cell) {
  return [
    { label: 'Status', value: statusLabel(cell) },
    { label: 'Family', value: tissueLabel(cell) },
  ]
}

/*
 * Per-slug pages. Anything not listed here uses statementPage() below.
 */
const PAGES = {
  /* Clackpad: the open, community keyboard register. One real app icon, one
     real render of the keyboard, and a grid of what is actually visible in it.
     No download button, because there is no download URL to point at. */
  clackpad: (cell) => [
    {
      type: 'hero',
      tone: 'dark',
      align: 'center',
      logo: cell.logo,
      logoAlt: 'The Clackpad app icon',
      status: statusLabel(cell),
    },
    {
      type: 'art',
      tone: 'surface',
      size: 'plate',
      eyebrow: 'The keyboard',
      headline: 'Three rows of keys, a toolbar, and a strip of suggestions.',
      // Cropped to the keyboard rather than showing the whole tile. In the full
      // tile the phone floats in a large gradient, so at the plate width the
      // keys came out around 90px tall and unreadable, which made the section
      // and the three cards below it describe something the reader could not
      // actually see.
      src: '/images/tiles/clackpad-keyboard.jpg',
      width: 645,
      height: 290,
      alt: 'The Clackpad keyboard: a strip of word suggestions, a toolbar carrying ?123, emoji, layouts, punctuation, ctrl and alt, then three rows of bevelled keys with digits printed above the top row and symbols above the home row',
      caption: 'Cropped from the Clackpad tile art, not a raw device screenshot.',
    },
    {
      type: 'cards',
      tone: 'bg',
      eyebrow: 'On the keys',
      title: 'A keyboard that assumes you are typing, not tapping.',
      items: [
        {
          title: 'Ctrl and alt',
          body: 'Both modifiers sit on the keyboard itself, at the end of the toolbar row.',
        },
        {
          title: 'Numbers and symbols in place',
          body: 'Digits ride above the top letter row, and symbols sit above the two rows below it, printed on the keys they belong to.',
        },
        {
          title: 'A suggestion strip',
          body: 'Word suggestions run across the top, above the toolbar and clear of the keys.',
        },
      ],
    },
    {
      type: 'facts',
      tone: 'surface',
      items: [
        ...baseFacts(cell),
        { label: 'Design language', value: 'Its own, not the house system' },
      ],
    },
    { type: 'links', tone: 'bg', items: [CONTACT] },
  ],

  /* Nooz: the only product with a working destination and real screenshots, so
     it is the only one that reads like a conventional product page. The nine
     finished sections come in through the slot, unchanged. */
  nooz: (cell) => [
    {
      type: 'hero',
      tone: 'dark',
      align: 'center',
      logo: cell.logo,
      logoAlt: 'The Nooz app icon',
      status: statusLabel(cell),
      actions: [{ label: 'Open the web reader', href: cell.readerUrl, primary: true }],
    },
    { type: 'slot' },
    {
      type: 'links',
      tone: 'surface',
      items: [
        { label: 'Open the web reader', href: cell.readerUrl },
        { label: 'How Nooz handles your reading', href: cell.privacyUrl },
        CONTACT,
      ],
    },
  ],

  /* Timely: watch faces, so the faces are the page. Light first, dark for the
     gallery, which is the inverse of Clackpad's dark-then-light shape. */
  timely: (cell) => [
    { type: 'hero', tone: 'bg', align: 'left', status: statusLabel(cell) },
    {
      type: 'gallery',
      tone: 'dark',
      eyebrow: 'The faces',
      title: 'Round, because the watch is.',
      src: '/images/tiles/timely-focus.jpg',
      width: 1200,
      height: 1601,
      // Crop squares measured off timely-focus.jpg, one per face in the render.
      faces: [
        { x: 440, y: 308, d: 320, alt: 'A Timely watch face: a bright yellow sun with a small smile, filling a round display' },
        { x: 438, y: 975, d: 320, alt: 'A Timely watch face: a thin gold sunburst outline and a small smile on black' },
      ],
      caption: 'Tile art from the Timely set, cropped to the faces.',
    },
    { type: 'facts', tone: 'bg', items: baseFacts(cell) },
    { type: 'links', tone: 'surface', items: [CONTACT] },
  ],

  /* Sphere and Meniscus: one headline, one image, nothing else. No call to
     action and no claims, because there is nothing behind them yet. Sphere runs
     dark and Meniscus light, so the pair is not one page twice. */
  sphere: (cell) => [
    {
      type: 'art',
      tone: 'dark',
      size: 'full',
      eyebrow: displayName(cell.slug),
      headline: cell.oneLiner,
      src: '/images/tiles/sphere-focus.jpg',
      width: 1200,
      height: 1601,
      alt: 'Sphere: two views of a round watch, one showing an abstract gold and black mark behind the hands, the other showing a plain black face',
    },
  ],

  meniscus: (cell) => [
    {
      type: 'art',
      tone: 'bg',
      size: 'full',
      eyebrow: displayName(cell.slug),
      headline: cell.oneLiner,
      src: '/images/tiles/meniscus-focus.jpg',
      width: 1200,
      height: 1601,
      alt: 'Meniscus: two views of a round watch face where a single numeral sits across the line between a black upper half and a white lower half',
    },
  ],

  /* Hyle: a design system has no screenshots and does not need any. The tokens
     are transcribed from packages/kit/src/styles/tokens.css. That is a
     dark-ground stylesheet, so the token section runs dark: on the white
     product ground the four cream ink and hairline values were blank boxes. */
  hyle: (cell) => [
    { type: 'hero', tone: 'surface', align: 'left', status: statusLabel(cell) },
    { type: 'tokens', tone: 'dark' },
    {
      type: 'cards',
      tone: 'surface',
      eyebrow: 'The rules',
      title: 'Three constraints the tokens exist to enforce.',
      items: [
        {
          title: 'No status words, no spinners',
          body: 'State is shown by material behaviour, never said by language.',
        },
        {
          title: 'Provenance has a hue',
          body: 'On-device computation reads warm, a radium green. Cloud computation reads cyan, a watched external glow.',
        },
        {
          title: 'Colour is never alone',
          body: 'Every provenance hue is paired with a second, non-colour channel: shape, label, or icon. Colour is never the sole carrier of meaning.',
        },
      ],
    },
    {
      type: 'links',
      tone: 'bg',
      items: [
        { label: 'The Hyle type system', href: '/hyle-fonts' },
        { label: 'Hyle Deco, the display face', href: '/hyle-deco' },
        CONTACT,
      ],
    },
  ],

  /* Hyle Deco: a typeface page is a specimen. The hero and the specimen share
     one continuous dark stage because the face was drawn light-on-black. */
  'hyle-deco': (cell) => [
    { type: 'hero', tone: 'dark', align: 'left', status: statusLabel(cell) },
    { type: 'specimen', tone: 'dark' },
    {
      type: 'facts',
      tone: 'bg',
      // Read out of the two .ttf files themselves: the OpenType name table
      // (nameID 2, subfamily) says "Regular" in HyleDeco-Regular.ttf and
      // "Italic" in HyleDeco-Italic.ttf. Neither file reports "Thin", so no
      // fact row states it. The descriptive prose in the specimen is the
      // owner's own pre-existing copy and is left as written.
      items: [
        { label: 'Styles', value: 'Two, named Regular and Italic in the font files' },
        { label: 'Format', value: 'TrueType (.ttf)' },
        { label: 'Licence', value: 'SIL Open Font License' },
      ],
    },
    {
      type: 'links',
      tone: 'surface',
      items: [
        { label: 'The rest of the Hyle type system', href: '/hyle-fonts' },
        { label: 'Hyle, the design system', href: '/hyle' },
        CONTACT,
      ],
    },
  ],

  /* Figma suite: a marketplace shelf, no hero image. The three tiles are the
     three plugins the roster line names, in the order it names them, with no
     invented description under any of them. */
  'figma-suite': (cell) => [
    { type: 'hero', tone: 'bg', align: 'left', status: statusLabel(cell) },
    {
      type: 'cards',
      tone: 'surface',
      numbered: true,
      eyebrow: 'The suite',
      title: 'Three plugins.',
      items: [
        { title: 'Export watchfaces' },
        { title: 'Publish a Trusted Web Activity' },
        { title: 'One just for fun' },
      ],
    },
    {
      type: 'facts',
      tone: 'bg',
      items: [...baseFacts(cell), { label: 'Plugins', value: 'Three' }],
    },
    { type: 'links', tone: 'surface', items: [CONTACT] },
  ],
}

/*
 * The fallback. Asom lands here on purpose: the exemplar for a routing daemon
 * is a model table, and no model data exists, so it gets a sentence instead of
 * an invented table.
 */
function statementPage(cell) {
  return [
    {
      type: 'statement',
      tone: 'surface',
      eyebrow: displayName(cell.slug),
      statement: cell.oneLiner,
      accent: cell.accent,
    },
    { type: 'facts', tone: 'bg', items: baseFacts(cell) },
    { type: 'links', tone: 'surface', items: [CONTACT] },
  ]
}

export function getPageBlocks(cell) {
  const build = PAGES[cell.slug]
  const blocks = build ? build(cell) : statementPage(cell)
  // The hero block carries the same three strings on every page, so fill them
  // here rather than repeating them in fourteen entries above.
  return blocks.map((block) =>
    block.type === 'hero'
      ? {
          eyebrow: tissueLabel(cell),
          name: displayName(cell.slug),
          lead: cell.oneLiner,
          ...block,
        }
      : block,
  )
}

/*
 * Structured data, per product.
 *
 * The old layout asserted SoftwareApplication + operatingSystem Android for
 * every cell, including a design system, a typeface, a set of Figma plugins and
 * a routing daemon. Nothing in the roster states a platform for any product, so
 * operatingSystem is emitted for exactly the two products whose own assets show
 * an Android phone app (Clackpad's keyboard render sits under an Android
 * launcher; Nooz ships ten Android screenshots and an app icon), and for
 * nothing else. Everything else is a SoftwareApplication with no platform, or a
 * CreativeWork where the thing is not an application at all.
 */
const SCHEMA = {
  clackpad: { type: 'SoftwareApplication', mobile: true },
  nooz: { type: 'SoftwareApplication', mobile: true },
  odyssey: { type: 'SoftwareApplication' },
  crocodyl: { type: 'SoftwareApplication' },
  ebbflow: { type: 'SoftwareApplication' },
  'haptics-workbench': { type: 'SoftwareApplication' },
  'figma-suite': { type: 'SoftwareApplication' },
  asom: { type: 'SoftwareApplication' },
  globe: { type: 'CreativeWork' },
  timely: { type: 'CreativeWork' },
  sphere: { type: 'CreativeWork' },
  meniscus: { type: 'CreativeWork' },
  hyle: { type: 'CreativeWork' },
  'hyle-deco': { type: 'CreativeWork' },
}

export function getJsonLd(cell) {
  const spec = SCHEMA[cell.slug] || { type: 'CreativeWork' }
  const json = {
    '@context': 'https://schema.org',
    '@type': spec.type,
    name: displayName(cell.slug),
    description: cell.oneLiner,
  }
  if (spec.mobile) {
    json.applicationCategory = 'MobileApplication'
    json.operatingSystem = 'Android'
  }
  return json
}
