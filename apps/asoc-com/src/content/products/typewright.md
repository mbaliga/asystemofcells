---
headline: "Typewright is a font tool in progress. It traces hand-made letterforms and fits them to a node budget."
lede: "No one can yet make a font end to end with it. The trace engine, the node data and the lessons exist. The screens that connect them do not."
features:
  - title: "Learn: lineages and craft"
    body: "Eleven lineage scenes cover blackletter, garalde, transitional, didone, slab, grotesque, art deco, geometric, humanist, neogrotesque and a vocabulary set. Four craft scenes and an identify-it bank sit beside them. It uses seventeen bundled example faces, sixteen under OFL-1.1 and Roboto Slab under Apache-2.0."
    status: shipped
  - title: "Raster-to-outline trace chain"
    body: "The engine runs adaptive threshold, despeckle, hole fill, connected components, distance transform and marching squares on a raster. It is a pure-JVM module. The app has no import or capture screen yet, so you cannot feed it a scan from the UI."
    status: partial
  - title: "Node economy"
    body: "A data pack holds the min, Q1, median, Q3 and max point counts of Google Fonts families, grouped by style class. Latin has ten classes, Devanagari three and kana four. Most Latin classes hold 30 families; didone and blackletter hold 15, art deco 8. A layer-two check reads the pack. No screen plots your glyph against it yet."
    status: partial
  - title: "Fitting to a target node count"
    body: "The fitter reduces traced outlines toward the point counts of the Hyle Deco redraw. For the letter o that target is 16 on-curve and 16 off-curve points. A test prints the fitter's output but does not yet assert that it meets the targets."
    status: partial
  - title: "Draw and Space on one sheet"
    body: "The sheet has a round thumb puck with a gesture machine, a camera, guide, grid and metrics layers, and a command palette. The README names Draw and Space as working. It has been exercised through a headless desktop screenshot harness, and on-device behaviour is for the owner to confirm."
    status: partial
  - title: "Plain-file projects"
    body: "A project is a directory of UFO 3 and JSON, so FontForge, Glyphs and RoboFont can open the files. Approved glyphs are locked until you unlock them. The engine half is written. The project-open screen is not built."
    status: partial
  - title: "Devanagari, kana and Arabic"
    body: "Metrics, inventories and capture templates exist for these scripts. Version one is Latin only, and the other scripts are marked Preview. No code or data exists yet for Thai, Khmer, Burmese or other South East Asian scripts."
    status: partial
  - title: "Compile to TTF and ship to a Google Fonts folder"
    body: "Compile is meant to run fontmake. Both the desktop and Android backends are stubs today. Ship is not built. Both are in the plan."
    status: planned
neverHappens:
  - "The Android manifest declares no permissions at all: no internet, no camera, no storage."
  - "No telemetry, analytics or phoning home. The web build loads its own bundled resources. The only code written to reach a remote host is a stub hosted-build transport with no live endpoint."
  - "Fonts you make are yours. Typewright claims nothing over its output."
openSource:
  isOpen: false
  licence: "Source-available (the app is FSL-1.1-ALv2, becoming Apache-2.0 two years after each release; the engine is Apache-2.0)"
  repo: "mbaliga/typewright"
  note: "The engine is Apache-2.0, the template sheets and data packs are CC0-1.0, and bundled fonts keep their own licences. Nothing is closed. The name is a working name and clearance is in progress."
faq:
  - q: "Can I make a font with it today?"
    a: "No. The README says the interface has no import, save, capture or compile path yet. The engine pieces exist and are tested on their own."
  - q: "Which scripts will it support?"
    a: "Version one is Latin end to end. Devanagari, kana and Arabic have data and templates and are marked Preview. Other scripts are not started."
  - q: "Is it on Google Play?"
    a: "No release has been confirmed. The repo is the only place to follow it."
statusProposal: "Roster status 'building' is supported by the facts. No change proposed."
ownerNotes:
  - "The GitHub API returned 403 for the fact sheet, so releases and remote branches were not read. Confirm there are no releases."
  - "The licence was read from the local clone at /home/user/mbaliga/typewright/LICENSE on main, not from the default branch over the API."
  - "The roster one-liner and brief say 'Google Fonts-quality font' and 'arc nav'. Neither is evidenced, so neither is used. The section arc is not in the code."
  - "The site FAQ and about page describe PolyForm Noncommercial. Typewright is FSL-1.1-ALv2 for the app and Apache-2.0 for the engine. The licence FAQ may need a sentence for this."
  - "No images exist for the typewright imagery key in the manifest, so the page is feature-led. A capture of ui/typewright-explorer.html would be a Web or Render lane image, not an app screenshot."
  - "Confirm on a device that Draw and Space work before the 'partial' label is raised."
  - "Name clearance is pending. No trademark symbol is used."
---
