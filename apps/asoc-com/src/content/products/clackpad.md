---
headline: Clackpad is an Android keyboard with a split QWERTY layout and a trackpad in the middle, drawn as keycaps in a WebView.
lede: The keys sit in two halves either side of a trackpad that moves the caret. It is in beta, and it has its own design language on purpose.
features:
  - title: Split QWERTY with a centre trackpad
    body: Two key halves flank a trackpad in the middle column. Layouts include QWERTY, QWERTZ and AZERTY. In landscape the keyboard docks as a console with two thumb halves.
    status: shipped
  - title: Trackpad cursor control
    body: The trackpad moves the caret in the field, as a pad, an orb or a joystick. The landscape click buttons send real mouse clicks only when Shizuku is installed and running. Without it they can act as Copy and Paste.
    status: shipped
  - title: Keycaps and prediction strip
    body: Seven keycap shapes (Soft, Sharp, Angled, Candy, Jelly, Holo, Stone) and five case colourways. The prediction strip is drawn as a fret bar. Keycap art ships as PNG tiles.
    status: shipped
  - title: Glide typing and autocorrect
    body: Glide typing decodes a stroke against a 118,708-word dictionary. Autocorrect has three strengths, and Backspace reverts the last correction.
    status: shipped
  - title: Your Vernacular
    body: Words the dictionary does not know are counted on the device. After three sightings they join the suggestions and autocorrect stops changing them. Nothing is learned in password fields.
    status: shipped
  - title: Two-finger swipe for volume
    body: A two-finger swipe up or down changes the volume by default. Each multi-touch gesture can be rebound to another action.
    status: shipped
  - title: Code-aware mode and snippets
    body: In editors and terminals the keyboard switches to a symbol strip and code-oriented long-press variants. Snippets expand shortcuts such as /addr to stored text.
    status: shipped
  - title: Haptics
    body: One global haptic effect, with overrides per action. Android composition effects drive the vibration. How it feels is checked on a device by the maker, not by tests.
    status: shipped
  - title: AI routes
    body: Rewrite in five tones and sentence complete run on one of three routes. These are Gemini Nano where the chipset has it, your own API endpoint and key, or a downloaded .task model run locally. Translation is separate and uses on-device ML Kit language models, downloaded once. With no AI configured, the classical dictionary does the work. The route order is not yet confirmed for this page.
    status: partial
  - title: Voice dictation
    body: Tap to talk, or press and hold, through the device speech recogniser. It asks for the microphone only when you use it.
    status: shipped
  - title: Clipboard, tools, GIFs and a dictionary
    body: Clipboard history keeps the last few clips. GIFs are imported by hand, with optional Tenor search on your own key. A WordNet dictionary and thesaurus has its own launcher icon, with flashcards and a word graph.
    status: shipped
  - title: Typed-content recovery
    body: Off by default. If you switch it on, the keyboard keeps up to five things you typed and deleted, for one or five minutes, in memory only. Nothing is kept from password or incognito fields.
    status: shipped
  - title: Clackpad Pro
    body: A one-time unlock. It removes the mdhv.xyz watermark on the chin and adds custom chin skins, colours, key sounds, the audio and haptics editor, and translate as you type. Typing, gestures, the trackpad and glide typing stay free.
    status: shipped
neverHappens:
  - The app has no analytics, no accounts and no servers of its own.
  - It declares the INTERNET permission, used only for three paths that are off by default. These are your own AI endpoint, Tenor GIF search on your own key, and one-time model downloads.
  - Translate as you type runs on the device, even when you have set your own AI key.
  - If you point it at your own AI endpoint, your text goes there and nowhere else.
openSource:
  isOpen: false
  licence: No licence file
  repo: mbaliga/Clackpad
  note: The default branch has no licence file. A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. The repo is private.
faq:
  - q: Where can I install it?
    a: There is no public install link yet. The repo is private, and a Play listing is not confirmed. The status is beta.
  - q: What does the app ask permission for?
    a: Display over other apps (landscape side strips), vibration, the microphone (only when you tap the mic), notifications (tips) and the internet (optional, as above). Play Billing adds its own billing permission.
  - q: What is Shizuku for?
    a: It is optional. With it installed and running, the trackpad can drive a system pointer and send real mouse clicks. Without it the keyboard still works.
  - q: What does Pro cost?
    a: This page gives no price. The one-time unlock is priced in the store.
hub: false
statusProposal: Roster says beta, and the facts support beta. Do not move it to live-on-Play, because no Play listing or URL is evidenced in the repo (LAUNCH.md describes closed testing only).
ownerNotes:
  - Licence conflict. The default branch (main) of mbaliga/Clackpad has no LICENSE file. PolyForm Noncommercial 1.0.0 exists only on the branch claude/asystemofcells-redesign-s6yv4c (commit 2ad3b40) and is not merged, so this page says "No licence file" with the proposal in the note. about.astro already says the source is PolyForm Noncommercial. Merge the licence PR, then change this to "Source-available (PolyForm Noncommercial 1.0.0)".
  - gh api could not read LICENSE on the repo (404, private). The licence state was read from the local clone, git ls-tree main.
  - Play URL is not supplied. Provide it, or confirm closed testing, before any install link is shown.
  - Pro price is $4.99 in FEATURES.md and $1 in STATE.md and keyboard.html. No price is stated here. Confirm which is right.
  - The brief's four-tier AI fallback (with an n-gram tier) is not in the repo. FEATURES.md has three routes with Gemini Nano first. Confirm the actual order before it is stated.
  - The brief says AI is all free, but Pro gates translate as you type. The page does not say AI is free.
  - README documents a foss flavour for F-Droid, but app/build.gradle.kts has no productFlavors. No F-Droid support is claimed. README also gives package com.clackpad.ime against xyz.mdhv.clackpad in the build file.
  - docs/privacy.md is stale. It omits INTERNET, RECORD_AUDIO and POST_NOTIFICATIONS, and says AI features transmit no text, which is false when your own endpoint is enabled. Fix it before /privacy/ cites it.
  - Version is 1.2.0 (versionCode 49) in build.gradle.kts, but FEATURES.md, LAUNCH.md and STATE.md give other numbers. No version is stated on this page.
  - No Clackpad images exist in screenshots/manifest.json, so none are used. A device-lane capture is needed. The keycap and tile PNGs in the app are art, and trackpad_row_screengrab.jpg has unknown provenance and should be viewed before use.
  - "Not read for this page: ARCHITECTURE_NOTES.md in full, BRIDGE.md, Kotlin sources, assets/keyboard.html. Haptics, gestures and recovery are owner-verified on a device only."
---
