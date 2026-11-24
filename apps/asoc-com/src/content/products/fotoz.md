---
headline: "An Android gallery with a local SQLite catalogue: one row per photo, with tags and flags beside the files."
lede: "Foto Xplorr scans your library from MediaStore into a catalogue on the phone. Favourites, tags, collections and privacy flags are joins against that catalogue, and your photos stay where they are."
features:
  - title: "One catalogue row per asset"
    body: "The library is scanned into a local SQLite catalogue. Favourites, tags, collections, archive and privacy flags are joins against each row, so no view owns a photo. Rescans are incremental from a saved watermark."
    status: shipped
  - title: "Ten destinations, eleven smart albums"
    body: "A left-edge word wheel switches between ten lenses on the same catalogue: Pets, People, Identity, Screenshots, Photos, Videos, Favourites, Places, Protected and Audio. Smart albums cover favourites, recent, videos, screenshots, animated, large files, possible duplicates, sensitive, archived, trash and untagged."
    status: shipped
  - title: "Edge timeline scrubber"
    body: "A strip down the right side of the grid sweeps the whole library. A bubble names the month under your thumb, with a haptic tick at each month boundary."
    status: shipped
  - title: "Sharing strips location and device metadata"
    body: "Clean-share makes temporary copies with EXIF location, device, timestamp, unique-ID and comment fields removed. Video is remuxed. An item that cannot be confirmed clean is not shared as the original."
    status: shipped
  - title: "Password-protected folders, an access gate and not encryption"
    body: "Each protected folder has its own password, checked with salted PBKDF2-HMAC-SHA256. Folders lock when the app stops, and screenshots are blocked while one is open. The files are not encrypted, and other apps with photo access can still read them."
    status: shipped
  - title: "Trash keeps its catalogue row"
    body: "Trashed state is read from MediaStore and stored in the catalogue. On Android 11 and newer, trash, restore and permanent delete go through the system's own confirmation dialog. Older versions decline rather than delete."
    status: shipped
  - title: "Background work follows rules you write"
    body: "Indexing and recognition run under rules you edit: idle, charging, a minimum battery percentage, an active-hours window. The minimum battery defaults to 20 percent. Idle and charging are off until you turn them on."
    status: shipped
  - title: "Two builds: offline and connect"
    body: "The offline build has INTERNET and ACCESS_NETWORK_STATE removed from its merged manifest. Two build tasks fail the build if a network permission or network library reappears. The connect build adds INTERNET for bring-your-own-key AI, a similarity-model download and an online street map."
    status: shipped
  - title: "Places, compass and depth views"
    body: "GPS embedded in a photo is read only after you open Places. The offline build draws a coordinate map with no tile download. The 2.5D depth timeline is experimental."
    status: shipped
  - title: "Metadata backup"
    body: "Collections, tags, archive state, favourites and sensitive flags export to and import from a JSON file. The photos are not included. Imports reject unsupported schemas."
    status: shipped
  - title: "Recognition with bundled models"
    body: "Face detection, labelling and text recognition run on the device through bundled ML Kit models, over assets with a missing or stale result. Face recognition proper is not listed as complete in the README."
    status: partial
  - title: "Remote AI, bring your own key"
    body: "Request shapes for OpenAI, OpenAI-compatible, Anthropic and Gemini endpoints are written, in the connect build only. Providers are off until you enable them one by one. It has not been checked against every provider."
    status: partial
neverHappens:
  - "The offline build cannot reach a network. Its merged manifest removes INTERNET and ACCESS_NETWORK_STATE, and the build fails if either comes back."
  - "Only the connect build can go online, and only for bring-your-own-key AI, a model download and a street map. AI providers are off until you enable each one."
  - "Remote AI providers are off until you enable each one, in the connect build only."
  - "Android's cloud backup of app data is switched off (allowBackup is false)."
openSource:
  isOpen: false
  licence: "Source-available (PolyForm Noncommercial 1.0.0)"
  repo: "mbaliga/Foto-Xplorr"
  note: "Free to read and to use for noncommercial purposes. Commercial use needs a licence from the maker."
faq:
  - q: "Does Foto Xplorr need an internet connection?"
    a: "The offline build cannot use one. The connect build declares INTERNET for bring-your-own-key AI, a similarity-model download and an online street map."
  - q: "Where is my photo data stored?"
    a: "Your photos stay where they are. Foto Xplorr keeps a local SQLite catalogue with tags, collections, favourites, archive state and privacy flags. Those can be exported, without the photos, to a JSON file."
  - q: "Are password-protected folders encrypted?"
    a: "No. The password is an access gate inside the app. The files are not encrypted or moved, so other apps with photo access can still read them."
  - q: "Where can I install it?"
    a: "Nowhere yet. There is no store listing and no GitHub release. The repository is public, and a workflow exists that can publish an APK release when it is run with a tag."
statusProposal: "Roster status 'building' matches the facts: public repo, no releases, versionName 0.3.0-ai-spatial, no store listing."
ownerNotes:
  - "Brief claim 'ML only on charger by default' is not published. Code defaults requireCharging and requireIdle to false."
  - "Brief claim 'archived hidden everywhere but Archived' is not published. Archived items stay visible in collections and tag views."
  - "Verdict could not confirm the 20 percent battery default constant by opening it; the fact sheet cites DEFAULT_MIN_BATTERY_PERCENT=20. Please confirm."
  - "The editor, audio library, sticker lift and key-moments code exist but are not in the README and were not device-checked. Audio is on the destination wheel, so the destinations feature names it. Confirm whether to feature any of these."
  - "No screenshots exist for this product; the manifest has no fotoz entries. The page is feature-led until device captures are made."
  - "Roster accent is flagged 'accent placeholder'."
  - "Minimum tested Android is 31 per a manifest note, though minSdk is 26. No Android version support is claimed on the page."
  - "No audit for analytics code beyond grep; the page claims only what the manifests show."
---
