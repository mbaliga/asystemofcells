# Device captures: the owner's checklist (Lane D)

Only a capture taken on the RedMagic 11 Pro may be labelled "Captured on device". No device, emulator or Android SDK was present when the site imagery was produced, so **no Lane P previews were rendered** and nothing here was captured on a device. These screens are open until you shoot them.

## Run it

```bash
# prerequisites: adb (USB debugging on, RedMagic authorised), jq, python3
adb devices                       # must list the phone as "device"
# open the screen on the phone, then, from the repo root:
docs/handoff/tools/shoot-device.sh <imagery> "<label>" [hero|feature|gallery]
# example
docs/handoff/tools/shoot-device.sh clackpad "Keyboard over notes, dark" hero
```

One shot per invocation. The script runs `adb exec-out screencap -p`, then writes:

- the PNG to `screenshots/device/<imagery>/<label-slug>.png`
- a manifest entry with id `<imagery>.<label-slug>.phone.<scheme>`, `lane: "device"`, `viewport: "phone"`, `sample_data: false`, and a **`device` block** read from the phone:
  `{ "model": "RedMagic 11 Pro", "android": "<ro.build.version.release>", "package": "<foreground package>", "appVersion": "<versionName>" }`

Things to check after each shot:

1. `device.model` and `device.android` are filled (the validator rejects `lane: "device"` without them). `package` and `appVersion` are best-effort from `dumpsys`; if empty, edit the entry by hand (the app's real package and versionName).
2. `scheme` is taken from the system night-mode setting. For apps with their own theme switch, make sure the system setting matches, or edit `scheme` by hand.
3. The script writes `src` as `screenshots/device/...`. The site reads images from `apps/asoc-com/src/assets/screens/<imagery>/`. Move the PNG there (`<label-slug>.phone.<scheme>.png`) and set the entry's `src` to the new repo-relative path, then run `node packages/roster/validate.mjs`.
4. Hide notifications and the clock where you can (Do Not Disturb, demo mode). Never edit the pixels.
5. The script writes a phone viewport. For the watch face (see Globe / Timely), set `viewport` to `"watch"` and `mask` to `"circle"` by hand.

## Per product: the screens to capture

The label slug is the label lower-cased with non-alphanumerics turned into `-`. The manifest id is `<imagery>.<slug>.phone.<scheme>`.

| Imagery | Label (exact) | Slug / expected file | Role | Notes |
|---|---|---|---|---|
| `clackpad` | Keyboard over notes, light | `keyboard-over-notes-light` | hero | keyboard open over a notes app, system light |
| `clackpad` | Keyboard over notes, dark | `keyboard-over-notes-dark` | feature | same screen, system dark |
| `clackpad` | Trackpad orb | `trackpad-orb` | feature | finger on the optical orb, cursor visible in the host app |
| `clackpad` | Code mode | `code-mode` | feature | snippets row visible |
| `clackpad` | Pro chin | `pro-chin` | feature | chin with the mdhv.xyz watermark removed (Pro) |
| `nooz` | Newsstand | `newsstand` | feature | app (not web): the Stand |
| `nooz` | Reader | `reader` | feature | an article open |
| `nooz` | Loom | `loom` | feature | after reading a few items so the consumption side is not 0 |
| `crocodyl` | Baseline | `baseline` | feature | baseline built from a session |
| `crocodyl` | Session | `session` | feature | recording, segments visible |
| `crocodyl` | Flag | `flag` | feature | the shot that broke the baseline |
| `fylz` | Home room | `home-room` | hero | browser home, Intent above, Evidence below |
| `fylz` | Safety history | `safety-history` | feature | one feature screen (or Inspect, your pick) |
| `fotoz` | Home room | `home-room` | hero | rooms grammar, edge timeline scrubber |
| `fotoz` | Smart albums | `smart-albums` | feature | one feature screen |
| `ebbflow` | Home room | `home-room` | hero | no real EEG data on screen unless it is yours and you are happy to publish it |
| `ebbflow` | Deviation view | `deviation-view` | feature | deviations, never labels |
| `sphere` | Globe home | `globe-home` | hero | launcher with the globe home |
| `sphere` | Ring home | `ring-home` | feature | launcher with the ring home |
| `animalcules` | Lock screen | `lock-screen` | hero | live wallpaper on the lock screen |
| `globe` | Watch face on wrist | `watch-face-on-wrist` | hero | photograph or watch screenshot. This is a shot of the real watch, so keep `lane: "device"` only if you capture through adb on the watch; otherwise do not label it device |
| `timely` | Watch face on wrist | `watch-face-on-wrist` | hero | same rule as Globe |

Imagery keys are the roster keys in `packages/roster/roster.public.json` (`clackpad`, `nooz`, `crocodyl`, `fylz`, `fotoz`, `ebbflow`, `sphere`, `animalcules`, `globe`, `timely`).

Do not publish a capture that shows your own private data (messages in the notes app, files in Fylz, photos in Foto Xplorr, EEG sessions). Use a clean profile or sample content, and set `sample_data` to `true` in the entry if the content is staged.

## Example of the entry you should end with

```json
{
  "id": "clackpad.keyboard-over-notes-light.phone.light",
  "imagery": "clackpad",
  "role": "hero",
  "lane": "device",
  "label": "Keyboard over notes, light",
  "src": "apps/asoc-com/src/assets/screens/clackpad/keyboard-over-notes-light.phone.light.png",
  "w": 1440, "h": 3120,
  "scheme": "light", "viewport": "phone", "mask": null,
  "sample_data": false,
  "source": { "repo": null, "ref": null, "path": null, "tool": "adb screencap" },
  "device": { "model": "RedMagic 11 Pro", "android": "16", "package": "<package>", "appVersion": "<versionName>" }
}
```

## Lane P (rendered previews): not run

No Android SDK was present in the container, so `updateDebugScreenshotTest` was not attempted for Fylz, Foto Xplorr, Crocodyl, Ebbflow, Assay or Nooz, and no `preview` entries exist. Those pages stay feature-led. To render them on a machine with the SDK, add this to the app module of each repo (AGP >= 8.5, Kotlin per repo):

```kotlin
// settings.gradle.kts (pluginManagement) — the plugin lives in google()
// app/build.gradle.kts
plugins { id("com.android.compose.screenshot") version "0.0.1-alpha09" } // pin to the latest alpha the repo's AGP supports
android { experimentalProperties["android.experimental.enableScreenshotTest"] = true }
dependencies { screenshotTestImplementation("androidx.compose.ui:ui-tooling") }
// gradle.properties
// android.experimental.enableScreenshotTest=true
```

Then:

```bash
./gradlew :app:updateDebugScreenshotTest
docs/handoff/tools/harvest-screenshots.sh --lane P
```

`harvest-screenshots.sh --lane P` copies the references from `app/src/<variant>ScreenshotTest/reference/` into the manifest with `lane: "preview"`. Previews that render fake data must have `sample_data: true`.
