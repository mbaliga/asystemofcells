# @asoc/roster

The single source of truth for the product roster shown on asystemofcells.com
and .dev. `roster.public.json` is hand-authored from the constellation's own
repos, not
from the original placeholder brief. A few real corrections against that
original brief, worth recording here rather than losing silently:

- **Crocodyl** is an archery form and fatigue coach (camera and pose
  estimation), not a habit tracker.
- **Ebbflow** is an EEG personal-state app, not a tide and breath watchface. It
  moved from Ambient cells to Maker cells.
- **Hyle Deco** is a Google Fonts submission (a hairline display typeface),
  not a generic decorative texture layer.
- **Asom** (asystemofmodels) was not in the original roster at all. It is a
  real, built, Apache-2.0 sovereign model-routing daemon and is very likely
  elsewhere. Added under Connective tissue.

Two products from the original brief are **omitted entirely** rather than
guessed:

- **Stem** ("the account-less core") has no matching repo anywhere in the
  31-repo constellation. "Cells interlinked within one stem" reads as the
  house's naming motif, not evidence of a separate shipped product.
- **Orrery** exists only as a repo with a single "Initial commit" and a
  `LICENSE` file. The constellation notes suggest it might actually be a
  renamed testing/security tool ("ex-Assay"), not a live orrery watchface as
  the original brief described. Publishing it as a watchface would very
  likely be wrong.

`verify` arrays on individual cells flag fields (mostly accent colors) that
have no confirmed source and are carried over as placeholders pending the
owner. They are internal: nothing renders them, and nothing in them may be
a price, a private-repo detail or an internal codename.

Optional fields written for publication: `ctaLabel` and `ctaUrl` (the one real
destination for the page's button), `model` (`freemium`), `kind` (`app`,
`design-system`, `typeface`, `plugins`, `watchface`), `leaves` (what leaves the
device, as `{ heading, body }`) and `privacyUrl`. `cellCta(cell)` turns these
into the button, and never returns a link to `#`.

## Roster v2

Every cell carries `slug`, `name` (the display name; the slug is the URL),
`tissue`, `type`, `status`, `accent`, `oneLiner`, `isHub`. Optional:

- `repo` (`owner/name`), `packageId`, `imagery` (key into
  `screenshots/manifest.json`; written out, equal to the slug by default).
- `install`: `{ play, fdroid, github }`, only the stores that really exist.
  `installLinks(cell)` returns them in that order.
- `web`: `{ label, href }`, a same-origin web app. `readerUrl` stays as an
  older alias on Nooz.
- `hidden: true`: kept out of the home conveyor, the search and the developer
  roster, but the product page is still built. `getRoster()` returns every cell;
  `getVisibleRoster()` skips hidden ones.
- `verify`: internal notes. Never rendered.

`displayName(cell)` is `name`, or a title-cased slug as a fallback.

Status is one of `live`, `beta`, `soon`, `building`. `building` means the source
is public and nothing is installable yet. Its button is "Watch the repo" and
points at the repository.

`roster.schema.json` describes the file. `node packages/roster/validate.mjs`
(or `pnpm roster:check`) checks it by hand, with no dependencies: required
fields, enums, patterns, unique slugs, and the screenshot manifest. It also runs
at the start of `pnpm build`.

The old slug `haptics-workbench` is now `hafx`; `vercel.json` redirects the old
path.

## Wings

`wings.json` lists the four wings of the house (slug, name, accent, href,
oneLiner). `getWings()` returns them. The home page does not use them yet.

## Screenshots

`screenshots/manifest.json` at the repo root lists every product image and
where it came from (`screenshots/manifest.schema.json` is the shape). `screens.js`
reads it:

```js
import { getScreens, getHero, laneLabel } from '@asoc/roster/screens'
getScreens('nooz', { role: 'feature', scheme: 'dark' }) // file order
getHero('nooz') // first role: hero entry, or null
laneLabel('device') // 'Captured on device'
```

Lanes are `device`, `preview`, `web`, `render`, `art`. An entry with lane
`device` must carry a `device` block. No entry means no image is shown.

## Sections: architecture, shop, prints

Beyond the apps above, the homepage has three more sections whose content is
the owner's alone: **Architecture** (past projects), **Shop** (collectibles) and
**Prints** (3D prints someone can ask for). They live in
`sections/architecture.public.json`, `sections/shop.public.json` and
`sections/prints.public.json`, loaded by `sections.js`:

```js
import { SECTIONS, getSectionItems, tileOf } from '@asoc/roster/sections'
```

`SECTIONS` is the one list of all four sections in nav order (Apps first). Each
file has an `items` array; every item needs `key` (lowercase-hyphenated, unique),
`name`, `oneLiner` and `accent` (`#RRGGBB`). The rest is optional:

- **Architecture:** `type`, `year`, `place`, `role`.
- **Shop:** `edition`, `price` (free text including the currency; leave it out
  to show "Price on request"), `availability` (`available`, `sold-out`, `soon`).
- **Prints:** `options` (a list of `{ label, values[] }` the visitor picks from),
  `leadTime`, `price`, `availability`.
- Any: `image` as `{ src, alt }` (files go in
  `apps/asoc-com/public/sections/<section>/<key>.jpg`; the entry is not valid
  without alt text).

The loader validates the files and fails the build on a bad entry.

**Nothing here is invented.** The entries that ship are flagged
`"placeholder": true`; they exist so the pages and the conveyor can be built and
seen working, and they are **dropped from a production build** (when
`VERCEL_ENV=production`; set `ASOC_SHOW_PLACEHOLDERS=1` to override for a
deliberate staging build). Until a section has a real entry, production shows
the section name with the word "Soon" and an honest "nothing published yet"
state. To publish: add real entries, delete the placeholders. "Ordering" is a
plain `mailto:` link (there is no checkout or payment); the address is in
`apps/asoc-com/src/lib/contact.js`.

## Usage

```js
import { getRoster, getVisibleRoster, groupedByTissue, getCell, ctaLabel } from '@asoc/roster'
```
