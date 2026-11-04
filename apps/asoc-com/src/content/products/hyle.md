---
headline: "Hyle shows state through how a material behaves, with one set of tokens built for Android and web."
lede: "Hyle is the house design system. It is a token set, an Android library, a web component kit and a live wallpaper, in one public repository."
features:
  - title: "One token source"
    body: "Tokens are written once as W3C DTCG JSON. A Style Dictionary script compiles them to Kotlin and Android resources, web CSS, SCSS and JS, and Swift. Only the Kotlin output is checked in, and nothing consumes the Swift output yet."
    status: shipped
  - title: "Android library with a render contract"
    body: "The dev.aarso:hyle module, version 0.2.0, defines Finish (Reflective or Radiant), Pulse timings and the radiant hues, plus the generated tokens. It is plain Kotlin with JVM tests. It is consumed by sibling apps through a Gradle includeBuild and is not on a public Maven repository."
    status: shipped
  - title: "Provenance hues with a second channel"
    body: "Native is #C7EF9E and cloud is #35E0FF. The README requires every hue to be paired with form, motion, position or an icon. That is a written rule. It has not been checked against every component."
    status: partial
  - title: "Pulse"
    body: "Radiant surfaces breathe on a fixed cycle. The WATCHED preset runs 2400 ms between 42% and 78% alpha. STILL holds 100% alpha."
    status: shipped
  - title: "Web components"
    body: "Twenty-six Lit component folders: controls, tactile controls (knob, fader, toggle, key, joystick, dial, transport), displays (meter, waveform) and surfaces. Each has Storybook stories. A GitHub Pages workflow builds Storybook, but the published site was not checked."
    status: shipped
  - title: "Field and Pane"
    body: "The Field is a WebGL layer behind the Pane. The Pane is frosted glass carrying readable controls. The Field hosts the Form-World engine, a single-file raymarcher with six scenes: Bowl, Helix, Towers, Arch, Ruins and Planet."
    status: shipped
  - title: "Hyle Worlds live wallpaper"
    body: "An Android wallpaper service runs the Form-World shader on OpenGL ES 2.0. It pauses when not visible and treats home-screen paging as a slight yaw. Settings offer six scenes, palettes, Passive or Active motion, recursion and speed. It is a debug build, sideloaded from the GitHub pre-release, and built from commit 0ea809c on 2026-06-30. It may be older than current main."
    status: partial
  - title: "Tactile Kit"
    body: "One self-contained HTML file of physical-control widgets in sixteen sections. It is themed along five axes: surface, accent, finish, texture and label."
    status: shipped
  - title: "Type families"
    body: "Six families sit in the repo: Hyle Classic, Hyle Deco, Hyle Deco Pro, Hyle Grotesk Classic, Hyle Grotesk Plus and Hyle Print. Each keeps its SIL Open Font License notice. Hyle Deco has its own page."
    status: shipped
  - title: "Compose modifiers and AGSL shaders"
    body: "The Android library is data and contract only today. Compose modifiers and shaders are in the plan."
    status: planned
neverHappens:
  - "The Hyle Worlds wallpaper declares no permissions in its manifest. It stores its settings in the phone's own preferences."
  - "Form-World runs with no network and no downloaded assets."
  - "No analytics or telemetry dependency is in the Android modules."
openSource:
  isOpen: true
  licence: "Apache-2.0"
  repo: "mbaliga/Hyle-Design-System"
  note: "A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. The fonts carry SIL OFL 1.1 notices either way."
faq:
  - q: "What can I install?"
    a: "Only the Hyle Worlds wallpaper, as a debug APK from the repo's GitHub pre-release. The rest is source: tokens, an Android library and web components."
  - q: "Is there a Play listing or a stable release?"
    a: "Not that this page can point to. The one release is a pre-release debug build."
  - q: "Does it compile to iOS?"
    a: "The token pipeline can emit Swift. No iOS code in the repo uses it yet."
  - q: "Is it accessible?"
    a: "The README sets accessibility rules as gates. No test results for them are published, so this page makes no compliance claim."
statusProposal: "roster status should be beta, not live, because the only installable is a pre-release debug APK, the Android library is not on a public Maven repository, and the Storybook deployment was not confirmed."
ownerNotes:
  - "Licence: main is Apache-2.0 today. The PolyForm Noncommercial relicence (commit a4aac80) sits on the unmerged branch claude/asystemofcells-redesign-s6yv4c. about.astro already says source-available, so confirm which licence ships, then change isOpen and licence here to match."
  - "GitHub reports the licence on main as NOASSERTION, so the repo shows no Apache badge."
  - "Confirm the Storybook URL https://mbaliga.github.io/Hyle-Design-System/ is live before linking it."
  - "No Hyle imagery exists in screenshots/manifest.json. Candidates: web captures of public/kit/tactile-kit.html and field/form-world.html (needs software WebGL, check it is not blank), or a device capture of the wallpaper. Branch codex/hyle-illustrations may hold art."
  - "Hyle Deco Google Fonts submission status is not evidenced in the repo (upstream.yaml has [CONFIRM] placeholders)."
  - "The README still says hyle 0.1.0 and crash-recovery 1.0.0. The build files say 0.2.0 and 1.1.0."
  - "The roster repo is mbaliga/Hyle-Design-System. Brief links to .dev/hyle/* pages were not checked."
---
Hyle starts from one rule: a surface does not say what state it is in, it behaves as that state. A watched surface breathes. A still one does not.

The repository holds the whole system in the open: tokens, the Android library, the web components, the Form-World engine, the wallpaper and the type families. The crash-recovery module lives in the same repository but is separate from Hyle and is not described here as part of it.
