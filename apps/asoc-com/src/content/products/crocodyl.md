---
headline: Crocodyl builds a baseline from your own archery shots and scores each later shot against it.
lede: The phone camera films your session and a pose model on the phone turns each shot into joint angles and timings. Pose and shot detection have not been validated at a range.
features:
  - title: A baseline from your own shots
    body: The engine builds its baseline from your shots, not from a textbook archer. It scores every later shot as a deviation from that baseline. The code exists, but pose metrics and shot segmentation are not yet validated at a range.
    status: partial
  - title: Pose model bundled in the app
    body: The pose model file ships inside the APK, so there is no first-run download. Camera frames are analysed and released, and the analysis saves no imagery. It has been started on an emulator, not on a phone.
    status: shipped
  - title: Fatigue and score correlation
    body: The engine tracks how form decays across a session and correlates form signals with the score you shot. The code exists. No range validation is recorded.
    status: partial
  - title: Scoring, plotting and End Scan proposals
    body: You can score rounds by hand and plot arrows on a target face. End Scan proposes impacts from a target photo and you confirm or correct each one. Its constants are geometry-derived defaults, not yet tested on range photographs.
    status: partial
  - title: Rig and tuning calculator
    body: "A rig records poundage and tuning: brace, tiller, plunger, stabiliser and arrow spec. The app computes FOC and GPP and warns when a value looks out of range. Individual arrows, wear and tuning history are not built."
    status: shipped
  - title: Body, wellness and load
    body: A 52-region body atlas logs soreness and injuries. Check-ins feed load, ACWR, streak and readiness calculations, and you can track physio plans. The recovery and pain guidance has not had clinical review.
    status: shipped
  - title: Optional coach with your own key
    body: The coach runs fixed task types, not open chat. An offline rule-based coach needs nothing. A cloud coach (Anthropic, OpenAI, Google or DeepSeek) runs only after you enter your own key. An on-device model works if you import the model file yourself; guided download is not built.
    status: shipped
  - title: Encrypted document vault
    body: Documents are stored encrypted at rest with a Tink streaming AEAD. The key is wrapped by the Android Keystore.
    status: shipped
  - title: Signed export and backup
    body: You can export a signed .croc file or a .crocbak backup through the share sheet or the file picker. A consent filter decides which tables go out. Exports are signed, not encrypted, so anyone who holds the file can read it. Import preview exists, but the exchange flow has run on emulators only.
    status: partial
  - title: Fencing, Muay Thai and bouldering journals
    body: Beside archery there is a manual two-fencer referee console and separate training journals for Muay Thai and bouldering. They record what you enter and make no camera-coaching claims.
    status: shipped
  - title: Offline equipment viewer
    body: A local WebGL viewer shows generic 3D models of a recurve, an arrow and a target. It loads no CDN or retailer assets. The models are unapproved generic studies, not a real product. The image is a render of a study, not the app screen.
    status: shipped
    image: crocodyl.recurve-light.art
neverHappens:
  - The app declares no analytics or crash-reporting library. The build excludes the MediaPipe usage-statistics client.
  - Camera frames, video, photos and documents are never sent anywhere. Raw video is off by default.
  - With no coach key entered, the app makes no network request.
  - If you add your own coach key, a redacted summary of facts goes to that provider and nowhere else.
openSource:
  isOpen: false
  licence: No licence file
  repo: mbaliga/Form-analyser
  note: The source is public to read. No licence has been granted yet, so all rights are reserved.
faq:
  - q: Does it send my camera footage anywhere, or need the internet?
    a: "No footage leaves the phone. Pose estimation runs on the phone with a model bundled in the app, so form analysis works offline. Raw video is off by default; if you switch it on, clips are written without sound to app-private storage. The app declares the network permission, and only the optional cloud coach uses it, after you enter your own key."
  - q: Do I need a sensor on the bow or a watch?
    a: No. Form analysis uses the phone camera only. Watch and bow-sensor support is not built.
  - q: Where do I get it?
    a: GitHub releases has one test build, v0.5.1 from August 2026, signed with a test key. Play and F-Droid are not available. The code on main is a release candidate that has not been released.
  - q: Is it a medical or coaching-grade tool?
    a: No. The recovery, pain and injury guidance has not had clinical review, and the project does not describe Crocodyl as a medical device.
statusProposal: "Roster says beta. The facts support pre-release (QA candidate, production release not approved, emulator-only, only a debug-signed August build published). Page is written as beta with that caveat; change to building if the August test build should not count as a beta."
ownerNotes:
  - Licence conflict. main has no LICENSE file and LICENSING.md says none is granted. about.astro and the FAQ say PolyForm Noncommercial; the stale local clone still carries that file. Decide and align the site.
  - fastlane full_description.txt says "see the repository licence" and "Free to install and use". Neither is supported while no licence exists.
  - Roster repo casing and name (Form-analyser) are right; the roster verify note "main is a stub" is false, main has the full app.
  - Hero art is a render of unapproved generic studies, not the app UI. The target sheet has an open correction, so the target render is not used.
  - Play listing, F-Droid and IzzyOnDroid do not exist; the install chooser should show GitHub only.
  - Privacy policy is a working copy with OWNER placeholders and no confirmed hosted URL; not linked.
  - Sheet's accent colour and the Baseline licensing (Community AGPL vs Advanced private) are unconfirmed; page says only that Baseline is separate.
---

Crocodyl is pre-release. The current code is a QA release candidate whose production release is not approved. It has run on emulators only and has not been tested on a physical phone or at a range.

Archery comes first. The engine is sport-neutral, which is why the app also holds manual journals for fencing, Muay Thai and bouldering.

Baseline, the EEG and bow-sensor add-on, is a separate product and is not in this repo.
