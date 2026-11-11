---
headline: "Nooz shows only the sources you add, in time order, and draws what came in beside what you opened."
lede: "Nooz is a news reader with no ranking and no push. Every total names your source-set as its denominator, so it never claims to show all the news."
features:
  - title: "Only the sources you add"
    body: "You add feeds by URL, pick from a list of pre-checked starter feeds, or import an OPML file. Every total names its source-set as the denominator."
    status: shipped
    image: nooz.feature-graphic.art
  - title: "The Loom"
    body: "The Loom draws one tube per topic for a day or a date range, so you can see what flowed in against what you read. On Android it opens by pulling down on the Stand. Contrast and Framings views sit beside it, and the web reader has its own Loom view."
    status: shipped
  - title: "Loaded-language marks"
    body: "A lexicon marks loaded verbs, intensifiers, emotive adjectives and editorialising hedges. Each mark shows the category and the entry that fired. The web reader marks the same terms."
    status: shipped
  - title: "Rewrite to neutral wording"
    body: "A rewrite replaces a marked span only when you ask, and you can revert it. A guard rejects any rewrite that adds or drops a number or a named entity, or changes negation. It is built to run through llama.cpp on a model you download, or through your own OpenAI-compatible endpoint. It has not been run on a device in the repo."
    status: partial
  - title: "Dictionary, off until you download it"
    body: "Obscure words are underlined in blue once you download a dictionary in Settings. The catalogue offers Webster's 1913, a public-domain file of about 22 MB, fetched from GitHub. Definitions are looked up on the device. Built, not yet run on a device."
    status: partial
  - title: "Nooz Flash and Nooz Cast"
    body: "Flash compresses the headlines that flowed in today under your standing filter. It ships off, and runs on a downloaded on-device model or at an OpenAI-compatible endpoint you enter yourself. Cast reads an article aloud with a local Kokoro model. Both need a model download and stay off until you turn them on. Built, not yet run on a device."
    status: shipped
  - title: "Clippings"
    body: "A bookmark in the reader saves an article as a clipping. Clippings show as torn-paper cards you can reopen or share. Share also produces a newspaper-headline PNG."
    status: shipped
  - title: "Feeds end"
    body: "Each feed shows an explicit end-of-feed marker. Order is chronological or grouped by source. Any other order is one you pick, and it is labelled with its rule."
    status: shipped
  - title: "Web reader"
    body: "The reader runs in the browser with Stand, Newsstand, Reader, Loom, Clippings, Sources and Settings views. Data sits in IndexedDB. Feeds and articles pass through a proxy on our host because the browser cannot read them directly. It ships 30 interface languages; article text is not translated."
    status: shipped
  - title: "Today in History"
    body: "Off by default. When on, it fetches Wikipedia's on-this-day data once per calendar day, and the setting row names Wikipedia."
    status: shipped
neverHappens:
  - "No push notifications. The Android manifest declares INTERNET and ACCESS_NETWORK_STATE and nothing else."
  - "No analytics, ads or crash-reporting service is declared in the manifest. Crash diagnostics are written to private storage and not transmitted."
  - "Reading history, clippings, filters and settings stay on the device, and there is no account or sign-in."
  - "If you point it at your own AI endpoint, your text goes there and nowhere else."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/nooz"
  note: "The default branch holds a placeholder that says the licence is reserved. A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged."
faq:
  - q: "Does Nooz show all the news?"
    a: "No. It shows what came from the sources you added, and every total names that source-set as its denominator."
  - q: "What leaves the device?"
    a: "Requests to the feeds and articles you chose. The web reader sends them through a proxy on our host, which does not store them, though ordinary host logs may record the address. A dictionary download, model downloads and the Today in History card are the other fetches, and each needs your action or switch."
  - q: "Where is my own endpoint key kept?"
    a: "In the app's private storage, not yet in the Android Keystore. Android device backup is switched on, so the key can enter a backup."
  - q: "Where can I get it?"
    a: "Use the web reader at /nooz/read. The Android app has no public store listing and no GitHub release yet."
hub: false
ownerNotes:
  - "Roster says beta, but no repo file shows a live Play closed beta. Supply a Play link or change the status. Page is written as beta with the web reader as the only install route."
  - "Licence: default branch (claude/app-build-d1f9s6) has LICENSE.RESERVED only; PolyForm Noncommercial 1.0.0 is on claude/asystemofcells-redesign-s6yv4c, unmerged. Merge it, then change licence to the PolyForm line and the repo note. The site's about page already says PolyForm."
  - "Rewrite router may also include Urbana (called a general cloud broker in code) and ML Kit on the full flavour. Confirm whether either is on by default before the carve-out line stands for the rewrite. Flash is limited to local or your own endpoint."
  - "BYOK key sits in plain private prefs and allowBackup is true. The FAQ says so. Fix, then update."
  - "Dictionary host is raw.githubusercontent.com and model catalogue entries point at huggingface.co. Consider naming them in privacy copy."
  - "Dictionary, Flash, Cast and rewrite are device-unverified. The feature graphic is Art, not a screen. Web-lane captures are still to be made."
  - "Accent colour #3A4A5A unconfirmed. Roster install.github points at an empty releases page and should stay hidden."
---
