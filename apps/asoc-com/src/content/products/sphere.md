---
headline: "Sphere Launcher is an Android home app with a coverflow row of apps and an all-apps globe one pinch away."
lede: "Sphere Launcher is under construction. A debug build is available on GitHub, with no store listing and no licence file yet."
features:
  - title: "Coverflow equator"
    body: "Apps sit in a row with 3D perspective. A magnifying lens enlarges the tile at front centre, and tile spacing is computed from the lens curve. One row in landscape, two in portrait."
    status: shipped
  - title: "All-apps globe"
    body: "Pinching in projects every app onto a Fibonacci sphere. You rotate it by dragging, and the same lens magnifies the nearest app."
    status: shipped
  - title: "Works as your home app"
    body: "The manifest declares the HOME and DEFAULT intent filters. The app asks for the home role through RoleManager and falls back to the system home settings. The home key resets the surface."
    status: shipped
  - title: "Type-to-search"
    body: "In portrait an open keyboard filters apps as you type. Ranking runs exact, prefix, word-prefix, substring, then shorter label, then A to Z. Results are capped at 14."
    status: shipped
  - title: "Per-band spin"
    body: "A setting switches dragging from rotating the whole sphere to rotating only the row under your finger."
    status: shipped
  - title: "Adjustable surface settings"
    body: "Sliders for perspective, spacing, turn, depth, minimum scale, focus, arc and tilt change the equator while you watch it. Your slider choices are not saved between launches."
    status: shipped
  - title: "Hide and manage apps"
    body: "Long-press opens App info, Hide or Unhide, and Uninstall through system screens. The hidden set is stored on the device in SharedPreferences and removes an app from the equator, globe and search. The app stays installed."
    status: shipped
  - title: "Voice search"
    body: "A mic button starts Android SpeechRecognizer. If the spoken text exactly matches an app name, the app launches. Otherwise the equator moves to the best match. Your device's speech service does the recognition, and it may use the network."
    status: shipped
  - title: "Pull-down hub"
    body: "Pulling down from the top shows a glass panel with up to three notification cards, newest first, each labelled with its source. The cards come from a NotificationListenerService once you grant notification access. Without that access it shows three sample cards. Action buttons show their labels only and do nothing yet."
    status: partial
  - title: "Clock, battery, weather and now-playing"
    body: "The clock and battery percentage are read from the system. The weather line and the now-playing line are fixed placeholder text, not live data."
    status: partial
  - title: "Surface materials"
    body: "Shader glow and a flat fallback for older Android versions are in the plan. Only the capability check exists today."
    status: planned
neverHappens:
  - "The manifest declares no INTERNET permission. It lists three: installed-app list, microphone and notification access."
  - "No analytics, crash reporting or telemetry is wired in. The sources contain no network code."
  - "The only data the app stores is the set of apps you hid. Nothing it reads is sent anywhere."
  - "Voice recognition is done by your device's speech service, which may use the network. The app itself does not."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/BOS_launcher"
  note: "A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. Until it is, the public code carries no licence grant."
faq:
  - q: "Can I install it?"
    a: "A debug build is on GitHub as the prerelease apk-debug-latest. It is a debug build, not a signed release. There is no Play or F-Droid listing."
  - q: "Why does it ask for the installed-app list?"
    a: "A launcher has to show your apps. The app reads the list through the LauncherApps system API, including work-profile apps, and sends it nowhere."
  - q: "Does it work in portrait?"
    a: "Yes, with two rows and the search keyboard. It is designed landscape first."
statusProposal: "roster status should be building, not soon, because the repo has a debug-APK prerelease (v0.1.0-m1) and milestones M0 to M4 are done, though there is no store listing. The owner calls it stalled. The page is written for building: Watch the repo CTA, no install chooser."
ownerNotes:
  - "No images. The repo has no raster images and the manifest has no entries for the sphere imagery key. The prototype docs/spherelauncher13.html could be captured on Lane W, labelled Web or Rendered preview, never Captured on device. Real app imagery needs an owner-run landscape device capture."
  - "Licence: main has no LICENSE. PR #7 (open, unmerged at check time) proposes PolyForm Noncommercial 1.0.0 plus COMMERCIAL-LICENSE.md. Re-check the PR state before publishing and update openSource if it merges."
  - "PR #4 proposes removing RECORD_AUDIO and BIND_NOTIFICATION_LISTENER_SERVICE for store submission. If accepted, the voice and hub features and the neverHappens lines change. Re-read the manifest before publishing."
  - "Voice and hub are marked shipped or partial on the strength of STATE.md saying the owner confirmed them on a device. That is the owner's word, not machine-verified."
  - "Tiles mode was left out: the toggle exists but the rendering branch was not read."
  - "The brief's 'globe or a ring, your choice' and 'apps morph along bands' have no evidence in the code and are not used. The roster oneLiner repeats them and should be rewritten."
  - "The Hyle design system is not consumed; core-design imitates the palette. Nothing on the page claims otherwise."
  - "The pipeline survey listed this repo as private. It is public."
---
Sphere Launcher is a home app for Android. It was built landscape first.

The source is at v0.1.0-m1. The only release is a debug-build prerelease. Watching the repo is the sensible way to follow it.
