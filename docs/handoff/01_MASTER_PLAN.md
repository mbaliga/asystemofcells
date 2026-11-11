# asystemofcells.com — Master plan for the four-wing house

Status: handoff for Claude Code. Written 2026-11-04 against the live repo `mbaliga/asystemofcells` at `5c89cb2` (28 branches; main = "Rebuild the homepage as a stepped conveyor…").

## 0. What this bundle is

The site today is one wing (the app roster) with a conveyor home, an Apple-style product template that still shows placeholder "screen crops", a Nooz web reader, two generators, and a `.dev` surface. This bundle turns it into a four-wing house and adds the first (and only) backend the house has ever needed — a shop counter — plus the owner-side app that reads it.

The four wings, with the slugs and working names this plan uses throughout (names are the owner's call; slugs are stable):

| # | Wing (owner's words) | Working name | Slug | What it sells / does |
|---|---|---|---|---|
| 1 | Sovereignty apps | **Cells** | `/apps` (+ `/{slug}` product pages, unchanged) | Marketing pages for every app in the constellation, built from real screenshots where they exist and from feature inventories where they don't |
| 2 | Collectibles & Curiosities store | **The Cabinet** | `/cabinet` | A small shop: things the owner has made (editions) and things bought over time and now sold (one-offs). Cart → order → accept → pay → ship |
| 3 | Architecture services | **Practice** | `/architecture` | Previous work as explorables (owner supplies images later), free tools for architects (Hyle Deco, sun, wind, vaastu), and an inquiry path to commission the owner |
| 4 | 3D prints | **Alloy prints** | `/prints` | A free in-browser slicer/preview that outputs a Bambu-ready `.gcode.3mf`, and a print-on-demand order flow with three finish tiers, priced by material + time + finish |

Everything that touches money or a customer goes through one backend, **Counter** (`08_COUNTER_BACKEND.md`), and one owner app, **Counter for Android** (`09_COUNTER_APP.md`). The Cabinet, Practice inquiries and Alloy prints are three *order kinds* on the same ledger, not three backends.

## 1. House rules this plan is corrected against (do not re-litigate in the build)

These come from the repo and the owner's standing decisions. The Claude Code session must treat them as fixed.

1. **The analytics boundary is structural.** Pages that *describe* the house may opt into cookieless Vercel analytics (`analytics` prop on `BaseLayout`). Pages where a visitor *makes, reads, runs, slices, shops or submits* never do, and the way that is guaranteed is by structure: tools live as static files under `apps/asoc-com/public/` or as Astro pages that simply do not pass `analytics`. Every new tool, the slicer, the cart, checkout, the inquiry form: **no analytics**. The marketing pages of each wing (`/cabinet`, `/architecture`, `/prints` landing pages, product pages): analytics opt-in is fine. The privacy page must be extended to describe Counter (section 8).
2. **No telemetry in apps, ever.** The site never claims an app phones home. The Counter app is an owner tool and may call the owner's own endpoint; that is not telemetry.
3. **Install is a multi-store chooser** (Google Play · F-Droid/IzzyOnDroid · GitHub APK), never a self-hosted download. Status CTAs come from `@asoc/roster` (`live → Get it`, `beta → Join the beta`, `soon → Notify me`).
4. **Provenance is a glyph + label, never colour alone** (WCAG 1.4.1 house rule). This now also applies to screenshots: every image on a product page carries its capture lane (`device` / `preview` / `web` / `render` / `art`) as a small glyph+label. The container has no phone; device captures are owner-verified only. Nothing is "faked, only stubbed".
5. **Roster JSON is the single source of truth** for products (`packages/roster/roster.public.json`). The `verify[]` array is internal and never rendered. New products are *added* to it with honest status; nothing is guessed. `Stem` stays omitted.
6. **The product page system is the white, Apple-style `ProductLayout`**; the home is the conveyor/reel. Do not bring back the rejected dark-violet `SiteHeader/SiteFooter/CellCard` kit on `.com`. Each wing gets its own *section* layout that borrows `ProductLayout`'s rhythm (hero → alternating feature rows → FAQ → fixed simple footer) with the wing's own palette (section 2 of `02_SITE_ARCHITECTURE.md`).
7. **Owner's taste** (applies to all new UI): whitespace over boxes; form conveys function; marks are pieces of an organic cell, not filled circles; explanatory copy behind an info affordance, not on the surface; no "reads as AI" copy; no decorative lines across visualizations; charts may use well-known brand colours for well-known things. Sound on interactions is a *later* nicety, never required.
8. **Payment rails:** Lemon Squeezy does not work for the owner in India. Counter uses **Razorpay Payment Links** (UPI, cards, net-banking, international cards once enabled) as the primary rail, **PayPal.me** as the manual international fallback, **Ko-fi** stays for patronage only. No payment form is ever built into the site; the site links out to a provider-hosted page.
9. **Open-core discipline:** the site repo stays public. Secrets live in Vercel env. Customer data lives in a *private* ledger repo (section 8), disclosed on the privacy page.

## 2. Scope by phase (what "one shot" actually means)

One Claude Code session can run this end-to-end, but it must be driven as **phases with gates**, each phase landing as its own PR so main stays deployable. The driver prompt in `10_CLAUDE_CODE_PROMPT.md` encodes this. Owner preference honoured: Sonnet workers for repo work, escalate to Opus only for the two architecture-grade pieces (slicer kernel boundary, Counter ledger consistency).

### Phase A — Go live (the "soon" part). Target: all PRs mergeable in one session.

| PR | Lands | Gate |
|---|---|---|
| A1 | Roster v2 (new cells, `wing` field, imagery manifest hook), screenshot manifest loader, provenance glyph component | `pnpm build` green; roster README updated; no `verify` rendered |
| A2 | Product pages v2 for every cell: real imagery where the manifest has it, feature-first layout where it doesn't; per-product content files | Every `/{slug}` renders with ≥1 image or a feature triptych; Lighthouse ≥ 95 perf/a11y on 3 sampled pages |
| A3 | Home: four-wing entry — conveyor keeps the app cells, gains three wing tiles (Cabinet, Architecture, Alloy prints) and the corner nav lists the wings | Reduced-motion fallback lists all four wings; mobile reel shows wing tiles |
| A4 | The Cabinet: catalogue content collection, listing + item pages, cart (localStorage), checkout → Counter | Place a test order end-to-end against the Counter dev ledger |
| A5 | Alloy prints, Stage 0: Three.js plate preview (STL/3MF/OBJ), analytic estimator (mass, time, overhang/support ratio), finish tiers, live quote, order → Counter, download of the untouched model + a `print-brief.json` | Estimator unit tests pass on the three Alloy parity fixtures (cube, overhang, thin-wall); quote within configured bounds |
| A6 | Practice: landing, explorables scaffold (content collection + three layouts), tools hub, **Sun** tool, **Vaastu** tool, **Wind rose** tool (v1 climate-normals), Hyle Deco cross-link, inquiry → Counter | Sun tool matches NOAA reference to <0.5° on 6 test vectors; vaastu grid passes orientation tests; inquiry lands in ledger |
| A7 | Counter backend: ledger repo + Vercel functions (`/api/counter/*`), Razorpay links + webhook, ntfy notify, status lookup, privacy page update | Full state machine exercised by an integration test against a throwaway ledger repo |
| A8 | Counter app v1 (Android, Compose, Hyle): inbox, order detail, accept/reject, mark paid/printed/dispatched, tracking | JVM-tested core; APK builds; device behaviour owner-verified |

### Phase B — Real slicing in the browser (after live).
Kiri:Moto engine (MIT, pure JS, runs in a Worker) wrapped in the Alloy UI; A1 mini printer/process/filament profiles derived from Alloy's resolved Orca profiles; output `.gcode.3mf` with Bambu plate metadata; estimator replaced by real slice stats. See `07_WING_PRINTS.md` §4.

### Phase C — Alloy kernel parity (research track, not a launch blocker).
Headless `libslic3r` compiled with Emscripten (proven feasible by `boolean3d/slicers.wasm`, which runs the entire OrcaSlicer desktop app in a tab at 16–28 MB) behind the *same typed API* Alloy exposes over JNI — "one Alloy kernel, two shells". Gated exactly like Alloy's own G1–G4. See `07_WING_PRINTS.md` §5.

## 3. Decisions the owner must make (defaults chosen so the build never blocks)

| Decision | Default used in this plan | Why |
|---|---|---|
| New domain for wings 2–4? | **No, not now.** All four wings live under `asystemofcells.com/<wing>`; each wing is a self-contained route group + content collection so it can be lifted into `apps/<wing>` and its own Vercel project later with 301s | Speed to live; one sitemap; the monorepo already supports a second site (`.dev`) so a third is a config change, not a rewrite |
| Wing display names | Cells / The Cabinet / Practice / Alloy prints | Slugs are the stable thing; rename freely in `data/wings.json` |
| Ledger location | Private GitHub repo `mbaliga/asoc-counter` (files, one per order), swappable for Gitea on the homelab | Consistent with the owner's Orrery ruling (git repo as truth, tasks as files); zero DB to operate; the owner app syncs by `git pull` |
| Payment rail | Razorpay Payment Links; PayPal.me fallback | India-based seller; UPI; provider-hosted page, nothing in-site |
| Notifications to owner | ntfy (self-hosted on the homelab, `ntfy.sh` topic as fallback) + email via Resend | No Google push dependency for an owner tool |
| Print finish prices | See `data/pricing.prints.json` — **placeholders** | Owner calibrates from real A1 mini runs |
| Shipping | India Post / Delhivery manual, flat table in `data/shipping.json` | Manual dispatch v1 |
| Vaastu tables | `data/vaastu.zones.json`, traditional 8-direction + 16-zone + 32-pada entrance table | Owner is a licensed architect; the tables are his to correct |

## 4. Timeline (owner said "soon")

- Day 0: run the driver prompt. Phase A PRs A1–A3 are mechanical; A4–A7 are the real work; A8 is a separate repo.
- Day 1–2: owner runs the screenshot harvest on his own machine (private repos, `gh` auth) and on the RedMagic (device lane); re-run A2 to swap feature-first layouts for imagery where captures landed.
- Day 2–3: Razorpay KYC/activation (owner side, can run in parallel from day 0), ntfy topic, ledger repo created, Vercel env set. Flip Counter from dev ledger to live.
- Go live when A1–A7 are merged and one real test order has gone end-to-end on the live ledger with ₹1.

## 5. Model and tool recommendation (owner's standing preference)

- Orchestrate the session with **Sonnet**; it is iterative repo work. Use `/model opus` (or let the driver prompt spawn an Opus subagent) for exactly two tasks: the Counter ledger concurrency/idempotency design review before A7 lands, and the slicer kernel boundary (Phase B/C).
- Playwright for the web screenshot lane; Compose Preview Screenshot Testing (Gradle, JVM, no emulator) for the Android preview lane; `adb screencap` for the device lane on the RedMagic. Details in `04_SCREENSHOT_PIPELINE.md`.
- Keep iterating the Sun/Vaastu/Alloy preview *looks* in the chat app as HTML artifacts before porting into Astro, per the owner's workflow.
