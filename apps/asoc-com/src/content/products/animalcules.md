---
headline: "Animalcules is an Android live wallpaper that animates a microscope slide in code, not from video."
lede: "Organisms are drawn to a 2D Canvas each frame, and some scenes use small bundled textures. It has its own site, animalcules.app, with a live demo. Some scenes are free; a one-time Pro purchase unlocks six more."
hub: true
features: []
neverHappens:
  - "The app makes no network calls of its own and declares no INTERNET permission in its manifest."
  - "No analytics, advertising or crash-reporting library is in it. Its only runtime dependencies are AndroidX core and Google Play Billing."
  - "No account and no backend. Settings are kept in the app's own preferences on the phone, and sensor readings are used live and not stored."
openSource:
  isOpen: false
  licence: "No licence file"
  note: "The source is not public yet. A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged."
faq:
  - q: "Does Animalcules need an internet connection?"
    a: "No. The app declares no INTERNET permission in its manifest, only a local online or offline check. The one store connection is Google Play, for the optional Pro purchase."
  - q: "Is it a video loop?"
    a: "No. Organisms are animated in Kotlin on a 2D Canvas, with no video asset. The SEM and diatom scenes also use small bundled bitmap textures."
  - q: "What does it read from my phone?"
    a: "The accelerometer, for tilt. If you switch on Reactive mode, which is off by default, it also reads one of battery, time of day, free storage, unlock count, ambient light or online state. These change density and speed, and are not stored or sent."
  - q: "Is there a desktop version?"
    a: "Not yet. A Tauri shell for Linux, macOS and Windows exists in the repository. No desktop release has been made."
ownerNotes:
  - "Status written as live per the roster. The repo is private with 0 releases and 0 tags, so the Play listing (app.animalcules) and animalcules.app are not confirmed from here. Confirm the listing is publicly installable before a Play CTA ships."
  - "Scene count left out on purpose. Code on main has thirteen scenes; the site, roadmap and privacy page say nine. Confirm which build Play serves, then update both."
  - "Free count left out on purpose. Entitlements.kt gates six scenes as Pro (Abyss, SEM, Cyclosis, Mitosis, Radiolaria, Diatoms); its comment says three classic scenes are free, the code implies seven. Unmerged PR #25 would change the split and the product id."
  - "No price quoted. Pro price appears only in project notes."
  - "Licence: no LICENSE on main, repo private (GitHub licence null). PR #31 (PolyForm Noncommercial 1.0.0) is an open draft. The about page already says source-available under PolyForm Noncommercial; this page cannot say so until #31 merges and the repo is public. The gh LICENSE check returned 404."
  - "Manifest line: main declares only ACCESS_NETWORK_STATE and allowBackup=true. The merged manifest with the Play Billing library was not built, so the final APK permission list is unverified. Unmerged PR #25 would add INTERNET and BILLING, which would make the first never-happens line false."
  - "The landing page at animalcules.app says 'drawn entirely in code'. That is too strong for SEM and diatom scenes, which use bitmap textures."
  - "No imagery for animalcules exists in screenshots/manifest.json, so no image is attached. Candidates: a Playwright capture of docs/animalcules.html?embed=1 (web lane), or store-assets/feature-graphic-1024x500.png (art lane)."
  - "The committed signing keystore with plain-text passwords (PR #24 removes it) is not mentioned on the page. Remove it from history before the repo goes public."
  - "Tip jar (Ko-fi, PayPal, UPI) is left off the page; the UPI id in AppLinks.kt was not confirmed."
---
