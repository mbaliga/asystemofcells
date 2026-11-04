# Driver prompt for Claude Code

Copy everything below the line into Claude Code, started in the `asystemofcells` repo with this bundle checked in at `docs/handoff/`. Run with Sonnet as the orchestrator. The prompt tells the session where to escalate.

---

You are building the four-wing version of asystemofcells.com from the handoff bundle in `docs/handoff/`. Read, in this order, before touching code: `01_MASTER_PLAN.md`, `02_SITE_ARCHITECTURE.md`, then the wing documents `03`–`07`, then `08_COUNTER_BACKEND.md`. `09_COUNTER_APP.md` is a separate repo and comes last. The bundle's `data/*.json` are the tables; `tools/*` are runnable references with tests (`node --test docs/handoff/tools/`). Treat the house rules in `01 §1` as fixed; where a document says *verify*, read the repo or the linked upstream before writing copy.

Work as phases A1 → A8, one PR per phase, in this order; keep `main` deployable after every merge. Use Sonnet for the work. Spawn an Opus subagent for exactly two reviews, and wait for them: (1) before opening PR A7, a review of `api/counter/_ledger.js` for the create-without-sha lock, the update-with-sha retry loop, idempotency keys and webhook replay; (2) before PR A5, a review of the estimator port against `tools/estimate.mjs` and its tests. Do not spawn Opus for anything else.

Standing constraints for every PR:
- Never pass `analytics` on a page that contains a form, a cart, a canvas, a Worker, or a `fetch` to `/api/counter`. Add `docs/handoff/tools/check-analytics-boundary.sh` to the build script and keep it green.
- Never render `verify[]` from the roster. Never invent product facts: the per-product briefs in `03` are angles; the repo's own README/docs are the source. If a feature is not evidently shipped, leave it out or mark it "in the plan".
- Never label an image "Captured on device" unless the manifest entry has a `device` block. The container has no phone: previews are previews.
- No new frameworks. Vanilla ES modules, Astro content collections, `three` only on `/prints/slicer` and `/architecture/tools/sun`, loaded lazily.
- Owner taste: whitespace over boxes; organic cell-marks for status/provenance; explanatory copy behind ⓘ; no decorative lines across figures; short declarative copy in the voice of `about.astro`.
- Placeholder numbers (`pricing.prints.json`, `finish-tiers.json`, `shipping.json`) ship as placeholders; put `OWNER: calibrate` comments in the JSON and a line in each PR description listing them.

Phase checklist (details and acceptance in the documents):

A1 Roster v2 + manifest loader + provenance component. Extend `roster.public.json` with `name`, `repo`, `install`, `web`, `imagery`, new cells from `02 §4.1` and `data/roster.v2.additions.json`, write `roster.schema.json`, add `wings.json` + `getWings()`, add `screens.js` + `screenshots/manifest.json` (empty entries ok), `Provenance.astro`, `CellMark.astro`. Redirect `/haptics-workbench → /hafx`.

A2 Product pages v2. Build `WingLayout.astro`; make `ProductLayout` a thin wrapper; add `src/content/products/*.md` for every cell from the briefs in `03 §2` (verify against each repo); image-led where the manifest has entries, feature-led otherwise; remove every `screen-crop` placeholder. Run the screenshot lanes you can from here: `tools/shoot-web.mjs` on the Nooz reader, the generators, Orrery web (`web/build.py`), HAfx editor if present; copy Lane A assets (Crocodyl atelier posters, Bocal instrument art, Alloy plates, HAfx docs captures). Attempt Lane P (Compose preview screenshot task) on temp clones of `Fyl-Manager` and `Foto-Xplorr` only if an Android SDK is available; otherwise put the Gradle snippet in the PR description. Produce `tools/shoot-device.sh` and a per-product device checklist for the owner.

A3 Home. Add the three wing tiles and wing links to `HomeCarousel.astro` per `02 §3`; reduced-motion and `flow-fallback` list them.

A4 The Cabinet per `05`. Three sample items (made edition, curiosity, sold), cart, checkout to the dev ledger, `catalog-state` live flip, reservations with 409.

A5 Alloy prints Stage 0 per `07 §1–3, §6–§10`. Port `tools/estimate.mjs` into a Worker, build the plate preview to the visual spec in `07 §2`, quote from the JSON tables, order to the dev ledger with presigned upload. Hide the handoff routes gated by `data/handoff.json` flags; write the honest Handy copy per `07 §7`.

A6 Practice per `06`. Explorables scaffold with three `pending: true` entries (no invented descriptions), tools hub, Sun (port `tools/sunpath.mjs` 1:1, all tests), Wind (bake Hyderabad + the sites list with `tools/build-windrose.mjs` — this one network call is a build step; commit the baked JSON), Vaastu (from `data/vaastu.zones.json`), commission form.

A7 Counter backend per `08`: functions, ledger adapter (GitHub, with the Gitea twin), Razorpay links + webhook, ntfy, Resend mail, retention cron, privacy page delta from `02 §8`, tests with the in-memory ledger, `tools/counter-smoke.mjs`. Use env names exactly as listed in `08 §4`; read them from `process.env`; fail loudly when missing in production and fall back to the in-memory ledger in `vercel dev`.

A8 Counter app per `09` in a new repo (`mbaliga/asoc-counter-app`): `:core` JVM-tested, `:data`, `:app` Compose/Hyle with rooms; APK via CI.

For each PR: run `pnpm build`, the boundary check, `node --test` for the ported references, and Lighthouse on three pages; paste results in the PR description with the list of OWNER items (calibration numbers, device captures to take, secrets to set, Razorpay activation, ledger repo to create, ntfy topic). Do not stop between phases to ask whether to continue; stop only on a decision that cannot be undone and could reasonably go either way, and say which it is.

When A1–A7 are merged, write `docs/handoff/GO-LIVE.md`: the exact owner steps to flip from the dev ledger to live, the ₹1 smoke order, and the device screenshot checklist.
