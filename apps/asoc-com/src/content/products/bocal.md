---
headline: "Bocal tunes, keeps time and analyses recordings on the device, for saxophone and other woodwinds."
lede: "Bocal is a practice app with a tuner, a metronome, a tone generator, analysis views and fingering charts. The Android app declares no network permission. It is a release candidate and is not published yet."
features:
  - title: "Chromatic tuner"
    body: "The tuner reads pitch from the microphone. You set the reference pitch, temperament, sensitivity, damping and precision. You can lock a target note and read cents against it, in written or concert pitch."
    status: shipped
    image: bocal.tuner.phone.dark
  - title: "Metronome and drills"
    body: "The metronome has count-ins, tempo ramps, polyrhythm, a gap drill (N bars on, M bars silent) and seeded random beat drops. It shares one lookahead scheduler with the tone generator."
    status: shipped
  - title: "Tone generator and exercise library"
    body: "The tone generator plays drone and reference tones. It also runs saved exercises: scales, modes, arpeggios, chromatic runs, harmonic series and interval leaps. Exercises transpose from written to concert pitch and export and import as files."
    status: shipped
  - title: "Analysis views"
    body: "Analyze shows waveform, spectrum, harmonics and a log-frequency spectrogram from one analyser. A saved take can be overlaid on a second take, aligned by start or by first voiced sound."
    status: shipped
  - title: "Local recording and takes"
    body: "A take is recorded only when you press Record, and it is stored in IndexedDB inside the app. A write counts as saved only after its transaction commits, and takes are never evicted automatically. The library holds 12 takes, a recording stops at 10 minutes and an import is capped at 32 MiB."
    status: shipped
  - title: "Transcription export"
    body: "A transcription exports as a Standard MIDI File or MusicXML on a fixed tempo grid. Bocal has no beat detector, and the docs say so."
    status: shipped
  - title: "Practice log and weekly goal"
    body: "The practice tab lists logged sessions from each tool, with rename and delete, a weekly goal ring and exportable history. History is stored on the device."
    status: shipped
  - title: "Fingering trainer with two 3D models"
    body: "An alto saxophone model and a Howarth S20C oboe model are bundled under CC BY 4.0. Tenor, soprano and baritone saxophone use the alto model, and cor anglais uses the oboe model. The Look panel restyles parts of each model."
    status: shipped
    image: bocal.oboe.art
  - title: "2D charts for flute, clarinet and bassoon"
    body: "These three have 2D fingering charts and the shared audio tools, with no 3D model. The flute chart covers C4 to C7 and the bassoon chart stops at G sharp 4. The fingerings are educational and have not been checked by a specialist."
    status: partial
    image: bocal.flute.art
  - title: "Guitar string tuner and chord diagrams"
    body: "The guitar profile has a string tuner, chord diagrams and a follow player. It has no 3D instrument lab."
    status: shipped
  - title: "Android host"
    body: "The Android app is a WebView around the same web bundle, served from a local https asset origin so the microphone works. It checks the installed WebView against a Chrome 69 floor and shows a native update screen below it. A native bridge handles theme, keep-awake, Save As and external links."
    status: shipped
  - title: "Microphone released in the background"
    body: "On pause the Android host pauses the WebView and sends a host-pause event so the web app releases the microphone. Returning to the app never restarts audio on its own."
    status: shipped
neverHappens:
  - "The Android app declares no network permission, so it cannot send anything off the phone. Its manifest asks for the microphone and vibration only."
  - "A recording is made only when you press Record. It stays in the app's private storage and leaves only when you export it with Save As."
  - "The Android app releases the microphone when you leave it and does not start listening again until you do."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/Bocal"
  note: "A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. The bundled saxophone and oboe models carry their own CC BY 4.0 terms."
faq:
  - q: "Is it on Google Play?"
    a: "Not yet. The repo is at release candidate 1.0.0-rc.1 and has no published release. The source is on GitHub, and watching the repo is the way to hear when that changes."
  - q: "Which instruments does it cover?"
    a: "Ten profiles. Alto sax and oboe have 3D models. Tenor, soprano and baritone sax and cor anglais borrow one of those. Flute, clarinet and bassoon have 2D charts, and guitar has a string tuner and chord diagrams."
  - q: "Are the fingerings checked by a teacher?"
    a: "No. The repo says fingerings still need specialist review and calls them educational tools. Physical-device audio, latency and accessibility testing are also open, so no accuracy claim is made for the microphone."
  - q: "What happens to my recordings?"
    a: "They stay in the app's private storage on your device until you export one with Save As or uninstall the app."
ownerNotes:
  - "Licence: the default branch (main) has no LICENSE file. PolyForm Noncommercial 1.0.0 exists only on claude/asystemofcells-redesign-s6yv4c (commit 3a8a63c). Merge it, then change licence to the PolyForm line and add 'Source-available' wording; isOpen stays false either way."
  - "Every feature was read from the redesign branch clone, not from main. Confirm the wave-2 work (analysis overlay, exercise library, practice log) is on main before publishing."
  - "The roster one-liner says 'No account'. That is store copy and policy, not checked in code, so the page does not repeat it. The 'no network permission' claim is limited to the Android manifest. The hosted web build (Cloudflare worker) was not audited."
  - "Image bocal.tuner.phone.dark is labelled as the web prototype; keep the 'Web' label on the page. Art images (alto, oboe, flute): provenance of creation is unstated in the repo, so captions must not call them photographs. Third-party 3D model licence for promotional use is unconfirmed."
  - "Confirm whether asystemofcells.com/bocal/privacy exists; the policy names it but it was not fetched."
  - "No logotype file exists in the Bocal repo, though the manifest lists bocal.logotype.art. Check where it came from."
---
