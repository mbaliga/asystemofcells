# Wing 1 — Cells (Sovereignty apps): product pages v2

Goal: every roster cell gets a real marketing page now. Where the harvest produced screenshots, the page is image-led; where it did not (most apps, see the inventory in `04_SCREENSHOT_PIPELINE.md` §1), the page is **feature-led with one or two images at most**, and never a placeholder gradient pretending to be a screen.

## 1. Product page template v2 (`ProductLayout.astro` → built on `WingLayout`)

Sections, in order. Each is driven by `products/{slug}.md` frontmatter + roster + `screenshots/manifest.json`; a section with no data is **omitted**, not left as a stub.

1. **Hero** (exists). Add: the `install` multi-store chooser (Play / F-Droid·IzzyOnDroid / GitHub) rendered as three quiet links under the primary CTA; `status` cell-mark; for `building` status, the CTA is "Watch the repo" (GitHub) and the chooser is hidden.
2. **Lead image or triptych.**
   - Image-led: a phone-framed device shot (the first manifest entry with `role: hero`), with its provenance glyph+label beneath (`Captured on device` / `Rendered preview` / `Web` / `Render` / `Art`).
   - Feature-led: three feature tiles (`features[0..2]`), typographic, no imagery, generous spacing.
3. **Feature rows** (alternating, exists). Each row = `features[i]` with optional `image` from the manifest by `id`. Rows without images collapse to full-width text with a large numeral or a cell-mark, so the rhythm survives.
4. **"What never happens"** (new, short): three lines generated from roster flags — no telemetry; on-device first; cloud (if any) is opt-in per use and marked. For apps with a BYO-endpoint path (Clackpad, Nooz, Fonebrew) add the honest fourth line: *"If you point it at your own AI endpoint, your text goes there and nowhere else."*
5. **Open source** (new): licence + repo link when `openSource: true`; for open-core products one sentence naming what is closed (Baseline engine under Ebbflow/Crocodyl; Studio layer is now going open per the owner's Oct 2026 decision — state "open" there).
6. **Hub products** (Animalcules, Fonebrew): keep the lighter treatment — hero + "What never happens" + link out; no feature rows. (Already the rule.)
7. **FAQ** (exists): the three house questions + `faq[]` from the product file.
8. **Footer** with wing switcher.

Copy rules: short declarative sentences in the voice of `about.astro`; no superlatives, no "seamless/robust/powerful"; name the mechanism, not the benefit ("Every organism is drawn in code, never looped from video"); explanatory copy goes behind ⓘ.

## 2. Per-product briefs

Format: angle · features (draft, derived from the repos' own docs and the owner's stated decisions; Claude Code verifies each against the repo README/docs before publishing) · imagery plan (lane from `04_SCREENSHOT_PIPELINE.md`) · install/CTA · open-source line. Where a claim is marked *verify*, read the repo.

### Clackpad — daily-cells · beta → live-on-Play
- Angle: a phone keyboard that behaves like a physical device. Own design language (not Hyle), on purpose.
- Features: split QWERTY with an optical trackpad orb; metallic keycaps + prediction strip, console-era industrial design; two-thumb gesture for volume; code mode and snippets; haptics; on-device AI with a four-tier fallback (BYO endpoint → downloadable on-device LLM → Gemini Nano where present → n-gram), all free; the only paid thing is removing the mdhv.xyz watermark on the chin (Clackpad Pro, one-time).
- Imagery: **device lane** (an IME cannot be preview-rendered meaningfully); until captured, feature-led + the flip-card Pro asset the owner is iterating (`art`).
- Install: Play (live); F-Droid n/a (closed); GitHub n/a.
- Open source: no (commercial closure, deliberately narrow). Privacy note must carry the BYO-endpoint carve-out.

### Nooz — daily-cells · beta (Play closed beta)
- Angle: you only see sources you chose. No discovery, no algorithm, no backend.
- Features: Loom (reflect on your own consumption); marks hedging words and intensifiers, optional on-device rewrite to neutral; opt-in dictionary; opt-in briefing; Nooz Paper and Nooz clippings share formats; quick/advanced onboarding; web reader at `/nooz/read`.
- Imagery: **web lane** — Playwright captures of the reader at phone and desktop (`newsstand`, `reader`, `loom`, `clippings` views, seeded with the starter feeds so it isn't empty). Feature graphic from `fastlane/metadata/android/en-US/images/featureGraphic.png` (`art`).
- Install: Play closed beta link; GitHub releases; F-Droid once listed.
- Open source: yes (licence per repo; *verify*).

### Odyssey — ambient-cells · soon
- Angle: Odysseus's voyage as a live wallpaper, built book by book.
- Features: WebGL trireme scene; per-book episodes; one HTML spec, native port must match. (Argo/Argonautica is a fork — mention as "a second voyage is in the yard", nothing more.)
- Imagery: **web lane** against the HTML spec if the owner adds the private repo to the harvest; otherwise feature-led with the roster accent.
- CTA: Notify me (email capture → Counter `inquiries` kind `notify`).

### Crocodyl — daily-cells · beta
- Angle: a free, open form coach. Archery first, sport-neutral engine.
- Features: camera + MediaPipe pose builds your baseline, then flags the shot that broke it; hand-rolled DSP, Room, no cloud; records a session as segments (warm-up, drills, bouts); smartwatch as an extra sensor (Watch 8); Coach Mode (paid, sibling) monetises a club of free archers; bow-mounted IMU add-on (hardware-gated).
- Imagery: **art lane now** — `docs/crocodyl/atelier-previews/*.jpg` and `app-android/src/main/assets/atelier/posters/*` are marketing-grade (recurve/arrow/target, light+dark). **Preview lane** for Compose screens (235 .kt files; run the screenshot test task). Device lane later.
- Install: GitHub releases (repo `Form-analyser`); Play when the closed test opens.
- Open source: yes; engine ships inside; Baseline (the EEG engine) is separate and closed for now.

### Animalcules — ambient-cells · live (hub → animalcules.app)
- Light treatment. One line on the drawn-not-looped ethos, the free/paid scene split, link out.

### Globe / Timely — ambient-cells · soon
- Angle: one HTML mock exported to three watch platforms (Wear OS WFF, Huawei, Garmin).
- Imagery: **web lane** on the WFF/HTML face mock (owner has a visually validated WFF file; render at 450×450 round mask).
- CTA: Notify me.

### Fonebrew — maker-cells · beta (hub → fonebrew.app)
- Light treatment; it has its own site. One line: the agentic Android IDE this house was built with; core Apache-2.0; Studio going open.

### HAfx (haptics-workbench → hafx) — maker-cells · beta
- Angle: design a haptic once, against one shape; it renders on whatever the device actually has.
- Features: IR JSON is the single authoritative format shared by the Kotlin core and the web editor; four web output paths (gamepad rumble, `navigator.vibrate`, audio-as-haptic, visual proxy); sample import/generation; multi-target export; the Hyle haptics + earcon set ships as a preset.
- Imagery: **web lane** — the editor at `/haeworkbench/editor/` (confirm path exists in `public/`; the memory says it was built out) at desktop + tablet; **existing** `hnm_playground/docs/workbench*.png` (5 real captures) as `art`/`web`.
- Install: Android APK via GitHub releases; web editor link primary.
- Open source: yes (*verify licence*).

### Figma suite — maker-cells · live
- Angle: watchface exporter, Play publisher, deskpets, haptics connector. No payment form inside any plugin, no ads.
- Imagery: **render lane** — plugin UIs are HTML; capture the plugin `ui.html` at Figma panel size (400×600) if the repo is public; else feature-led.
- CTA: Figma Community links (owner supplies; placeholders stay hidden if empty).

### Ebbflow — maker-cells · beta
- Angle: an EEG companion for MW75 Neuro. Within-subject deviation, never diagnosis.
- Features: captures signal from the headphones; your own baseline; deviations, not labels; export everything; Baseline engine closed only until the research is published (say that plainly).
- Imagery: **preview lane** if Compose screens exist on main (main is sparse: 55 files on a `claude/meta-trunk…` default branch — *verify*); otherwise feature-led + `mw75-streamer/mw75_streamer/assets/mw75.webp` as `art`.
- Open source: app yes; engine closed (research embargo).

### Hyle — connective-tissue · live
- Angle: the house design system; state is shown by how a material behaves. Links to `.dev/hyle/*` and `/hyle-fonts`.
- Imagery: **render lane** — the `.dev` tokens/components pages at desktop width.

### Hyle Deco — connective-tissue · soon → "free download" exists
- Already served by `/hyle-fonts`; product page is a short pointer + OFL note + Google Fonts status (submission open, fixes pending — *verify current*).

### ASOM — connective-tissue · beta
- Angle: one app holds the keys and makes the routing call; everything else is a client. `127.0.0.1:11435`, OpenAI-compatible, AIDL-verified pairing, Apache-2.0.
- Imagery: feature-led; an architecture diagram as inline SVG (one SVG, two themes) is better than a screenshot here.

### Fylz — daily-cells · building (new)
- Angle: every file is inspectable (capability ladder 0–5), rooms not screens, Safety History for writes.
- Features: rooms (browser home, Intent above, Evidence below); text/Markdown editing via one editor core; archives incl. RAR (*verify shipped*); rule-based bulk rename; tiered search; customisation tiers (settings → declarative rules → sandboxed Rhai scripts) — mark the ones not yet shipped as "in the plan", or omit.
- Imagery: **preview lane** (Compose; repo public, 185 files, no images) + device lane later.
- CTA: Watch the repo.

### Foto Xplorr — daily-cells · building (new)
- Angle: a local-first gallery with a catalogue, not a cloud. One SQLite row per asset, eleven smart albums, nine destinations, no destination owns an asset.
- Features: rooms grammar; edge timeline scrubber; trash stays indexed until shredded; archived hidden everywhere but Archived; ML only on charger by default.
- Imagery: **preview lane** (515 .kt files; many `@Preview`s likely); device later.

### Bocal — daily-cells · soon (new)
- Angle: a backendless practice companion for woodwind players; no INTERNET permission in the MVP.
- Imagery: **art lane** — `web-source/public/images/bocal-*-cinematic.webp` (seven instruments, already web-optimised) + `bocal-logotype.png`. This page can be image-led today.

### Runout — ambient-cells · soon (new)
- Angle: a turntable instrument, not a music player with a skin. Albums are records, playlists are mixtapes; the disc drags, including in reverse.
- Imagery: **web lane** on the HTML prototype (private); feature-led until then.

### Sphere Launcher — ambient-cells · soon (new)
- Angle: a launcher where home is a globe or a ring (user's choice), apps morph along bands. Keep it short; the owner calls it stalled.

### Typewright — maker-cells · building (new)
- Angle: scanned, photographed or drawn letterforms to a Google Fonts-quality font, for scripts the incumbents ignore (Devanagari, other Indic, SE Asian, Arabic, kana). Grew out of the Hyle Deco submission's failures.
- Features: trace-and-fit "node economy" with a box-and-whisker view against the top 30 fonts of the same style; lessons on lineages and craft; arc nav; construction lines always visible.
- Imagery: **web lane** on the explorer HTML the owner has visually verified (if present in the repo: 726 files, 0 images — *verify*), else feature-led.

### Alloy — maker-cells · building (new)
- Angle: a native Android slicer for the A1 mini first, Orca/Prusa engine lineage, LAN developer mode. Cross-link: "Slice in the browser now at /prints/slicer — same Alloy, lighter shell."
- Imagery: `branding/alloy-logo.png`, `marketing/alloy-a1-mini-plates-{light,night}.png` exist on `codex/alloy-phone-first-ui` (`art`).

### Assay — maker-cells · building (new)
- Angle: on-device security auditing for AI-written Android apps; deterministic scanners only (MobSF, OSV-Scanner, Semgrep, Gitleaks) — no model invents a finding.
- Honesty: owner judged it not production-ready in Nov 2026. Status `building`, no install CTA, feature-led, one line: "Not ready. Watching the repo is the only sensible action."

### Orrery — connective-tissue · building (new)
- Angle: a read-only view of the whole pipeline — the owner's cockpit, free for anyone to read, a git repo as the truth. Avoid "monitor/overseer" vocabulary (owner rule).
- Imagery: **web lane** on `orrery/web` (public: `web/src/*.js`, `web/build.py` builds it — run the build and capture).

### Counter — connective-tissue · building (new, optional, `hidden: true` on the conveyor)
- The shop counter behind the Cabinet and Alloy prints. A plain page that says what it stores and where; links to the privacy section.

## 3. "Notify me" without a mailing-list vendor

`soon` CTAs post `{kind: 'notify', product, email}` to `/api/counter/inquiries`. The ledger holds a `notify/` folder; the owner emails from his own client when a product ships. No ESP, no cookie, one line in privacy.

## 4. Acceptance for A2

- Every roster slug renders; no `screen-crop` placeholder remains anywhere in `src/`.
- Feature-led pages have ≥3 features from the product file; image-led pages have provenance labels on every image.
- `verify[]` never appears in HTML (grep the `dist/`).
- Hub pages are short; `building` pages have no install chooser.
- `pnpm build` green; sitemap includes new slugs; `/haptics-workbench` 301s to `/hafx`.
