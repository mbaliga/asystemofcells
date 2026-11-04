# Screenshot pipeline — three capture lanes, one manifest, provenance on every image

## 1. What the repos actually contain (survey run 2026-11-04, public repos only, default branches)

| Repo | Default branch | Files | Image files | Usable product imagery |
|---|---|---|---|---|
| alloy | main | 2 | 0 | On `codex/alloy-phone-first-ui`: `branding/alloy-logo.png`, `marketing/alloy-a1-mini-plates-light.png`, `…-night.png` |
| Fyl-Manager | main | 185 | 0 | none — preview lane |
| hnm_playground (HAfx) | main | 107 | 5 | `docs/workbench{,-material,-motion,-navigator,-texture}.png` — real captures |
| asystemofmodels | claude/asom-v1-build-brief-… | 1343 | 1 | none — diagram instead |
| android-ide-core | main | 1622 | 13 | only design references (`docs/design/reference/gemini-*.jpg`) — not product |
| nooz | claude/app-build-… | 447 | 21 | `fastlane/metadata/android/en-US/images/featureGraphic.png`; the reader is web-capturable |
| orrery | main | 76 | 0 | `web/` builds a page — web lane |
| Shared-Libraries-asoc | main | 82 | 0 | — |
| mw75-streamer | main | 63 | 4 | `docs/assets/browser.gif`, `installation.gif`, `mw75.webp` |
| TWA-Template, Redmagic-Edge, LG-Gear-VR-Port | main | 25/10/1 | 0 | — |
| Bocal | main | 475 | 36 | `web-source/public/images/bocal-*-cinematic.webp` (7), logo + logotype; `screenshots/*.jpg` are *reference UI* (not Bocal) — do not use |
| Gesture_mask, figma-shell, testing-tool | — | 0 | 0 | empty repos |
| Assay | main | 2 | 0 | work on `agent/assay-v1-foundation`, `apk-testbuild` — preview lane if Compose exists there |
| Foto-Xplorr | main | 616 | 5 | none usable — preview lane |
| ebbflow | claude/meta-trunk-… | 55 | 0 | sparse — feature-led |
| typewright | main | 726 | 0 | explorer HTML (*verify*) — web lane |
| hyle-design-system | main | 3119 | 2567 | `assets/primitives/**` (icons/primitives, not screens); `.dev` pages are the capture target |
| form-analyser (Crocodyl) | main | 485 | 70 | `docs/crocodyl/atelier-previews/*.jpg`, `app-android/src/main/assets/atelier/{cinematic,posters}/*.jpg` — marketing-grade art |

Private/unfound by name (owner's harvest will enumerate them with `gh`): Hyle (app), Animalcules, Clackpad, Odyssey/trireme-odyssey, Runout, Watch Apps/Globe/Timely, Baseline, Aarso, Android-IDE-Studio, Sphere Launcher, Personal-Tracker, figma plugins, IN-RTS, mdhv.xyz.

Conclusion: **screenshots cannot be "taken from repos" as files for most products.** They have to be *produced*, by three lanes, and labelled with how they were produced.

## 2. The three lanes

### Lane W — web (Playwright, headless Chromium)
For anything that is HTML: the Nooz reader, HAfx editor, Orrery web, the generators, HTML canonical specs (Animalcules, Odyssey, Runout, Sphere, watch faces, Typewright explorer), Figma plugin `ui.html`, `.dev` Hyle pages. Runs anywhere, including the Claude Code container. Script: `tools/shoot-web.mjs`. Viewports: `phone` 412×915 @3x (Pixel-class), `tablet` 1024×1366 @2x, `desktop` 1440×900 @2x, `watch` 450×450 @2x with a circular mask applied in post. Dark/light both when the page supports `prefers-color-scheme`.

### Lane P — Android preview (Compose Preview Screenshot Testing, JVM, no emulator)
AGP's `com.android.compose.screenshot` plugin renders every `@Preview` composable with LayoutLib on the JVM and writes PNGs under `app/src/<variant>ScreenshotTest/reference/`. This runs in a container with the Android SDK and no device, which is exactly the owner's environment-honesty convention: the output is a *rendered preview*, labelled so. Gradle wiring (add to the app module of Fylz, Foto Xplorr, Crocodyl, Ebbflow, Assay, Nooz; AGP ≥ 8.5, Kotlin per repo):

```kotlin
// settings.gradle.kts (pluginManagement) — the plugin lives in google()
// app/build.gradle.kts
plugins { id("com.android.compose.screenshot") version "0.0.1-alpha09" } // pin to the latest alpha the repo's AGP supports
android { experimentalProperties["android.experimental.enableScreenshotTest"] = true }
dependencies { screenshotTestImplementation("androidx.compose.ui:ui-tooling") }
// gradle.properties
// android.experimental.enableScreenshotTest=true
```
Then `./gradlew :app:updateDebugScreenshotTest` generates references; `tools/harvest-screenshots.sh --lane P` copies them into the manifest with `lane: preview`. Previews that take fake data render fake data — that is fine for a *rendered preview*, but the manifest marks `sample_data: true` and the page's ⓘ says so.

### Lane D — device (adb, RedMagic 11 Pro, owner-run)
`tools/shoot-device.sh <package> <name>`: `adb exec-out screencap -p` after the owner navigates; writes `screenshots/device/<imagery>/<name>.png` with the device model, Android version and app version in the manifest. The only lane allowed to say "Captured on device". IMEs (Clackpad) and launchers (Sphere) are device-only.

Plus two non-capture lanes for the manifest: **R — render** (SVG/inline diagrams, plugin panels, watch mocks) and **A — art** (cinematic/poster assets that exist in repos, e.g. Crocodyl atelier, Bocal instruments, Alloy plates).

## 3. The manifest (`screenshots/manifest.json`, repo root)

```jsonc
{
  "version": 1,
  "generated": "2026-11-05T…Z",
  "entries": [
    {
      "id": "nooz.newsstand.phone.dark",
      "imagery": "nooz",                 // roster.imagery (defaults to slug)
      "role": "hero",                    // hero | feature | gallery
      "lane": "web",                     // device | preview | web | render | art
      "label": "Newsstand",              // caption shown on the page
      "src": "src/assets/screens/nooz/newsstand.phone.dark.png",
      "w": 1236, "h": 2745, "scheme": "dark", "viewport": "phone",
      "sample_data": true,
      "source": { "repo": "mbaliga/asystemofcells", "ref": "5c89cb2", "path": "apps/asoc-com/public/nooz/read/", "tool": "playwright 1.49" },
      "device": null                     // lane=device only: { "model": "RedMagic 11 Pro", "android": "16", "appVersion": "1.2.0" }
    }
  ]
}
```

`packages/roster/screens.js` exports `getScreens(imagery, {role, lane, scheme})`; `ProductLayout` picks `hero` first, then `feature` entries in file order. **No entry → no image slot rendered.**

Provenance rendering (`packages/kit/src/components/Provenance.astro`): a small cell-mark glyph (distinct shape per lane: solid cell = device, outlined = preview, mesh = web, hatched = render, bordered = art) + the text label. Shape *and* label, never colour alone.

## 4. The harvest script (`tools/harvest-screenshots.sh`)

Runs on the owner's machine (where `gh auth status` succeeds and private repos are visible) or in the container (public repos only). Steps:

1. `gh repo list mbaliga --limit 200 --json name,isPrivate,defaultBranchRef,pushedAt` → `screenshots/repos.json`. (The container's `gh` is bound to configured repos; there this step is replaced by the public-name list in §1.)
2. For each repo: shallow, blob-less clone; list tree; collect files matching the asset patterns (`screenshots/`, `fastlane/metadata/**/images/`, `marketing/`, `branding/`, `docs/**/*.png|jpg|webp`, `**/atelier/**`, `web-source/public/images/`) into `screenshots/raw/<repo>/` with their git ref recorded; skip `res/mipmap`, launcher icons, favicons, and anything under `reference/`.
3. Detect HTML specs: files named `*.html` at repo root or under `docs/`, `web/`, `prototype/`, `spec/` > 50 KB → queue for Lane W.
4. Detect Compose: any `@Preview` in `*.kt` → queue for Lane P (prints the Gradle snippet to apply if the plugin is absent; never edits another repo).
5. Write/merge `screenshots/manifest.json` with `lane: art|web|preview` entries; the owner then runs Lane D by hand.

The script is idempotent and never deletes; re-running updates `source.ref`.

## 5. Post-processing (`tools/frame.mjs`)

- Phone captures get a device frame (a neutral rounded rectangle with a 1px highlight, the same one `ProductLayout`'s old `.screen-crop` drew — reuse its radius 28px and shadow), exported at 2 widths (560, 1120) WebP + AVIF via `sharp`.
- Watch captures are masked circular.
- Never upscale; never alter UI pixels (no "cleaning"), only frame, pad, and compress.

## 6. What Claude Code does in the container, right now

- Lane W for everything public: Nooz reader (seed with `starters.js` feeds so views are populated), the two generators, Orrery web (run `web/build.py`), HAfx editor if present in `public/`, `.dev` Hyle pages (run the dev server).
- Lane A: copy Crocodyl atelier posters, Bocal instrument art, Alloy plates, HAfx docs captures, mw75 asset into `src/assets/screens/<imagery>/` and write manifest entries.
- Lane P: attempt `updateDebugScreenshotTest` for Fylz and Foto Xplorr in temp clones *if* the Android SDK is present; otherwise emit the Gradle snippet into the PR description and leave those pages feature-led. Do not claim previews that were not rendered.
- Device lane: produce `tools/shoot-device.sh` and a checklist per device-only product (Clackpad: keyboard open over a notes app in light + dark; trackpad orb; code mode; Pro chin). The owner runs it.

## 7. Acceptance

- `screenshots/manifest.json` validates against `screenshots/manifest.schema.json`; every `src` exists; every entry has a lane.
- Every image on a product page has a provenance label in the DOM (test: `document.querySelectorAll('.screen img').length === document.querySelectorAll('.provenance').length`).
- No image is labelled `device` unless its manifest entry has a `device` block.
