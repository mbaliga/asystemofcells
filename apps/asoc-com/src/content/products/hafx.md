---
headline: "A haptic is described once, as events on a timeline, and each device plays it with the actuator it has."
lede: "HAfx is a workbench for haptic and sound effects. You author an effect as events with intensity, sharpness and curves, and the renderer reads what the device reports before it plays anything."
features:
  - title: "One effect definition for every backend"
    body: "An effect is a pattern of events on a timeline, each with intensity and sharpness plus breakpoint curves. Every playback backend reads the same data."
    status: shipped
  - title: "Plain JSON save format"
    body: "Effects save and load as JSON with a type discriminator. The format is covered by serialisation tests."
    status: shipped
  - title: "Degrades to the actuator you have"
    body: "The renderer reads the device's capabilities: amplitude control, supported primitives, frequency control. Where one is missing it falls back to simpler playback, such as synthesised one-shots."
    status: shipped
  - title: "Audio and haptics on one clock"
    body: "Audio and haptic commands are scheduled on a shared transport clock, with latency compensation per backend. Two transforms couple them: an envelope follower from audio to haptics, and a sonify step from haptics to audio."
    status: shipped
  - title: "Four exports"
    body: "An effect exports as native JSON, a Kotlin VibrationEffect composition, Apple AHAP, or WAV. AHAP files can also be imported. This is a file format only. There is no iOS app."
    status: shipped
  - title: "Motion primitives"
    body: "Eight named primitives (Breath, Stir, Reform, Reach, Erupt, Coalesce, Give, Settle) come from spring-mass-damper and swell maths. One curve drives both the on-screen motion and the haptic envelope."
    status: shipped
    image: hafx.motion.web
  - title: "Texture fields scrubbed by finger speed"
    body: "Perlin, Worley, fBm and value-noise fields map finger velocity to temporal frequency. Roughness maps to spatial frequency on a log scale."
    status: shipped
    image: hafx.texture.web
  - title: "Interpolate between two feels"
    body: "The parameter navigator takes two authored texture or spring settings and fills a family of tiles between them. It is deterministic and runs on the device."
    status: shipped
    image: hafx.navigator.web
  - title: "Variations and rhythm capture"
    body: "Mutate, family and A/B variations of an effect. A rhythm recorder turns your taps into events."
    status: shipped
  - title: "Compose editor"
    body: "The editor has a timeline, envelope editor, palette, inspector, library, import and export panels. It runs as a desktop window and on Android. It is not a web app."
    status: shipped
    image: hafx.material.web
  - title: "Android app"
    body: "The app plays effects through the Vibrator API after a capability probe. It has a workbench activity and a separate feel-test gallery. The ERM or LRA split in the probe is a heuristic, and how an effect feels on a given actuator is checked by the maker on his own phone only."
    status: shipped
  - title: "Browser player for the intro score"
    body: "A player on a branch, not on the main branch, renders a HAfx score with Web Audio and adds gamepad rumble, navigator.vibrate, a 46 Hz body layer and a visual proxy. iOS taptic output is best effort. Not yet merged."
    status: partial
neverHappens:
  - "The Android app asks for one permission, VIBRATE. It declares no internet permission, so it cannot send anything off the device."
  - "It declares no microphone permission."
  - "A search of the main branch source finds no analytics, tracking or network code."
  - "The assistant panel generates on the device by default. A cloud option exists in the code as a seam and is not wired."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/hnm_playground"
  note: "A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. Until it is, the main branch states no licence."
faq:
  - q: "Is there a web editor?"
    a: "No. The editor is a Compose Multiplatform app that runs as a desktop window and on Android. A browser player for the intro score exists on a branch, not on the main branch."
  - q: "What does the app need permission for?"
    a: "VIBRATE and nothing else. It declares no internet permission."
  - q: "Will an effect feel the same on every phone?"
    a: "No. The renderer reads what the device reports and falls back to simpler playback when a capability is missing. Feel on real actuators has been tested by the maker on his own phone only."
  - q: "Where do I get the Android build?"
    a: "From the android-player-debug release on GitHub. It is a pre-release debug build with many versioned APKs, and the app on your phone is labelled Haptics Workbench. There is no store listing yet."
statusProposal: "Roster status beta is supported: the repo is public and active, a debug APK exists, there is no store release. Keep beta, not live."
ownerNotes:
  - "The brief's web editor at /haeworkbench/editor/ does not exist in the repo. The page links to no editor and says so. Fix 03_WING_APPS.md."
  - "Hero image hafx.workbench.web is a headless render of the Compose editor (docs/workbench.png), not a browser capture. The manifest labels it web. Confirm the provenance label should read Rendered preview."
  - "The installed app is labelled Haptics Workbench (dev.hnm.workbench.android, repo hnm_playground). HAfx appears only on branch feat/hafx-intro. Confirm the product name."
  - "Merge LICENSE (PolyForm Noncommercial 1.0.0) and COMMERCIAL-LICENSE.md from branch claude/asystemofcells-redesign-s6yv4c to main, then change licence and note here and set it to Source-available."
  - "The android-player-debug release holds APKs up to v0.24.0 while main's androidApp is 0.14.0. Confirm which build testers should install."
  - "The privacy draft points at /haptics/privacy and is not on main. Align the slugs with /hafx and /haptics-workbench."
  - "The exact degrade wording for continuous events was not checked against the renderer, so the page says only that it falls back to simpler playback."
  - "The accent colour is unconfirmed (roster verify list)."
---

HAfx started as a haptics and audio workbench. The idea is that a feel should be authored against one shape, not once per phone.

The Android build is a test build. It is a debug APK on a GitHub pre-release, and it is the only way to install it today.
