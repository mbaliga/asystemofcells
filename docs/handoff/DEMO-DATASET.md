# Demo phone: dataset, personas, store links and online tools

A handoff to take into a fresh chat. You decide the open questions (they are numbered, each with my default); bring the answers back and I build from them. Nothing in here is final, and every name in the draft cast is a proposal to be thrown out.

## 0. What this is for

One dedicated phone, one dedicated account, content made for demonstration only. Every screenshot on the site and in the store listings comes from it. The data has to be complete enough that no screen looks empty, and has to carry the house's ethos: a fondness for biology, animals as faces, bugs (and bug states) as characters.

Rules that already bind (they are in `DEVICE-CAPTURES.md` and the driver prompt):

- "Captured on device" only for an `adb screencap` with a `device` block. Never edit pixels.
- Staged content gets `sample_data: true` in the manifest, and the page may say "Demo data". Nothing invented is passed off as real: no fake Play reviews shown as genuine reviews, no made-up usage numbers, no made-up EEG, no made-up press.
- No private data on the phone at all: no real contacts, mail, files, photos, location history or accounts.
- Images and text on the phone must be ones you can publish: your own, CC0 or public domain, or licensed for it, with the source noted in the seed pack.

## 1. Decisions for you (answer in the other chat)

| # | Question | My default |
|---|---|---|
| D1 | The world of the demo. One shared fiction across every app (a field station, a lab, a herbarium), or a separate light fiction per app? | One shared world: a small **field station**. Contacts, mail, news, files, photos and practice sessions all belong to the same people, so the screenshots read as one life. |
| D2 | Human names with animal avatars, or taxonomic handles as the names themselves (for example "Ctenophore", "Tardigrade")? | Mix. Real-sounding fictional humans for mail and contacts, handles for chat-style surfaces. Every avatar is an animal or organism. |
| D3 | The phone owner: who is the demo user, and what do they do? | A field biologist and amateur woodwind player (so Bocal, Foto, Fylz, Clavis and Crocodyl all fit one person). |
| D4 | Bug states: do you want the demo to show the *software* bug states (an error, an offline banner, a flagged file) as well as insects? | Both, used sparingly: one honest error or empty state per app where the app really has one. Insects as avatars and subjects, not as decoration. |
| D5 | Language. English only, or Clavis and Bocal shot in other languages? | English for all; Clavis also in two of its nine languages. |
| D6 | Light and dark: shoot both for every hero? | Both for heroes, one scheme for feature shots. |
| D7 | iOS: are any of these apps on iOS, or is the App Store badge only for later? | Treat App Store as "not yet" everywhere until you give me a real link. |
| D8 | Desktop: which apps have Windows, Linux or macOS builds today? | None assumed. Give me the list and the URLs. |
| D9 | Beta groups: one shared Google Group for all testers, or one per app? Is there a Play internal-testing opt-in link per app? | One shared testers' group plus a per-app Play opt-in link where one exists. |
| D10 | Which store badge style per app (section 4)? | Official badges everywhere (section 4.3). |
| D11 | Fotoz: what exactly is it? It is not Foto Xplorr, and it is not in the roster. Name, repo, status, one line, accent, platform. | Needs you. I have no facts about it. |
| D12 | Which apps beyond Bocal, Fotoz, Fylz and Nooz get an online tool (section 5)? | I list what I can see and you fill the gaps. |

## 2. The draft world: a field station

Proposal only. Replace freely.

**The demo user:** a field biologist at a small coastal station who plays clarinet in the evenings. Their avatar is a sea slug (nudibranch).

**A draft cast** (fictional; none is a real person):

| Handle / name | Avatar | One-line profile |
|---|---|---|
| The owner | nudibranch | Field biologist, intertidal zone; clarinet; keeps a slow-moving species list |
| Tilda Vesper | tardigrade | Microscopy lab lead; sends too many photographs |
| Okonkwo Reyes | octopus | Station boat captain; mail is all tides and fuel |
| Mei Anand | leafcutter ant | Data manager; spreadsheets, CSVs, exports |
| Prof. Bram Linden | hornbill | Journal editor; formal mail, PDFs, reviews |
| Soraya Idris | firefly | Outreach; schools, talks, posters |
| Jun Takeda | axolotl | Bioacoustics; audio recordings, tuning, pitch |
| Calla Marsh | dragonfly | Photographer; large image folders |
| Dev Mukherjee | pangolin | Sysadmin; logs, archives, config files |
| A mailing list | stag beetle | "Beetle Quarterly" digest |
| A news source | moth | Field notes feed (see Nooz) |

Add or drop to taste. Around a dozen is enough for every app below.

**Bug states (D4), if you want them:** a feed that is offline, a file with a failed checksum, a photo with a missing thumbnail, a flagged archery shot, a mail rule that fired, an unreadable format. One each, each real to the app.

## 3. Per-app seed data

What each app needs on the phone so its screens are full. "Source" says where the content could honestly come from. Items marked **⚠** need a decision from you before anything is built.

| App | What the screens need | Source and caveats |
|---|---|---|
| **Clackpad** | A notes app with a few short, readable notes open under the keyboard; code mode snippets | Write the notes in the station's voice. Light and dark. |
| **Nooz** | A Stand with sources, a Reader with an article open, a Loom with consumption above zero | Sources must be real feeds you can publish or clearly invented ones marked as such. ⚠ Never show a real outlet's articles you have no right to publish. A self-hosted demo feed in the station's voice is safest. |
| **Crocodyl** | A baseline, a session with segments, a flagged shot | Needs a person on camera. ⚠ Your own session or a staged one; no stranger's footage. Archery, not biology: it is the one app where the fiction can stretch ("the station's archery club"). |
| **Fylz** | A believable file tree: PDFs, CSVs, JSON, a ZIP, an APK, fonts, logs, odd formats, plus one interrupted move and one version history | Seed files in the pack, all demo. Include a spread of extensions on purpose: they also dress the extension wall. |
| **Foto Xplorr** | Ten destinations populated: Pets, People, Identity, Screenshots, Photos, Videos, Favourites, Places, Protected, Audio; smart albums with counts | ⚠ People and Identity need faces. The README does not list face recognition as complete. Options: skip those two, or use illustrated or animal faces. Use CC0 organism and animal photographs. Places needs GPS: use a fictional station site, not your home. |
| **Fotoz** | ⚠ Unknown (D11). | Needs your description first. |
| **Bocal** | Tuner with a held note, metronome, tone generator, analysis views, fingering chart; reed and practice logs | Seed a practice history. Recorded audio must be yours. |
| **Runout** | Records, a mixtape, the tonearm tracking | Cover art and audio must be yours or CC0. ⚠ No commercial album covers. |
| **Clavis** | Nine languages in progress, comics, etymology, spaced-repetition due counts | A natural fit: Greek and Latin roots of biology words as the shared content. |
| **You've got Mail** | A believable inbox over a test IMAP account, rules, a search with results | Synthetic mail between the cast. Addresses on `example.com` or `.invalid` only. Never a real address, never a real provider account with real mail. |
| **Brwzr** | The orb, the address bar open, a blocked-trackers count | Pages visited should be ones you may publish (your own site, Wikipedia, field guides). |
| **Picture This** | A scene in the camera with the AI in the loop | A staged subject (a plant, an insect model). |
| **Ping** | Play reviews, GitHub issues, support mail in one console | ⚠ This one invites fabrication. Reviews and issues shown must be real, or visibly marked as sample data. I will not stage fake "customer" reviews as genuine. |
| **Ebbflow** | Deviation view over baselines | ⚠ No real EEG unless it is yours and you will publish it. Synthetic signal must be labelled synthetic. |
| **Liftoff** | Globe home and ring home with real-looking icons | Needs a set of installed apps; use only your own. |
| **Odyssey / Argonautica / Animalcules** | Live wallpapers on a lock screen and home screen | Needs a clean wallpaper-free home layout and the demo icons only. |
| **Globe / Timely** | The watch faces on a wrist or a watch capture | A real watch, or a real watch emulator capture. Not labelled device unless adb. |
| **Alloy** | Online at `/prints`; app screens when they exist | Models must be yours or CC0. |
| **Typewright, Assay, Orrery, Counter, ASOM, Fonebrew, HAfx** | Mostly developer tools: a demo project each, with demo repos | Say which of these you want shot at all (D12). |

Repos and content for the seed pack live in one place: `demo/` (to be created): `demo/people.json` (the cast), `demo/files/`, `demo/photos/` (with `SOURCES.md` listing licence and origin per image), `demo/mail/` (mbox or an import script), `demo/notes/`, `demo/feeds/`, and `demo/README.md` with the load order. A seed pack in the repo makes the phone rebuildable if you wipe it.

## 4. Store badges, beta and tester links

### 4.1 What you asked for

- On every product page: store badges (Get it on Google Play, Download on the App Store) and, where they exist, download links for Windows, Linux and macOS.
- On every product page that has a beta: a **Join the beta** link.
- A quick way to **join the testers' group**: a short `/beta/` page listing every app you can test, with its join link, linked from the footer and from each product page.

### 4.2 How it works (the plan, not yet built)

Extend the roster schema so a link exists only when it is real:

```json
"install": { "play": "...", "appstore": "...", "fdroid": "...", "github": "...", "windows": "...", "linux": "...", "macos": "..." },
"beta":    { "play": "<Play testing opt-in URL>", "testflight": "<TestFlight URL>", "group": "<testers' group URL>" },
"webTool": { "label": "Open the tuner", "href": "/tools/tuner/" }
```

- A badge is drawn only when its URL is present. **No dead badges, ever.** A `building` or `soon` app with no URL shows no store badge (this is already the house rule, `STATUS_MEANING`).
- "Join the beta" appears when `beta.*` is set. `/beta/` is generated from the same field.
- Product pages stay analytics-clean: links and CSS only, no forms or fetches.

### 4.3 The badge styles you attached, and a caution

You sent two directions: a **monochrome outline pill** (black glyph and type, grey keyline, very quiet) and a **soft raised card** (pale grey, colour Play glyph, gentle shadow).

Before choosing (D10), two things I cannot settle for you:

1. **Both stores publish official badge artwork and rules against altering it** (the shape, colours, type, glyph, and clear space). Both attached files are restyled, third-party versions, so putting them on a store link risks being a modified mark. Safest is the **official badge, unmodified**, on whichever background suits the app: it comes in black and white, and the Google and Apple badge generators are the source. I have not re-checked the current wording of either guideline, so please read both before shipping. The pages will also need the attribution line both stores ask for.
2. **The second image looks like stock artwork**, though I cannot tell where it came from. Do not use it without confirming its licence.

If you want the quiet look of the first image anyway, the compliant route is a **text link** ("Google Play", "App Store") styled in the house type, which refers to the store by name rather than imitating its badge. That is a judgement call, and I would rather you made it.

**Vibe mapping, if you want per-app variants** (proposal; D10 overrides):

| Vibe | Treatment | Apps |
|---|---|---|
| Quiet, technical, dark | Official badge, black or white, generous space | Brwzr, Fylz, Assay, Orrery, Counter, ASOM |
| Warm, tactile, object-like | Official badge on a soft ground, with the app's accent | Clackpad, Bocal, Runout, Nooz |
| Ambient, living | Official badge, lower on the page, small | Animalcules, Odyssey, Argonautica, Globe, Timely |

## 5. The online tool attached to each app

You said almost every app has an online companion. What I can see today, and what is yours to fill:

| App | Online tool | State |
|---|---|---|
| **Fylz** | File viewer with minimal editing | **Built** at `/tools/viewer/` (PR #51). Works for pictures, text, JSON, CSV, SVG, archives, fonts, media. |
| **Fotoz** | Photo viewer with minimal editing for some formats | The general viewer already edits pictures (rotate, flip, crop, resize, tone, re-save). A photo-first version, stripped to images and videos, is a small job once D11 is answered. HEIC and camera raw are not decodable without a library (see below). |
| **Bocal** | Online tuner | ⚠ I could not find it in this repo. `bocal.md` describes the Android tuner, and the manifest has one web image. Where does the online tuner live, and is it built? |
| **Nooz** | Online newsreader | A reader page exists at `/nooz/read` (static, under `public/nooz/`). I have not tested it. |
| **Alloy** | Slicer in the browser | Built at `/prints/slicer`. |
| **Hyle Deco** | Type specimen and download | Built at `/hyle-fonts`. |
| Odyssey, HAfx, Globe, Orrery | Web pages exist in the screenshot manifest | I do not know what each tool does. Please describe. |
| Everyone else | ? | D12. |

Decode limits for the viewer, so you can plan around them: HEIC, camera raw, TIFF and PSD show only as a hex dump today. Adding a decoder is a size and licence decision (a lazy-loaded library, 1 to 3 MB or more). PDF on phone browsers without a built-in viewer needs pdf.js. Both were offered in PR #51 and are still open.

## 6. Getting the phone ready (checklist)

1. Factory-fresh profile or a separate user. A dedicated Google account named for the demo, with no real data. Do not sign in to a personal account.
2. Install the cast (`demo/people.json`) as contacts, and load the seed pack in the order `demo/README.md` gives.
3. Demo mode on: Do Not Disturb, notifications off, and Android's demo mode so the status bar is clean (clock 12:00, full battery, full signal; the standard `sysui_demo` broadcasts). Airplane mode off for apps that need network; otherwise on.
4. Wallpaper, icons and fonts at default sizes so shots are consistent. System language English.
5. For each app: open the screen, then `docs/handoff/tools/shoot-device.sh <imagery> "<label>" [hero|feature|gallery]`. Move each PNG into `apps/asoc-com/src/assets/screens/<imagery>/`, set the manifest `src`, `sample_data: true` for staged content, run `node packages/roster/validate.mjs`.
6. Light and dark for heroes (D6). Take the shot list from `DEVICE-CAPTURES.md`, which is the authoritative list of screens (its keys: `clackpad`, `nooz`, `crocodyl`, `fylz`, `fotoz`, `ebbflow`, `sphere`, `animalcules`, `globe`, `timely`). Note that `fotoz` in that file is Foto Xplorr; Fotoz needs its own key once it exists (D11), and `sphere` is now `liftoff`.
7. Review each PNG for stray private data before it enters the repo.

## 7. What comes back to me

Reply with, at minimum:

- D1 to D12 answered (short is fine).
- The Fotoz facts (D11).
- The URLs you have: Play listings and opt-in links, testers' group, any App Store, Windows or Linux downloads.
- The cast, as edited.
- Which apps get a screenshot session, in priority order.

From that I will:

1. Extend the roster schema and validator for `install.*`, `beta.*` and `webTool`.
2. Build the badge row, "Join the beta" and `/beta/` (components and pages, no new frameworks, analytics-clean).
3. Build `demo/` (cast, notes, feeds, scripts that produce files and mail) so you can load it onto the phone.
4. Add a Fotoz cell and page, a photo-first viewer, and any online tool you point me to.
5. Update `DEVICE-CAPTURES.md` with the new keys and the shot list in your priority order.

I cannot do the shooting: there is no device or emulator in my environment. Everything on screen is yours to verify.
