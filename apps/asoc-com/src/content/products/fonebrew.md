---
headline: Fonebrew runs models on the phone and commits only the repo changes you approve, hunk by hunk.
lede: Fonebrew is an Android app for working with language models on the device. This page is the short version.
features: []
neverHappens:
  - It has no analytics or telemetry. The project rules forbid it.
  - On-device models are the default. Cloud providers are opt-in per use and each one is marked as watched.
  - Crash reports are shared only when you press Share report. Nothing is sent automatically.
  - If you point it at your own AI endpoint, your text goes there and nowhere else.
openSource:
  isOpen: false
  licence: Apache-2.0
  repo: mbaliga/android-ide-core
  note: The repo marks the licence decision as pending. A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. The paid Studio layer and the Aarso lens are in separate private repos.
faq:
  - q: Can I install it?
    a: There are no releases or tags yet. Debug-signed APKs sit on the apk-dist branch of the repo, and device behaviour is verified by the maker only.
  - q: Which phones does it target?
    a: A recent arm64-v8a phone with Android 12 or later and plenty of RAM. Other phones are not claimed.
hub: true
statusProposal: Roster status "beta" is not contradicted, but no release, tag, store listing or fastlane metadata exists. Only debug-signed APKs on apk-dist. Consider "building" if "beta" implies a release channel.
ownerNotes:
  - Licence is unsettled. Default branch main has an Apache-2.0 LICENSE but its own docs/non_ratified/LICENSE_PENDING.md says undecided. The local redesign branch has PolyForm Noncommercial 1.0.0 and about.astro says source-available, not open. isOpen is false until you decide. Update licence, isOpen and the note when you do.
  - The brief's "core Apache-2.0" and "Studio going open" are not evidenced in the repo and are left out. Confirm before any "open" claim about Studio.
  - The brief's "the tool this house was built with" is not evidenced in the repo and is left out.
  - fonebrew.app appears in the roster as hubUrl but no repo file mentions it. Confirm it is live.
  - Manifest lists INTERNET, ACCESS_NETWORK_STATE, RECORD_AUDIO, FOREGROUND_SERVICE and FOREGROUND_SERVICE_DATA_SYNC in both builds. The sideload build adds more. The "no telemetry" line rests on the repo rules and data-safety doc, not a dependency scan.
  - The watch module has no network permission but depends on Google Play services for pairing. Not claimed on this page.
  - No fonebrew imagery exists in screenshots/manifest.json, so no image is used. Brand PNGs in the repo are under TRADEMARKS.md, not the code licence.
  - Local clone is 160 commits behind main; facts came from main via gh.
---
