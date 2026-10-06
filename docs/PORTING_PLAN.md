# asystemofcells (studio website): multi-platform porting plan

> Part of the constellation-wide porting program (`Personal-Tracker/PORTING_PROGRAM.md`, 2026-10-06).
> Status: **PLAN. Nothing in this document has been built.** Every claim about a target platform is
> labelled with its evidence class (§0). This file is owned by the lead planning session; a platform
> track updates only its own §4 row and appends to the progress log at the end of this file (this repo
> has no STATE or PROGRESS file, see §6).
> This repository is public. The plan deliberately leaves out pricing, licensing mechanics and
> competitive positioning (decision D-T in `Personal-Tracker/DECISIONS.md`); hardware and account
> questions are referenced by master OQ id only, as this plan's own choice.

## 0. Evidence labels (never dropped)

`PLAN` (this document) · `CI (hosted VM) evidence` · `SIMULATOR` · `CI-APPROX — NOT DEVICE EVIDENCE` ·
`NEEDS-DEVICE-VALIDATION` (NDV) · `NEEDS-OWNER-VALIDATION` (NOV) · `NOT-APPLICABLE` (with reason).
The master's additions `CONTAINER-BUILD-ONLY` and `BROWSER-HEADLESS` are used where stated. Nothing was
run while writing this plan: no `pnpm`, no build, no browser, no device. Facts below were read from the
checkout on 2026-10-06; platform facts come from the master plan or are marked ASSUMPTION.

## 1. What this repo is, in porting terms

- **Product.** The studio's two websites in one pnpm monorepo: asystemofcells.com (the product house:
  homepage conveyor, one page per product built from a shared roster, About, FAQ, Contact, Privacy,
  Tools, Fonts) and asystemofcells.dev (the engineering surface: roster records, Hyle token docs, the
  four rules, colophon). It also serves static app-like surfaces that Astro never touches: the Nooz web
  reader at `/nooz/read` with its privacy page at `/nooz/privacy`, and two owner-authored single-file
  canvas generators at `/tools`. Two Vercel Node functions (`api/feed.js`, `api/article.js`) exist for
  the reader only (`README.md`, `vercel.json`).
- **State.** Shipping: 36 commits from 2026-07-22 to 2026-09-29, the last being "Rebuild the homepage as
  a stepped conveyor" (#28). The repo has no `docs/`, no `CLAUDE.md` and no STATE or PROGRESS file; its
  documentation is `README.md`, `packages/roster/README.md`, long source-file header comments and commit
  bodies. There are no tests. The only workflow is `.github/workflows/cleanup-artifacts.yml`
  (housekeeping); both sites are built by Vercel at deploy time.
- **Current targets.** Web only: .com (a Vercel project with Root Directory `/`, output
  `apps/asoc-com/dist`), .dev (a second Vercel project on the same repo), the reader (a manifest with
  `display: standalone` plus Apple meta tags and no service worker: expected to be installable, not
  validated on any browser here, and online-only), the generators, and the two functions. The published stance is "Android first" (§3).
- **Stack.** JavaScript (ES modules; CommonJS in `api/`), Astro, CSS, HTML, JSON. UI: Astro 4 static
  output with vanilla DOM scripts; the reader is a framework-free ES-module SPA with a hash router and
  IndexedDB; the generators are single-file canvas-2D pages. Build: pnpm workspaces (`apps/*`,
  `packages/*`), `astro build` per app, no turbo. Frameworks: `astro ^4.16`, `@astrojs/sitemap 3.2.1`,
  `@vercel/analytics ^2.0.1` (marketing pages only), self-hosted `@fontsource/*`, `fuse.js ^7` (used by
  the homepage search, `HomeCarousel.astro:1409`), `@mozilla/readability` + `linkedom` (serverless only).
  Runtime: Node >= 20; browsers with ES modules, IndexedDB, DOMParser and canvas 2D. Native
  dependencies: none.
- **Size (measured 2026-10-06).** 140 tracked files: 92 code files (`.astro .js .mjs .css .html`) with
  25,939 lines, 24 binary assets, 0 test files. 26 of the code files (9,224 lines) are the second,
  byte-identical copy of the reader mirror and its privacy page, so about 66 files and 16,700 lines are
  distinct. Commands from the repo root: `git ls-files '*.astro' '*.js' '*.mjs' '*.css' '*.html' | xargs
  cat | wc -l`; `git ls-files | wc -l`; `diff -r nooz/read apps/asoc-com/public/nooz/read` (empty). The
  profile's earlier figure (about 17.2k lines) counted a different file set.

## 2. Portable core vs platform-bound layers

There is no native code and no platform-bound business logic here. The "core" is static web content
that already runs wherever a browser runs; a port is a packaging or availability question, not a code
question.

| Module / dir | Role | Portability | Approx LOC | Notes |
|---|---|---|---|---|
| `apps/asoc-com` | .com site: layouts, `HomeCarousel`, product pages from the roster, About/FAQ/Contact/Privacy/Tools/Fonts | web | 2,566 (src) | A site, not a port target. Hard-codes `operatingSystem: 'Android'` (`ProductLayout.astro:34`), the iOS FAQ answer "Android first" (`faq.astro:37`, `ProductLayout.astro:103`) and "Android-first apps" (`index.astro:15`). |
| `apps/asoc-com/public/tools/` | Two canvas generators: `texture-background.html` (603), `cells-logo.html` (1,228) | web | 1,831 | Client-side only; no network, no analytics by construction; desktop-style layout (340px sidebar grid); WebM export via MediaRecorder + `captureStream`. `packages/kit/src/texture/texture.js` (461) is the lifted engine. |
| `nooz/read`, `apps/asoc-com/public/nooz/read` | Nooz web reader: Stand, Paper, Loom, Sources, Clippings, Settings; IndexedDB `nooz-web` v2 (five stores); localStorage settings | web | 8,974 per copy | Downstream mirror of `mbaliga/nooz` `web/`. Identical today, and stale against the local upstream checkout (its checked-out branch, not compared with the default branch): 11 files differ and 6 entries exist only upstream (`i18n/`, `js/focus.js`, `js/i18n.js`, `js/topics-l10n.js`, `tests/`, `package-lock.json`). No root-absolute asset paths and no third-party hosts (grep); the only root-relative calls are `/api/feed` (`js/feeds.js:64`) and `/api/article` (`js/app.js:710`). |
| `nooz/privacy`, public copy | No-JS privacy policy for the web reader and the Android app | web | 250 per copy | Authored in this repo (commit `be78793`); no counterpart in upstream `web/`. States the promises any port must keep (§3). |
| `api/` | `feed.js` CORS proxy (99), `article.js` Readability extraction (191) | other (Vercel Node 20) | 290 | Must stay at the repo root (Vercel Functions root). Open-proxy surface by construction. |
| `apps/asoc-dev` | .dev site: roster records, `hyle/*` docs, rules, colophon | web | 1,875 (src) | Static. Natural home for per-platform availability records. Analytics default ON (`DevLayout.astro`). |
| `packages/kit` | Astro components, `tokens.css`, `hyle-fonts.css`, `texture.js` | web | 865 | `texture.js` is the one reusable, dependency-free engine. |
| `packages/roster` | `roster.public.json` (14 cells, four tissues) and loader | other (data) | 34 JS + 147 JSON | Single source of what exists. No per-platform fields. `$schema` points at `./roster.schema.json`, which is not in the repo. Loader uses Node import attributes (>= 20.10), build-time only. |
| `index.html`, `.github/` | Vestigial "Coming soon" page; artifact-cleanup workflow | web | n/a | Housekeeping. |

Platform-bound APIs that matter:

| API | Where | Porting impact |
|---|---|---|
| Vercel functions, same-origin `/api/*` | `api/*.js`; `js/feeds.js:64`; `js/app.js:710` | A shell that does not serve the reader from asystemofcells.com breaks both fetches. `api/feed.js` sets `Access-Control-Allow-Origin: *` (line 75) but `api/article.js` sets no CORS header, so a reader on another origin cannot call the hosted article endpoint without a change to `api/`, which §3 forbids widening. Realistic options: load the reader from the hosted origin, or a native fetch seam added upstream. |
| `@vercel/analytics/astro` | `BaseLayout.astro:29`, `DevLayout.astro:17` | Never in a packaged reader or generator build. Marketing pages are not port candidates. |
| `vercel.json` routing (`cleanUrls`, `trailingSlash: true`) | `vercel.json`, `nooz/read/vercel.json` | Any other static host must resolve directory indexes; commit `b606142` records `trailingSlash:false` breaking `/nooz/read`. |
| Cloudflare in front of Vercel | `api/article.js:17-32`, `contact.astro:13-22` | Hosted-api callers inherit the 200-with-error-body contract. Whether Cloudflare is still in place is unconfirmed (Q10). |
| IndexedDB + localStorage | `js/db.js:9-18`, `js/settings.js`, `js/onboarding.js` | Expected in every WebView (general web-platform knowledge, ASSUMPTION), but storage is per origin: a shell needs a stable origin, not `file://`. Eviction rules for home-screen web apps on iOS are unverified. No sync, by design. |
| Web Share with files; Clipboard | `js/app.js:848-862`; `js/newspaperShare.js` | A download + copy-link fallback exists. How it behaves inside webapp-container and Tauri (download handling) is unverified. |
| PWA manifest, no service worker | `nooz/read/manifest.webmanifest`; `nooz/read/index.html:9-14` | Expected to be installable via iOS Add to Home Screen, Safari Add to Dock and Chromium-family browsers (per the manifest and meta tags; not validated), and online-only. Icons are 192 and 512 only: no maskable icon, no 180px apple-touch-icon. Hardening is upstream. |
| MediaRecorder + `captureStream` (WebM/VP9) | `tools/cells-logo.html:1174-1190`; `tools/texture-background.html:556-567` | A Chromium feature; the failure alert says "Try Chrome or Edge". Behaviour in WKWebView, WebKitGTK and the Ubuntu Touch engine is unverified; PNG/SVG export is expected to work everywhere. |
| Modern CSS | reader `style.css` uses `svh` (lines 260, 354, 893), no `color-mix()`; marketing pages use `color-mix()` | An engine predating `svh` would ignore the reader's `min-height: 100svh` (general web-platform knowledge, ASSUMPTION). On Ubuntu Touch, 24.04-1.x webapps run Chromium 87 and Morph on 24.04-2.x runs Chromium 134; which engine the 24.04-2.x webapp-container uses is unverified (`Personal-Tracker/porting/platforms/ubuntu-touch.md` row 14; master §4.1). |
| Mobile-WebKit workarounds | `js/app.js:204-215`; `style.css:258` | The comments describe iPadOS toolbar-collapse behaviour. That suggests the reader has been used on iPad Safari; it is not a validation record. |

## 3. Binding rules this port must not break

1. **Analytics boundary** (`README.md` "The analytics boundary"; `BaseLayout.astro` header;
   `privacy.astro`). Pages that describe the house are counted; the reader, the generators and any
   future tool are never counted, by structure (static files under `apps/asoc-com/public/` that Astro
   never injects into). `BaseLayout` defaults `analytics` to false; `DevLayout` defaults true only
   because .dev has no usage surfaces. Any packaged or wrapped reader or generator build carries zero
   analytics, never bundles `@vercel/analytics` and gets no crash reporting.
2. **Zero telemetry in every app; cloud opt-in per use; no third-party runtime scripts, no font CDNs**
   (`privacy.astro` "The apps"; `colophon.astro`; `hyle-fonts.css`). The program lists the two websites
   as an exception to I-1 pending OQ-18 (§8, Q1).
3. **Nooz privacy promises** (`nooz/privacy/index.html`). No account, ads or analytics SDK; data stays on
   the device; the web reader's only outbound calls fetch the feeds and articles the user chose, through
   a stateless house proxy; "On Android, the app fetches feeds directly and no proxy of ours is
   involved"; crash reports stay on the device. A shell that fetches directly matches the Android
   wording; a shell that uses the hosted proxy must say so.
4. **Hyle design rules** (`packages/kit/src/styles/tokens.css`; `apps/asoc-dev/src/pages/rules.astro`).
   Colour is never the sole carrier of meaning (WCAG 1.4.1, as the files state); violet `#8e7bff`, cyan
   `#08fed5`, grey `#afafaf`; motion `cubic-bezier(.4,0,.2,1)` 300 ms; tokens are carried from Hyle, not
   invented. Binds the availability marks and icon art proposed in §6 (program directive I-3).
5. **Roster rules** (`packages/roster/README.md`; `apps/asoc-dev/src/pages/roster/[slug].astro`;
   `ProductLayout.astro`). `roster.public.json` is the single source of what exists; `verify[]` is
   internal and never rendered; Stem and Orrery are omitted on purpose; nothing is added or re-described
   without owner confirmation. Every roster change in this plan is a proposal.
6. **Mirror convention** (commit bodies `f1bcaf6`, `a844bf7`, `be78793`). `nooz/read` and
   `apps/asoc-com/public/nooz/read` stay byte-identical; the reader's source of truth is `mbaliga/nooz`
   `web/`; reader changes go upstream first and are pulled forward. The privacy page is the exception: it
   is authored here, with an identical public copy.
7. **Deployment invariants** (`README.md` "Deploying the second site"; commit `b606142`). Root `api/*.js`
   stay at the repo root, the .com project's Root Directory stays `/`, `trailingSlash` stays true, and
   .dev stays a separate Vercel project that never changes the root `vercel.json`.
8. **Fonts.** Hyle Deco is download-only under SIL OFL (`public/fonts/hyle/HyleDeco-OFL.txt`), never site
   type; `hyle-fonts.css` (absolute `/fonts/hyle` paths) is .com-only. No licence file exists in the repo
   for Hyle Grotesk, Grotesk Plus or Print, although the reader serves Hyle Grotesk
   (`nooz/read/fonts/`).
9. **Open-proxy posture** (`api/feed.js` and `api/article.js` headers; `colophon.astro` "Not here on
   purpose"). The functions are an SSRF surface by construction; the loopback, private and link-local
   blocklist stays; they are not documented as a public API. No port may advertise or widen them.
10. **Copy rules** (commit `01ab098`; `contact.astro`). No em dashes in rendered copy; `nooz@asystemofcells.com`
    stays visible in raw HTML. Applies to every site string proposed in §6.
11. **Licensing is unstated.** No root `LICENSE`; the upstream Nooz repo carries `LICENSE.RESERVED`. No
    store package (OpenStore, App Store, MSIX, Flathub) until the owner states terms (master OQ-12).
12. **Public platform stance** is "Android first", JSON-LD `operatingSystem: 'Android'`. Per-platform
    claims on the site change only when a port actually ships (environment honesty, I-4).
13. **Program rules that bind here:** R1 to R6, R11 and R12 of the master plan, restated where they
    place files in §6. This repo is public, so nothing in this file may carry pricing, licensing
    mechanics or competitive positioning (decision recorded in `Personal-Tracker/DECISIONS.md`, D-T).
    Hardware and account facts are referenced by master OQ id only, as this plan's own choice.

## 4. Target matrix (owner's order)

Two kinds of surface are in play. The **sites** (.com, .dev) and the **two functions** are
`NOT-APPLICABLE` as ports on every target: they run in any browser and gain nothing from a wrapper. The
rows below are about the **reader** and the **generators**, the only app-like surfaces here, plus the
roster and brand work (F12) that gives every other ported app in the constellation a public landing.

| Target | Feasibility | Approach | Blockers | Effort (eng-weeks, estimate) | Evidence today |
|---|---|---|---|---|---|
| Ubuntu Touch | reframe. Nearest shape: a launcher entry for the web reader, labelled "web reader in a window", not a port of the Nooz app | A webapp-container click instantiated from F7's webapp template, navigation limited to asystemofcells.com, start URL `https://asystemofcells.com/nooz/read/`; optionally a second entry for the generators. It still calls the hosted `api/`. | Which engine the 24.04-2.x webapp-container uses (Chromium 87 or 134), and `svh`, IndexedDB persistence and download fallback inside it: all unverified. No UT device on record (OQ-1). Licence unstated (OQ-12). | 1 | PLAN |
| Linux desktop | straight | Zero-work path: install the reader as a PWA from a Chromium-family browser. Optional: a Tauri 2 shell (`packaging/desktop-tauri/`) bundling the static reader and tools, native feed fetch through a bridge, Flatpak as primary channel. | PWA is online-only until upstream adds a service worker. Shell is blocked on the upstream fetch seam and on Q3. WebKitGTK WebM export unknown. Licence unstated. | 2 (about 0.5 PWA path, about 1.5 shell) | PLAN |
| iOS / iPadOS | straight | PWA only (Add to Home Screen). This repo adds no store wrapper. Hardening (service worker, 180px and maskable icons, splash) is requested upstream in `mbaliga/nooz`. | Storage eviction for home-screen web apps unverified. WebM export not expected in WebKit. No Apple device confirmed (OQ-2). | 0.5 | PLAN |
| macOS | straight | Safari Add to Dock or Chromium install; optional DMG from the Linux Tauri shell (WKWebView). | Developer ID and notarisation (OQ-3). No Mac on record, so device gates stay NOV (OQ-5). WKWebView WebM export unverified. | 0.5 | PLAN |
| Windows | straight | Edge or Chrome PWA install (Chromium, so WebM export is expected to work); optional installer from the Linux shell on WebView2. | Signing route (OQ-3): unsigned until ruled, SmartScreen warnings expected. Windows device availability (OQ-5). | 0.5 | PLAN |

Total 4.5 engineer-weeks (estimates). Not in these rows: this repo's share of F12, about 1 engineer-week
(this plan's estimate; the master counts F7 to F12 outside its §5 cells), and the upstream work in `mbaliga/nooz`,
which belongs to the nooz plan. "Straight" means no unknown stands between this plan and a build.
It does not mean anything runs, and no row claims a result.

## 5. Tier and sequencing

**Tier C (thin-or-reframe)**, as in the master's §5 row. The sites already run wherever a browser runs.
The app-like surfaces are a downstream mirror (porting decisions belong upstream in `mbaliga/nooz`) and two
single-file generators. The contribution this repo can make is thin and concrete: (1) a roster extension
and brand kit so every ported app has a public landing, (2) a scripted mirror sync with a CI identity
check, (3) installs of the reader and generators as a PWA, a webapp click and an optional shared shell.
That does not justify tier A or B, and skipping entirely would leave the constellation without a downloads
surface.

**Gate before any wave** (master row): reader changes upstream-first in nooz; analytics (OQ-18); roster
changes need owner confirmation (F12). Repo-local expansions of that gate:

- **G1 (proposed new gate).** `site-build.yml` (§6, S0.1) green on `main`. No CI build exists today.
- **G2.** Upstream-first: a reader-side prerequisite (UP-n, §6) is merged in `mbaliga/nooz` `web/` and
  mirrored here before any wave consumes it.
- **G3.** Roster entries land only as owner-reviewed PRs.
- **G4.** Until OQ-18 is ruled, the sites' analytics stay exactly as they are; nothing here touches them.

| Wave (master §7) | This repo joins as | Build-entry (repo-local) | Device-entry |
|---|---|---|---|
| P-0 Foundation | Provider of F12 (with portfolio); consumer of F11 templates | G1; owner confirms PROP-1 and PROP-2 | none |
| P-UT a | Studio reader and tools webapp click | G1; F7 webapp template; spike S-UT-W | A UT device (OQ-1) or an explicit CI-only waiver |
| P-LX | PWA path; the optional Tauri shell comes last in the Tauri lane | G1. Shell only: Q3 answered yes, F10's Tauri lane piloted in Animalcules, upstream seam UP-3 merged | `DEVICE_CHECKLIST_LINUX.md` rows, owner-run |
| P-iOS | PWA verification only | UP-1 and UP-2 mirrored, otherwise verify today's reader as it is | An Apple device (OQ-2). Add to Home Screen needs no Developer Program (general platform knowledge, ASSUMPTION) |
| P-mac | PWA verification; DMG only if the Linux shell exists | Linux shell built; OQ-3 for signing | NOV until a Mac exists (OQ-5) |
| P-win | PWA verification; installer only if the shell exists | S0.2 path lint (clean today); signing route (OQ-3) or unsigned | NOV; `CI (hosted VM) evidence` only if no Windows machine remains (OQ-5) |

The repo is public (master §5), so hosted matrices cost no minutes. If that changes, OQ-20 applies and
the macOS and Windows lanes become manual dispatch.

## 6. Work breakdown

**Conventions.** The repo has no decision log, so proposals are recorded in this file only. None is ruled:

| Id | Proposal | Needs |
|---|---|---|
| PROP-1 | Additive `platforms`/`downloads` fields in the roster schema (F12) | Owner confirmation (Q6) |
| PROP-2 | Brand and PWA kit under `packages/kit/src/brand/` (F12) | Owner confirmation (Q6) |
| PROP-3 | `site-build.yml` with a mirror-sync script, identity check and boundary lint | Owner review |
| PROP-4 | Platform copy changes (FAQ answer, meta description, JSON-LD) once the first non-Android entry ships | Owner copy approval (Q13) |
| PROP-5 | A top-level `packaging/` tree for the click and the optional Tauri shell | Owner review |

Placement follows R1 to R4. New top-level directories are `docs/`, `packaging/<os>/` and `scripts/`; none
matches `apps/*` or `packages/*`, so `pnpm-workspace.yaml`, the root `package.json` and `vercel.json` stay
untouched and the existing builds are unaffected (R2). The brand kit adds one subdirectory to the existing
`@asoc/kit` package and generated files under `apps/*/public/`, additively and only after owner approval. Every workflow is a new file, SHA-pinned, with no
Actions artifact upload (R3, R6; `cleanup-artifacts.yml` exists because artifact storage is exhausted).
Release binaries go to draft GitHub Releases on tags only. Templates reach this repo by a generator
script that emits into `packaging/`, never by copy-vendoring (I-6; OQ-24 rules the mechanism). No
listener, background service, model download or key material exists in any lane (R5). Pure-core-first
(R4) here means the web content builds, validates and mirrors cleanly in CI before any wrapper consumes it.

### 6.0 Shared steps (all targets)

| Step | What | Placement | Done when |
|---|---|---|---|
| S0.1 | Build gate (PROP-3): `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm build:dev` on `ubuntu-latest` | new `.github/workflows/site-build.yml` | Green on a PR; `CI (hosted VM) evidence`. `vercel.json` and root `package.json` unchanged. |
| S0.2 | Hygiene checks in the same workflow: (a) path lint for `:<>\|?*"` and reserved names (measured clean today; `[slug].astro` is allowed); (b) mirror identity, `diff -r` of both reader copies and both privacy copies; (c) boundary lint that fails if `@vercel/analytics` or `_vercel/insights` appears under `apps/asoc-com/public/` or `packaging/` | same file | Green. Turns the printed analytics promise into a CI fact. The identity check runs on Linux only: the repo has no `.gitattributes`, so a Windows checkout may rewrite line endings. |
| S0.3 | Mirror-sync procedure: a script copies upstream `web/` into `nooz/read` and `apps/asoc-com/public/nooz/read` only (never root `api/`, never the privacy page), prints a diff stat, and runs S0.2(b). Commit subject keeps the history's "Mirror Nooz web reader: ..." form. | new `scripts/sync-nooz-mirror.sh`, with a short `docs/NOOZ_MIRROR.md` | A dry run on today's state lists the 11 differing files and 6 upstream-only entries. The real sync changes the live reader (upstream added `i18n/`), so the owner runs and reviews it (Q2). |

### 6.F12 Roster extension and brand kit (cross-cutting; this repo is the home)

- **F12.1** Recover or write `packages/roster/roster.schema.json` (referenced by `$schema`, absent from the
  repo), covering exactly today's fields (`slug tissue type status accent oneLiner isHub verify hubUrl
  readerUrl parent`). Validate it in S0.1 with a small dependency-free script so the lockfile does not
  change. No behaviour change. Ask first whether the file exists elsewhere (Q6).
- **F12.2 PROP-1, schema only, no data.** Optional, additive per-cell `platforms`, keyed by a closed set
  of OS ids (`android`, `ubuntu-touch`, `linux`, `ios`, `ipados`, `macos`, `windows`, `web`):

  ```json
  "platforms": {
    "android":      { "status": "live", "downloads": [ { "channel": "play", "url": "https://..." } ] },
    "web":          { "status": "live", "downloads": [ { "channel": "pwa", "url": "/nooz/read" } ] },
    "ubuntu-touch": { "status": "soon", "reframe": "web reader in a window", "verify": ["device gate open"] }
  }
  ```

  Rules proposed: `status` reuses the existing `live | beta | soon` vocabulary and the existing
  status-pill and `ctaLabel()`, so every availability state is a word plus the pill's shape, never colour
  alone (§3 rule 4). `downloads[].channel` comes from a closed set (`play`, `fdroid`, `openstore`,
  `flathub`, `tarball`, `dmg`, `msix`, `winget`, `app-store`, `testflight`, `pwa`, `web`,
  `github-release`); `url` is required for `live` and `beta`, forbidden for `soon`, https or site-relative
  only. `reframe` is an optional short label shown beside the status (R12). `platforms[].verify[]` is
  internal and never rendered, like the cell-level `verify[]`. A cell with no `platforms` renders exactly
  as today; `hubUrl` and `readerUrl` stay valid and are not migrated.
- **F12.3** Loader helper `platformsFor(cell)` in `packages/roster/index.js` (returns `[]` when absent) with
  a `node:test` file beside it, using the Node built-in runner and no new dependency.
- **F12.4** Render, after owner approval: the CTA row in `ProductLayout.astro`, and a row in the .dev record
  (`apps/asoc-dev/src/pages/roster/[slug].astro`). `HomeCarousel.astro` stays unchanged unless the owner
  makes a design call. Whether .com or .dev grows a constellation Downloads page is Q6. Such a page would
  count as a page that describes the house under the analytics boundary; its links leave the site.
- **F12.5 PROP-4** Site copy. The FAQ answer, the meta description and JSON-LD `operatingSystem` change
  only in the PR that adds the first `live` or `beta` non-Android entry, with owner-approved text and no
  em dashes. JSON-LD stays `Android` until then, and how a web-only or PWA entry is typed is decided at
  that PR.
- **F12.6 PROP-2** Brand and PWA kit in `packages/kit/src/brand/`: SVG master art derived from the existing
  `favicon.svg` and the Hyle tokens; a generator script that emits `apple-touch-icon` (180px), 192 and 512
  icons, a maskable 512 and an optional Windows tile into `apps/*/public/` (checked in, additive); and a
  manifest template. Sibling web repos (portfolio, mdhv.xyz) consume it by generator output, not
  copy-vendoring. The Windows tile is legacy and low value on current Windows (ASSUMPTION); include it
  only if the owner wants it. Head tags in `BaseLayout.astro` are a separate owner-approved change. **No
  manifest and no service worker go on the Astro marketing pages: sites stay sites, and a root-scoped
  service worker would capture `/tools` and the marketing pages.** Reader icon art is handed upstream as
  files (UP-2); it reaches this repo only through the mirror.

### 6.UP Handoff to `mbaliga/nooz` `web/` (requests for the nooz plan, not commitments)

| Id | Request | Why |
|---|---|---|
| UP-1 | Service worker and an offline strategy, scoped to `/nooz/read/` only | Every PWA and shell path is online-only without it |
| UP-2 | Maskable 512 icon, 180px apple-touch-icon, splash art (this repo's kit supplies source art) | Today's icons are 192 and 512 only |
| UP-3 | An optional host bridge for feed fetch, article fetch and file save, feature-detected, with `@mozilla/readability` run in the webview on a `DOMParser` document; the current relative `/api/*` path stays the fallback. Readability is a third-party dependency and needs a notice. | Lets a shell fetch directly (privacy page's Android wording) |
| UP-4 | Do not add an absolute API base setting | `api/article.js` has no CORS header; adding one widens the open-proxy surface (§3 rule 9) |
| UP-5 | Engine audit of `svh` use (`style.css:260,354,893`) for older Chromium | Ubuntu Touch engine question |
| UP-6 | Verify the share and download fallback inside webapp-container and Tauri | Unverified in both |
| UP-7 | Privacy wording if shells ship: this repo owns the page; nooz confirms the Android statements | Page is authored here (§3 rule 6) |

### 6.UT Ubuntu Touch (wave P-UT a)

| Step | What | Placement and CI | Done when |
|---|---|---|---|
| UT.1 | Spike S-UT-W, one session on a 24.04-2.x device: which engine the webapp-container uses; the reader's `svh` layout; IndexedDB persistence after the app is killed; share and download fallback; navigation limited to the site. | No code. Results appended to the progress log and `DEVICE_CHECKLIST_UT.md` (F11). | Owner fills the rows. `NEEDS-DEVICE-VALIDATION`. Not verifiable in this container. |
| UT.2 | Reader click: manifest, apparmor (common groups only, `networking`; exact set confirmed by F7's policy checker), desktop entry running `webapp-container` with URL patterns limited to the site, icon from the kit. Package name `TBD`, not written until it has a NAMES.md row (R11, Q12). | `packaging/ubuntu-touch/reader/` (PROP-5), emitted by F7's generator. Workflow `.github/workflows/ut-click.yml`: Clickable in the digest-pinned `clickable/ci-ut24.04-1.x-arm64` image on `ubuntu-latest`, click-review, no artifact upload. | Click builds and click-review is clean in hosted CI: `CI-APPROX — NOT DEVICE EVIDENCE`. Install and run: owner only, NDV. |
| UT.3 | Generators click, only if Q7 says yes. Caveat: the generators use a 340px sidebar grid with `overflow: hidden`, a poor fit for a phone screen. | `packaging/ubuntu-touch/tools/` from the same template | Same as UT.2 |
| UT.4 | OpenStore listing text: "web reader in a window" (R12); says feeds go through the house proxy (copy from `nooz/privacy`). Uses F7's single OpenStore account and policy. | Owner action | Blocked on Q5 and Q8. NOV. |

Non-goals here: a bundled 127.0.0.1 static server (no SharedArrayBuffer need, and R5), an offline click
with a QML replacement for the proxy (nooz repo; the master's P-UT b covers the native Nooz click), any
keystore (the reader holds no keys: grep of `nooz/read` found none).

### 6.LX Linux desktop (wave P-LX)

| Step | What | Placement and CI | Done when |
|---|---|---|---|
| LX.1 | Zero-work path: check PWA install from the live URL in Chromium-family browsers; record the "online-only" limit. | Checklist rows only | Owner-run, NOV |
| LX.2 | Decision point: Q3. If no, stop at LX.1 and Linux costs about 0.5 week. | none | Owner answers |
| LX.3 | Tauri 2 shell. Its input is a staging directory assembled by script from `apps/asoc-com/public/nooz/read` and `public/tools` only, never `apps/asoc-com/dist` (which holds Astro pages that carry analytics). The script fails if any staged file contains `_vercel/insights`. No capability for remote origins. The reader fetches arbitrary user-chosen URLs, so the HTTP scope cannot be an allowlist; whether the proxy's private-address refusal carries over is decided at the UP-3 design (default: yes). | `packaging/desktop-tauri/` from F10's Tauri lane template, own Cargo workspace outside `apps/*` and `packages/*` | `cargo check` and bundle dry run green in hosted CI. Launch is NDV. |
| LX.4 | Shell side of the host bridge: `fetch_feed`, `fetch_article` (raw HTML only), `save_file`, documented in the shell README and named per F10's `window.<app>Host` contract. Starts only after UP-3 lands upstream and is mirrored (G2). | `packaging/desktop-tauri/src-tauri/` | Reader uses the bridge when present; hosted `/api/*` path unchanged otherwise. NDV. |
| LX.5 | Packaging: Flatpak from F10's Tauri template as the primary channel, plus a tarball with `install.sh`; `.deb` as a convenience; AppImage only if OQ-4 keeps it. App id `TBD` (R11, OQ-4, Q12). Built on `ubuntu-22.04` for the glibc baseline (master §4.2). | Workflow `.github/workflows/desktop-linux.yml`: compile-only on PRs; package on `main` and tags; draft Release; no artifacts | Bundle builds in hosted CI. Install and launch on a desktop and on SteamOS (per `DEVICE_CHECKLIST_LINUX.md`): NDV. |
| LX.6 | Generators in the shell: PNG and SVG save through the dialog plugin. The failure alert "Try Chrome or Edge" would mislead inside a shell, so the message becomes environment-aware (an edit to this repo's `tools/*.html`, owner-approved copy, no em dashes). | `apps/asoc-com/public/tools/` | WebM on WebKitGTK is unknown and the UI must say so. NDV. |

### 6.IO iOS / iPadOS (wave P-iOS)

| Step | What | Placement and CI | Done when |
|---|---|---|---|
| IO.1 | Hand UP-1, UP-2 upstream; nothing is built here. | none | Mirrored here via S0.3 |
| IO.2 | `apple-touch-icon` for the sites from the kit (sites only; PROP-2). | `apps/*/public/`, plus owner-approved head tag | Present in the built output (S0.1) |
| IO.3 | Owner verification pass on an iPad (and an iPhone only if one exists): install, standalone launch, safe areas (`viewport-fit=cover` is set), rotation, share-with-image, IndexedDB survival after force-quit and after idle days, the generators' PNG/SVG save in standalone mode. | Checklist rows (F11) | Owner-run, `NEEDS-OWNER-VALIDATION` |
| IO.4 | No Capacitor store wrapper (as the master row says). App Review 4.2 minimum-functionality risk for a wrapped website is general knowledge (master §4.3); the web reader also lacks the Android app's on-device features, so a listing would ship a lesser Nooz. A store presence would be a new proposal run in the nooz repo. | none | n/a |

No workflow is added for iOS: nothing is built.

### 6.MC macOS (wave P-mac)

| Step | What | Placement and CI | Done when |
|---|---|---|---|
| MC.1 | PWA install check: Safari Add to Dock (Safari 17+, general platform knowledge, ASSUMPTION) and Chromium install. | Checklist rows | NOV until a Mac exists (OQ-5) |
| MC.2 | Optional DMG from the Linux shell (WKWebView), only if LX.3 exists. Signing, notarisation and entitlements stay disabled templates until OQ-3 (R6). Unsigned artefacts are labelled `UNSIGNED, not for release`. | Workflow `.github/workflows/desktop-macos.yml` on `macos-latest`; compile-only on PRs, package on `main` and tags | Bundle builds in hosted CI; run is NOV |
| MC.3 | WKWebView WebM export unverified; the LX.6 message covers it. | none | NOV |

### 6.WN Windows (wave P-win)

| Step | What | Placement and CI | Done when |
|---|---|---|---|
| WN.1 | PWA install check in Edge and Chrome; WebM export expected to work (Chromium). | Checklist rows | NOV |
| WN.2 | Confirm the S0.2 path lint is green before any `windows-*` lane exists (R3). Run no identity check on Windows. | S0.2 | Lint green |
| WN.3 | Optional installer from the Linux shell on WebView2, only if LX.3 exists. Unsigned until OQ-3; SmartScreen warnings are expected. | Workflow `.github/workflows/desktop-windows.yml`; compile-only on PRs, package on `main` and tags | Bundle builds in hosted CI; run is NOV |

## 7. Shared foundation this repo consumes or provides

**Provides:** **F12** (web and brand kit: roster schema extension and the brand and PWA kit), shared with
portfolio. Landing pages for every ported app in the constellation depend on it (F12.2 to F12.5). The
Nooz Android app's privacy promises are stated on a page hosted here (`nooz/privacy`), and the mirror
identity check keeps the two reader copies honest.

**Consumes:**

- **F7**: only the webapp-container template, the OpenStore account and policy, and
  `DEVICE_CHECKLIST_UT.md`. Not the JVM core, jlink recipe or QML shell.
- **F10**: the Tauri lane (piloted in Animalcules), its Flatpak flavour, the macOS entitlements and
  notarise templates and the Windows packaging, for the optional shell only.
- **F11**: the evidence record and the five `DEVICE_CHECKLIST_*.md` templates.
- **F9**: conventions only (SHA-pinned actions, path lint, no artifact upload, package lanes on `main` and
  tags). The KMP matrix is not used; this repo has no Kotlin.
- **OQ-24's mechanism** for non-Gradle artefacts (I-6): generator script emitting into `packaging/`, and
  SHA-pinned `uses:` for workflows.

**Does not consume:** F1 (the kit's tokens are CSS; replacing the hand-carried `tokens.css` with Hyle's
web output is optional and not planned), F2 to F6 and F8 (no Kotlin, no native engines). OQ-22 does not
bind here: the reader holds no keys.

## 8. Open questions for the owner

| # | Question | Blocks | Master OQ |
|---|---|---|---|
| Q1 | Does I-1 (no analytics) apply to the websites? `@vercel/analytics` runs on the counted pages of .com (`BaseLayout.astro`, opt-in per page) and on all of .dev (`DevLayout.astro`, default on); `privacy.astro` discloses it as cookieless page counts and says nothing is counted in the reader or tools. Keep, keep and re-disclose, or remove? | The program's reading of I-1 for the web rows; README wording for packaged builds. No step here touches the sites meanwhile (G4). | OQ-18 |
| Q2 | Is the reader copy here a strict mirror of `mbaliga/nooz` `web/` (stale today), with all reader porting upstream and this repo limited to mirroring and packaging? Who runs the real sync, given it changes the live reader? | S0.3; every UP-n; any packaged reader | none (nooz plan) |
| Q3 | Package the reader at all (Tauri, click), or is the desktop and iOS story PWA install from `asystemofcells.com/nooz/read`, given the native Nooz Android app and the "Android first" stance? | LX.3 to LX.5, MC.2, WN.3 (about 1.5 of Linux's 2 weeks) | none; touches OQ-4 |
| Q4 | If packaged: may a shell fetch feeds directly and run Readability in the webview (no house proxy, matching the privacy page's Android wording), with per-platform privacy wording? Or does the shell load the hosted origin and say so? | LX.3, LX.4, UP-3, UP-7 | none |
| Q5 | Licence for this repo (no root `LICENSE`) and for the web reader (upstream `LICENSE.RESERVED`); may packaged builds redistribute the Hyle Grotesk, Grotesk Plus and Print TTFs? | Any store listing; any bundled shell; UT.4 | OQ-12 |
| Q6 | Approve PROP-1 and PROP-2? Should .com or .dev grow a constellation Downloads page? Does `roster.schema.json` exist somewhere? | F12.1 to F12.6; every ported app's landing | F12 (owner confirms roster changes) |
| Q7 | Package the two generators, or keep them browser-only on `/tools` (desktop-style layout; WebM is Chromium-only)? | UT.3; generators in the shell; LX.6 | none |
| Q8 | Accounts and channels: OpenStore account and policy, Apple Developer Program, Windows signing route, and the channel set. | UT.4, MC.2, WN.3 and every store or signing lane (templates stay disabled) | OQ-2, OQ-3, OQ-4 |
| Q9 | Confirm the analytics boundary applies verbatim to every packaged build: zero analytics, no `@vercel/analytics` bundled, no crash reporting added. | The S0.2 boundary lint; README wording | restates I-1 (OQ-18 for the sites) |
| Q10 | Is Cloudflare still in front of Vercel? | Wording of any hosted-proxy caveat; error semantics for hosted-api callers | none |
| Q11 | A UT device or an explicit CI-only waiver; hardware for macOS and Windows device gates. | UT.1 and every device gate | OQ-1, OQ-5 |
| Q12 | Identifiers (click package name, Flatpak id, bundle and installer ids) need NAMES.md rows before any manifest is written. | UT.2, LX.5, MC.2, WN.3 | OQ-25 |
| Q13 | Approve PROP-4 (when the FAQ, meta description and JSON-LD change) and the labels "web reader in a window", "launcher for the web reader". | Public site copy | OQ-6 (blocks every C-tier row) |

Dropped from the profile's list: whether `fuse.js` is unused. It is imported at `HomeCarousel.astro:1409`.

## 9. Sources read

Paths are relative to the repo root unless noted.

- Repo docs and config: `README.md`, `package.json`, `pnpm-workspace.yaml`, `vercel.json`, `index.html`,
  `.github/workflows/cleanup-artifacts.yml`, `packages/roster/README.md`.
- Functions: `api/feed.js`, `api/article.js`, `nooz/read/api/feed.js`.
- .com: `apps/asoc-com/package.json`, `astro.config.mjs`, `src/layouts/{BaseLayout,ProductLayout}.astro`,
  `src/components/HomeCarousel.astro`, `src/pages/{index,[slug],tools,privacy,about,contact,faq,hyle-fonts}.astro`,
  `public/tools/{cells-logo,texture-background}.html`, `public/favicon.svg`, `public/fonts/hyle/`.
- .dev: `apps/asoc-dev/package.json`, `astro.config.mjs`, `src/layouts/DevLayout.astro`,
  `src/pages/{index,rules,colophon}.astro`, `src/pages/roster/{index,[slug]}.astro`, `src/pages/hyle/index.astro`.
- Packages: `packages/kit/{package.json,src/styles/tokens.css,src/styles/hyle-fonts.css,src/texture/texture.js,src/components/Seo.astro}`,
  `packages/roster/{package.json,index.js,roster.public.json}`.
- Reader and privacy: `nooz/read/{index.html,manifest.webmanifest,package.json,vercel.json,style.css}`,
  `nooz/read/js/{app,db,feeds,starters,router,settings,onboarding}.js`, `nooz/privacy/index.html`.
- Outside this repo (read-only): `/home/user/nooz/web` (directory listing and `diff -rq` against the
  mirror), `/home/user/nooz/STATE.md` (head). Program: `Personal-Tracker/PORTING_PROGRAM.md` §0 to §3, §4
  (each platform), §5 row, §6, §7, §8; `Personal-Tracker/porting/platforms/ubuntu-touch.md`.
- Profile (input): the repo profile from the earlier inspection pass, 2026-10-06. Where this plan differs
  from it (file counts, `fuse.js`, the Nooz reader's lack of `color-mix()`, the privacy page's origin,
  `api/article.js` lacking CORS), the checkout was re-read and the checkout wins.

## Progress log

(none yet; platform tracks append dated entries here with real command output, `BLOCKED(<reason>)` where
stopped, and never a "works on device" claim)
