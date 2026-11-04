---
headline: Four Figma plugins share one core, and today each opens an empty panel.
lede: The suite is a workspace of Watchface Exporter, Play Publisher, Haptics and DeskPets. The shared core exists. The plugins themselves are not built yet.
features:
  - title: Shared plugin core
    body: One internal package holds a typed message bus between Figma's main thread and the plugin panel, async-only scene helpers, an export helper over exportAsync, a manifest factory and a UI kit in the Hyle design system. It has unit tests and is never published on its own.
    status: shipped
  - title: Async-only build gate
    body: The build bundles each plugin into a manifest, a code file and one inlined panel page. It scans the source first and refuses to build if a synchronous scene call such as getNodeById is present.
    status: shipped
  - title: Licence key check for paid plugins
    body: A Lemon Squeezy licence library (activate, validate, deactivate through a CORS proxy, with a seven-day offline grace window kept in figma.clientStorage) exists in the shared core with unit tests. Neither paid plugin uses it yet.
    status: partial
  - title: The four plugins
    body: Watchface Exporter and Play Publisher are meant to be paid, by licence key. Haptics and DeskPets are meant to be free. Each panel today shows a title, a status badge and a Close button, and the features are in the plan, not in the code.
    status: planned
neverHappens:
  - The two free plugins, Haptics and DeskPets, declare no network domains in their build files.
  - The two paid plugins declare one domain, Lemon Squeezy, for licence checks. No licence call is wired into either yet.
  - No analytics, telemetry or ad code was found in the suite. The only network code is the licence library.
  - Settings stay in figma.clientStorage on your own machine, which Figma does not sync.
openSource:
  isOpen: false
  licence: No licence file
  repo: mbaliga/asystemofcells-figma
  note: A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. The repository is private for now.
faq:
  - q: Can I install these plugins?
    a: No. There is no release, no tag and no Figma Community listing. Watching the repository is the only sensible action for now.
  - q: Will the suite cost anything?
    a: The plan is two free plugins and two sold by licence key. Prices are not decided. Purchase would happen on an external Lemon Squeezy page, never inside a plugin.
statusProposal: Roster status stays soon in the fact sheet's reading, but the facts support building (four scaffolds, shared core with tests, zero releases). The 03_WING_APPS brief says live, which the repo does not support. Page written for building; the hero CTA should be Watch the repo only once the repo is public.
ownerNotes:
  - Confirm no plugin is published on Figma Community. None was found in the repo or branches, so no store link is shown.
  - The repo is private. The Watch the repo CTA and the repo link need it to be public.
  - LICENSE (PolyForm Noncommercial 1.0.0) and COMMERCIAL-LICENSE.md exist only on branch claude/asystemofcells-redesign-s6yv4c (PR #5). Merge it, or change the licence line here.
  - Reconcile the name. The roster one-liner omits Haptics, and the brief calls it a haptics connector. The repo calls it Haptics, an authoring timeline per an unmerged draft listing.
  - Plugin descriptions are drawn from draft store listings on an unmerged branch (PR #2) that say they were written ahead of the build. They are worded here as plans.
  - Pricing for Watchface Exporter and Play Publisher is undecided.
  - Roster accent #F2545B is red. It must carry no meaning without a shape or label.
  - No images exist for this product and the manifest has none. Capture plugin panels only once they show more than a badge.
---
Every plugin here is a scaffold. Each one shows a title, a status badge and a Close button. That is all.

The plan, in one line each. Watchface Exporter reads a frame and exports the layers a watch face format needs. Play Publisher fills a Trusted Web Activity template with a web app's name and brand assets. Haptics places haptic events on a timeline with intensity and sharpness. DeskPets puts a small walking creature on the canvas.

None of that code exists yet. This page will change when it does.

Read the [privacy policy](/privacy/) for what the house collects.
