# Site architecture — asystemofcells.com as a four-wing house

Repo: `mbaliga/asystemofcells` (pnpm workspace; Astro 4 static; Vercel; `apps/asoc-com`, `apps/asoc-dev`, `packages/kit`, `packages/roster`). This document is the structural contract Claude Code builds against. Nothing here changes the existing analytics boundary or the home mechanism.

## 1. Route map

```
/                         Home. Conveyor (desktop) / reel (mobile). App cells + 3 wing tiles + Tools tile.   analytics: yes
/apps                     Cells wing index: roster grouped by tissue, status chips, install choosers.          analytics: yes
/{slug}                   Product page (existing path, v2 template).                                           analytics: yes
/tools                    Generators hub (existing).                                                           analytics: yes
/tools/*.html             Generators (static).                                                                 analytics: never
/nooz/read                Nooz reader (static).                                                                analytics: never
/hyle-fonts               Hyle type + Deco download (existing).                                                analytics: yes

/cabinet                  Cabinet index: made-things + curiosities, filters.                                    analytics: yes
/cabinet/{item}           Item page.                                                                           analytics: yes
/cabinet/cart             Cart (client-only).                                                                  analytics: never
/cabinet/checkout         Checkout form → POST /api/counter/orders.                                            analytics: never

/architecture             Practice index: work, tools, commission.                                             analytics: yes
/architecture/work/{slug} Explorable (3 layouts).                                                              analytics: yes
/architecture/tools       Tools hub for architects.                                                            analytics: yes
/architecture/tools/sun   Sun path + shadow tool (static page, island).                                        analytics: never
/architecture/tools/wind  Wind rose + ventilation legibility tool.                                             analytics: never
/architecture/tools/vaastu Vaastu grid tool.                                                                   analytics: never
/architecture/commission  Inquiry form → POST /api/counter/inquiries.                                          analytics: never

/prints                   Alloy prints index: how it works, finish tiers, pricing, FAQ.                        analytics: yes
/prints/slicer            The slicer/preview + quote + order (static island; heaviest page).                   analytics: never
/prints/gallery           Things the owner has printed (optional, content collection).                         analytics: yes

/orders/{id}              Customer-facing order status (reads /api/counter/orders/{id}?token=…).               analytics: never
/privacy /about /faq /contact   existing, privacy extended for Counter.
```

Rule of thumb that keeps the boundary legible in code review: **a route whose page component imports a form, a cart, a canvas, a Worker or a `fetch` to `/api/counter` does not pass `analytics`.** Add an ESLint-ish grep check in CI (`tools/check-analytics-boundary.sh` — included) that fails the build if a page both imports one of those and passes `analytics`.

## 2. Layout system: one house, four wings, one rhythm

`ProductLayout.astro` already encodes the rhythm the owner accepted: dark hero with the cell's accent gradient → alternating feature rows → FAQ → fixed simple footer; white surface, `-apple-system`-class type via `--font-ui`. Do **not** fork it four ways. Extract a `WingLayout.astro` in `apps/asoc-com/src/layouts/` that takes:

```ts
interface WingLayoutProps {
  wing: 'apps' | 'cabinet' | 'architecture' | 'prints'
  title: string; description: string; canonical: string
  accent: string            // from data/wings.json
  eyebrow?: string          // e.g. "The Cabinet · one-offs"
  analytics?: boolean       // default false; landing pages pass true
  jsonLd?: object
}
```

and renders: back-link, hero (slot `hero`), default slot, FAQ (slot `faq`, optional), the same fixed footer **plus a wing switcher** (four small links, current wing weighted) in the footer left of the brand name. `ProductLayout` becomes a thin wrapper over `WingLayout` with `wing: 'apps'`.

Palette per wing (one accent each, white surface everywhere; the owner's brand colours violet `#8E7BFF` and radium `#CCEC75` stay the *house* colours and appear only in the wing switcher's current-wing glyph and the home tiles):

| Wing | Accent | Rationale |
|---|---|---|
| apps | per-cell accent from roster (unchanged) | existing |
| cabinet | `#B08D57` (brass) | a cabinet of curiosities; warm against white |
| architecture | `#2B3A4A` (ink) | drawings; pairs with Hyle Deco hairlines |
| prints | `#6F7D86` (matte grey) | the Tesla-viz matte-low-poly look the owner specified for Alloy |

Hyle Deco (`/fonts/hyle/HyleDeco-Regular.ttf`, already in `public/`) is the display face for wing eyebrows and the architecture wing's headings. Hyle Grotesk Classic remains the UI face in the reader; product pages keep `--font-ui`.

**Taste rules to apply in every new component** (from the owner): generous whitespace, no boxed cards where a type hierarchy does the job; info-affordance (ⓘ) for explanatory copy; organic-cell marks for status/provenance (reuse the voronoi cell mark from `public/tools/cells-logo.html` as an inline SVG component `CellMark.astro` with variants `live/beta/soon/open` and the provenance lanes); never a dotted connector across a figure.

## 3. Home changes (A3)

`HomeCarousel.astro` builds `items` from `getRoster()` and pushes one synthetic `tools` tile. Extend the same pattern: push three wing tiles (from `data/wings.json`) **after** the app cells, before `tools`, each with its wing accent and `href`. The corner chrome bottom-left (`.home-foot` link list) gains the four wing links. The `flow-fallback` and the reduced-motion grid list wing tiles too, so the house is navigable without motion. No other change to the conveyor maths.

## 4. Data model

### 4.1 Roster v2 (`packages/roster/roster.public.json`)

Add fields; keep every existing field and value. Schema (`roster.schema.json` — create it, the JSON already references it):

```jsonc
{
  "slug": "fylz",
  "name": "Fylz",                      // NEW: display name (stop deriving from slug; "Haptics Workbench" ≠ "HAfx")
  "tissue": "daily-cells",
  "type": "A",
  "status": "beta",                    // live | beta | soon | building   (NEW value: building = public repo, no install yet)
  "accent": "#3C7A89",
  "oneLiner": "…",
  "isHub": false, "hubUrl": "…",
  "repo": "mbaliga/Fyl-Manager",       // NEW: for the screenshot harvest + source link
  "packageId": "io.github.mbaliga.fylz", // NEW, optional
  "install": {                         // NEW: multi-store chooser; omit keys that don't exist yet
    "play": "https://play.google.com/store/apps/details?id=…",
    "fdroid": "https://apt.izzysoft.de/fdroid/index/apk/…",
    "github": "https://github.com/mbaliga/Fyl-Manager/releases"
  },
  "web": { "label": "Open the web reader", "href": "/nooz/read" },  // replaces readerUrl (keep readerUrl as alias)
  "imagery": "fylz",                   // NEW: key into screenshots/manifest.json (defaults to slug)
  "verify": ["…"]                      // internal, never rendered
}
```

New cells to add (status is honest as of 2026-11-04; the harvest script fills `repo`):

| slug | name | tissue | status | note |
|---|---|---|---|---|
| fylz | Fylz | daily-cells | building | file manager, public repo `Fyl-Manager` |
| fotoz | Foto Xplorr | daily-cells | building | gallery, public repo `Foto-Xplorr` |
| bocal | Bocal | daily-cells | soon | music practice; web prototype has cinematic instrument art |
| runout | Runout | ambient-cells | soon | turntable player; HTML spec (private) |
| sphere | Sphere Launcher | ambient-cells | soon | launcher; HTML spec (private) |
| typewright | Typewright | maker-cells | building | font maker, public repo |
| alloy | Alloy | maker-cells | building | native slicer; the web slicer on `/prints` is its sibling shell |
| assay | Assay | maker-cells | building | owner judged not production-ready (Nov 2026); page is feature-first, status `building`, no install CTA |
| orrery | Orrery | connective-tissue | building | work dashboard; web source public |
| hafx | HAfx | maker-cells | beta | rename of `haptics-workbench` (keep old slug as a redirect in `vercel.json`) |
| counter | Counter | connective-tissue | building | the owner's orders app; page explains the shop counter honestly (optional, can be omitted from the conveyor via `hidden: true`) |

`wing` is **not** a roster field: every roster cell belongs to the apps wing by definition. Wings are `data/wings.json`.

### 4.2 Wings (`packages/roster/wings.json`, exported by `@asoc/roster` as `getWings()`)

See `data/wings.json` in this bundle — slug, name, accent, href, oneLiner, `tileOrder`.

### 4.3 Content collections (`apps/asoc-com/src/content/`)

Astro content collections, typed with `zod` in `config.ts`:

- `products/{slug}.md` — per-product page content (frontmatter: `headline`, `lede`, `features[] {title, body, lane?, image?}`, `faq[]`, `openSource`, `license`, `hub?`); body = long-form. The page template reads roster for identity/CTA and the collection for copy. **Copy-less products render feature triptychs from `features[]`** (three or six), never lorem.
- `cabinet/{item}.md` — see `05_WING_CABINET.md` §2 for the schema (`kind: made|curiosity`, `edition`, `qty`, `price {inr, usd?}`, `condition`, `provenance`, `images[]`, `dims`, `weightGrams`, `shipsTo`).
- `work/{slug}.md` — architecture explorables, see `06_WING_ARCHITECTURE.md` §2 (`layout: scroll|compare|plan`, `scenes[]`).
- `prints-gallery/{slug}.md` — optional.

Images for collections live in `apps/asoc-com/src/assets/<collection>/<slug>/` and go through Astro's `<Image>` for WebP/AVIF + width sets. Screenshots from the harvest live in `apps/asoc-com/src/assets/screens/<imagery>/` with `screenshots/manifest.json` at the repo root (see `04_SCREENSHOT_PIPELINE.md`).

## 5. Islands, not frameworks

Keep the site static. Interactive pieces are **vanilla ES modules** (`<script>` tags Astro bundles) or `public/` static apps, consistent with the reader and generators. No React/Svelte islands; the only heavy dependencies are:

- `three` (ESM, pinned) for the Alloy plate preview and the sun/shadow tool — loaded only on those two pages, via dynamic `import()` after first interaction or `IntersectionObserver`.
- `fuse.js` (already present) for Cabinet search.
- Kiri:Moto engine (Phase B) as a vendored `public/vendor/kiri/` with its licence file.

Shared client code goes in `packages/kit/src/client/` (`counter-client.js` — fetch wrapper for `/api/counter` with idempotency keys; `cart.js`; `money.js` — INR/USD formatting; `provenance.js` — glyph markup).

## 6. Serverless surface (`api/`)

The repo already has root `api/feed.js` and `api/article.js` (Nooz). Counter adds `api/counter/*.js` (Node runtime, Vercel Functions). Contract in `08_COUNTER_BACKEND.md`. `vercel.json` gains `rewrites` so `/api/counter/orders/:id` maps to `api/counter/orders/[id].js`, plus `redirects` for `/haptics-workbench → /hafx`.

## 7. SEO/JSON-LD per wing

- Product pages: `SoftwareApplication` (exists) + `offers` when `install.play` exists.
- Cabinet items: `Product` with `offers { price, priceCurrency: INR, availability }`.
- Architecture: `ProfessionalService` (`/architecture`) + `CreativeWork` per explorable.
- Prints: `Service` with `offers` for the three tiers.
- Sitemap integration already present; set `changefreq` by wing.

## 8. Privacy page delta (A7)

Add a "The counter" section stating exactly: what an order stores (name, email, phone optional, shipping address, the items, the uploaded model file *is not stored* unless the order is accepted, in which case it is copied into the private ledger); where it is stored (a private repository on GitHub, or the owner's own server when migrated — named); who the payment processor is (Razorpay; PayPal for some international orders) and that the site never sees card/UPI details; retention (orders kept for accounting as required by law; model files deleted 30 days after dispatch); how to ask for deletion (email). Keep the tone of the existing page: a smaller claim, stated exactly.

## 9. Lifting a wing to its own domain later

Each wing's pages import only `WingLayout`, its own content collection, `@asoc/kit` and `@asoc/roster`. To move e.g. the Cabinet to `cabinet.example`: create `apps/cabinet` with the same `astro.config.mjs` shape as `asoc-dev`, move `src/pages/cabinet/*` to its root, point a new Vercel project at the repo (the README already documents this for `.dev`), add 301s in the `.com` `vercel.json`. Counter stays on `.com`'s functions and is CORS-allowlisted for the new origin.
