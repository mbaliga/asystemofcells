---
headline: "Runout is a turntable for your phone. The disc is the playback position, and dragging it sets the playback rate."
lede: "Audio time lives in the audio engine, and the needle radius shows it. There is no progress bar. Runout is a pre-release, and the Android build is a debug APK."
features:
  - title: "The disc is the playback position"
    body: "The platter's angular velocity, set against the mastered RPM, is the playback rate. The needle radius is a display of where the audio is. Pure functions in the model are covered by automated tests."
    status: shipped
  - title: "Scrub, including backwards"
    body: "Dragging the disc sets platter speed from finger velocity. The audio reads at a fractional, zero or negative rate, so it plays backwards. On release the motor winds back up to speed. This has been checked in desktop Chromium; how it feels on a phone is not yet confirmed."
    status: shipped
  - title: "Speed dial with coupled pitch and tempo"
    body: "33, 45 and 78 set the motor target. Pitch and tempo move together, with no time-stretch, so 45 plays faster and higher than 33."
    status: shipped
  - title: "Palm brake, flick and four feel knobs"
    body: "Holding the brake pad or the spacebar bends pitch down to a stop. A quick drag and release coasts out on friction. Inertia, motor, friction and brake damping are sliders."
    status: shipped
  - title: "Silent seek with the tonearm"
    body: "Dragging from the outer edge lifts the arm, and a ghost ring shows where it will land. Dropping in a gap between bands starts the next track. The needle plays synthesised lift and drop sounds. Thresholds are untuned on a phone."
    status: shipped
  - title: "Albums are records and CDs"
    body: "The library groups tracks into albums. A folder or album labelled CD1, Disc 2 or similar is a CD. Everything else is a vinyl, shown as a sleeve with a record peeking out, with one band per track."
    status: shipped
  - title: "A separate CD player view"
    body: "A CD replaces the platter with a drawn disc. It has a ring with one arc per track and a progress ring for seeking. Audio runs at rate 1 or 0, with no scrub and no pitch bend, and the next track starts on its own."
    status: shipped
  - title: "Mixtapes as cassettes"
    body: "A mixtape is a named, ordered playlist with one of eight drawn cassette shells, a font and a font colour. It exports and imports as JSON. The next track is decoded ahead and crossfaded in. Device decode time and memory are unchecked."
    status: shipped
  - title: "Tag reading and a library that survives restarts"
    body: "A parser with no dependencies reads ID3v2, Vorbis comments and MP4 tags for title, artist, album, track and disc numbers. Scanned metadata is saved in IndexedDB, without audio and without cover art. Restored tracks show 'needs re-link' until you pick the folder again."
    status: shipped
  - title: "Radio from the radio-browser.info directory"
    body: "A Radio tab lists public stations and plays them through an audio element. Favourites and recents are stored on the phone with a snapshot, so they work when the directory is down. A dropped stream reconnects up to four times. Codecs in the Android WebView are unchecked."
    status: shipped
  - title: "Custom theme from pasted JSON"
    body: "Settings accepts a JSON theme with eight colour keys for light and for dark. It shows your pasted text back and applies it only when you press Apply. Errors name the field that failed."
    status: shipped
  - title: "A synthesised test pressing"
    body: "The app opens on a 24-second generated track with a quiet, loud and breakdown arc, so there is something to scrub. No copyrighted audio is bundled."
    status: shipped
  - title: "Groove banding from the music's envelope"
    body: "The groove is drawn once, with banding from the loudness envelope, so loud sections show before the needle reaches them. This works on the test pressing. It is not yet checked for imported files."
    status: partial
  - title: "Atmosphere bus and worn surfaces"
    body: "A play counter and a dust haze on the record exist. The audio bus of crackle, rain and tape warmth is in the plan, and not built."
    status: planned
neverHappens:
  - "No analytics, ads, accounts or tracking libraries. The only dependencies are the Capacitor packages."
  - "Your audio files are decoded on the phone and are not uploaded."
  - "The Radio tab makes no request until you first open it. Opening it asks radio-browser.info for stations, and playing one connects to that station's host."
  - "Your library, mixtapes and favourites are stored on the phone."
openSource:
  isOpen: false
  licence: "Source-available (PolyForm Noncommercial 1.0.0)"
  repo: "mbaliga/Music_Player"
  note: "The whole repository is readable. Commercial use needs a licence from the maker."
faq:
  - q: "Can I install it?"
    a: "Only as a debug-signed APK from the pre-release on GitHub, for sideloading. There is no Play or F-Droid listing."
  - q: "Is it a native app?"
    a: "No. The Android app is a web build in a WebView, and a native audio engine is in the plan, only if the web path misses the latency target."
  - q: "What is the latency?"
    a: "Under thirty milliseconds of delay on scrubbing is the target. It has not been measured on a phone."
  - q: "Does it work on other platforms?"
    a: "Not yet. A porting plan exists, and nothing in it is built."
hub: false
statusProposal: "Roster status 'soon' is supported by the facts. Only a rolling debug pre-release exists (v0-latest), gated on a hardware feel-test."
ownerNotes:
  - "Roster says 'private repo'. The repo mbaliga/Music_Player is public. Correct the roster verify note."
  - "No Runout images exist in screenshots/manifest.json, so none are used. Lane W (web build via Playwright) or lane D (device) is needed."
  - "No AndroidManifest.xml is committed, so permissions are unverified. Radio needs INTERNET. docs/store/privacy-policy.md and the fastlane copy say 'nothing leaves your device' and deny playlists and streaming. Both are stale and need rewriting before any store listing."
  - "The local clone at /home/user/Music_Player is a stale v0 snapshot. The facts come from origin main."
  - "The direct APK URL returned 401 anonymously here. Link the release page https://github.com/mbaliga/Music_Player/releases/tag/v0-latest."
  - "Everything past the basic scrub instrument is verified in desktop Chromium only, not on the RedMagic."
  - "Cell type: roster says ambient-cells, but Runout is an instrument you hold. Your call."
  - "README line 121 still says a CD reuses the vinyl platter. It is stale."
---
