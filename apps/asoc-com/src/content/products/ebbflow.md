---
headline: "Ebbflow is written to read MW75 Neuro EEG packets and report signal quality. It has not run on a headset."
lede: "Ebbflow is an Android app for the Master and Dynamic MW75 Neuro headphones. It parses the EEG packets on the phone and says whether the signal is clean. It is being built and there is no release yet."
features:
  - title: "Signal quality, not mental state"
    body: "Over a 250-packet window the estimator counts clipped samples, flatlined channels and the share of usable channels. It labels the window GOOD, FAIR or POOR. The screen says it does not estimate focus or mental state."
    status: shipped
  - title: "MW75 capture over Bluetooth"
    body: "A Bluetooth LE handshake switches the headphones into EEG and raw mode. The app then reads 63-byte packets from a Bluetooth Classic RFCOMM channel. The code exists and has never been run against a headset."
    status: partial
  - title: "Packet parsing"
    body: "An incremental parser frames incoming bytes and rejects packets with a bad checksum. It lives in a plain JVM module with no Android dependency and has two unit tests. A passing CI run is not yet confirmed."
    status: partial
  - title: "Local storage of quality summaries"
    body: "Each quality summary goes to a Room table on the phone. It holds quality fractions and a mean, not raw EEG. The diagnostics card shows what was stored and read back."
    status: partial
  - title: "Foreground service while streaming"
    body: "A foreground service of type connectedDevice is meant to keep the stream running with the screen off, with a notification while it runs. It has not been run on a device."
    status: partial
  - title: "Status screen"
    body: "One screen shows connection phase, device name, battery, the quality card, packet error rate and the latest channel values, with Start and Stop buttons. It has not been run with a headset connected."
    status: partial
  - title: "Your own baseline"
    body: "The idea is to compare a session with your own recent history. This is in the plan. Nothing in the code computes a baseline or a deviation yet."
    status: planned
neverHappens:
  - "The app declares no INTERNET permission, so as built it cannot open network connections itself."
  - "Bluetooth scanning is flagged neverForLocation on Android 12 and later. The app finds the headphones by their MW75 name and service UUID."
  - "No analytics, crash-reporting or ads library is in the app's dependencies."
  - "The code has no upload, sync or export path. Only signal-quality summaries are written, and only to a database on the phone."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/ebbflow"
  note: "A change to PolyForm Noncommercial 1.0.0 (source-available, commercial use needs a licence from the maker) is proposed on a branch and not merged. The optional Baseline engine is a separate proprietary adapter and is not in this repository."
faq:
  - q: "Which headphones does it work with?"
    a: "The Master and Dynamic MW75 Neuro. The code matches the device name MW75 and its Bluetooth service UUID. Nothing else is supported."
  - q: "Does it tell me how focused I am?"
    a: "No. It reports whether the signal is clean: how many channels are usable, how many samples clip, how many are flat."
  - q: "Is it ready to install?"
    a: "No. There is no release. The app module has not been confirmed to build against the Android SDK and has not been run with a headset. Watch the repo."
  - q: "What is Baseline?"
    a: "An optional, separate engine that may later supply versioned estimates. Ebbflow does not need it to capture or check signal quality. It is not in this repository."
statusProposal: "Roster says beta. It should be building: no release, tag, Play listing or APK exists, the :app module has not been confirmed to build against the Android SDK, and nothing has run on a headset (docs/session_handoff.md, app/README.md). CTA should be Watch the repo."
ownerNotes:
  - "Merge the LICENSE (PolyForm Noncommercial 1.0.0) from branch claude/asystemofcells-redesign-s6yv4c to the default branch claude/meta-trunk-normalization-2y198w. Until then the default branch has no licence and its README still says 'open'. Update the page's licence line when merged."
  - "AndroidManifest sets android:allowBackup=true, so the Room database can be copied into Google backups. Set it to false or add backup rules before the site says data never leaves the phone. The page deliberately does not say that."
  - "The brief's research-embargo reason for keeping the Baseline engine closed appears nowhere in the repo. The page only says it is separate and proprietary. Confirm whether to state the embargo."
  - "Export and 'your own baseline' are not in the code. Export is omitted; baseline appears once as planned."
  - "No ebbflow images exist in screenshots/manifest.json and the repo has no raster images. The page is feature-led. A Rendered preview of StreamScreen would need @Preview code and sample data, and must not fake an EEG trace. mw75.webp lives in the mw75-streamer repo and is a third-party product image, so it was not used."
  - "Roster accent #3AA6B9 is unconfirmed."
  - "Do not print the applicationId (ai.ebbflow.baseline.app) on the site yet."
---
