---
headline: "Alloy imports a 3D model, slices it on the phone and exports a .gcode.3mf aimed at the Bambu Lab A1 mini."
lede: "It is an Android app, still being built. Print time is not yet at parity with desktop Orca, and sending a job to a printer is switched off."
features:
  - title: "Import, prepare, slice, inspect, export"
    body: "The flow is five steps on the phone. You import a model, edit the recipe, slice, step through the toolpath one layer at a time, then export a .gcode.3mf through the Android file picker. It runs on branches of the repo and has no release yet."
    status: partial
  - title: "STL, OBJ, 3MF and STEP intake"
    body: "Models open from the file picker or the share sheet. STL, named-part OBJ and multi-object 3MF are read in Java. STEP is read only in the native build, through OpenCascade."
    status: partial
  - title: "Offline slicer with a native Orca engine option"
    body: "The default path is a small slicer written for Alloy. It makes perimeters and clipped scanline infill. An opt-in native build embeds Orca libslic3r source with Arachne and TreeSupport3D, and it is not the default."
    status: partial
  - title: "Parts, arrangement and repair"
    body: "Multi-part models open in a Parts view, where you scale, tilt, rotate and place each part. A packing pass arranges parts on the bed. A repair pass removes degenerate facets and welds near-duplicate vertices. Up to eight plates are kept per project."
    status: partial
  - title: "Self-contained project archive"
    body: "A .alloy.zip holds the source models, plate transforms, recipe, workshop inventory and modelling history. A project does not depend on a cloud document grant. A batch export writes one .gcode.3mf per plate."
    status: partial
  - title: "Foreground slicing jobs"
    body: "Single-plate and all-plate slicing run in Android foreground services with saved request snapshots. Rotating the phone or backgrounding the app does not discard the job. An interrupted slice is shown so you can retry it."
    status: partial
  - title: "Bambu profile import"
    body: "You can import your own Bambu machine, process and filament JSON presets, or a project_settings.config export. Alloy resolves the inheritance chain and stores the result privately. You can export the profile or reset to the bundled A1 mini profile."
    status: partial
  - title: "Bambu LAN transport, written and not enabled"
    body: "The code finds printers with a read-only local SSDP scan or a typed address, uploads over FTPS and starts a job over MQTT with TLS. The printer's certificate must be pinned. The repo's own docs say the physical-printer test has not been run, so sending stays off."
    status: partial
  - title: "3D study views"
    body: "A full-screen model view and a machine view show the part on a studio stage or inside the printer. Multi-part assemblies have an Explode toggle that does not change the printable geometry."
    status: partial
    image: alloy.a1-mini-plates.dark.art
  - title: "Direct print from the phone"
    body: "Not yet. There is no one-tap Print action. It is in the plan, behind engine, profile, support, LAN and real-printer checks that have not all passed."
    status: planned
neverHappens:
  - "No job is sent to a printer. Sending is off until the repo's real-printer test has been run."
  - "The network permissions in the manifest are for printer traffic on your local network. Cleartext traffic is off and app backup is off."
  - "Models are copied into a cache private to the app, and slicing runs without a connection."
  - "If you point it at your own AI endpoint, your text goes there and nowhere else. Only a rendered thumbnail and a prompt are sent, and only after you set an HTTPS endpoint."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/Alloy"
  note: "A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged. The app branches carry GNU AGPL-3.0 because they embed engine source, and which one governs the app is undecided."
faq:
  - q: "Can I install it?"
    a: "Not yet. The repo has no releases and there is no store listing. Watching the repo is the sensible action."
  - q: "Can it print for me?"
    a: "No. It exports a .gcode.3mf file. Do not send or print the generated jobs until the repo says the printer gate has passed."
  - q: "Does it match desktop Orca?"
    a: "Not on print time. Against the desktop Orca reference, time differs by 9 to 18 percent across four fixtures, over a 2 percent tolerance. Filament length is within about 2.7 percent."
  - q: "Which printers does it know?"
    a: "The A1 mini is the target. The catalogue also holds the A1 and P1S. Each is marked Not qualified for direct send."
ownerNotes:
  - "Licence: main has no LICENSE file (gh api returns 404). PolyForm Noncommercial and COMMERCIAL-LICENSE.md sit on claude/asystemofcells-redesign-s6yv4c. App branches carry AGPL-3.0. The site's about.astro says PolyForm; decide which governs the app, then update this page."
  - "The brief and roster say 'Slice in the browser now at /prints'. The Alloy repo has no web slicer, so the cross-link is left out. Confirm it exists in the asoc site repo before adding it back."
  - "Features are cited from codex/luna-next-mvp (2026-10-21). Newer branches (codex/a1mini-filament-route-matrix, codex/luna-estimate-breakdown) were not opened. 'Phone-first' tablet and foldable layout is intent only and is left out."
  - "Dependencies on luna are Bouncy Castle only, but the native tree and root Gradle files were not audited, so the page does not say 'no telemetry'. The manifest also queries the Bambu Handy package for a share handoff."
  - "Imagery is presentation art, not captured on device, and the device is not stated. Two Learn illustrations have no rights record, so none are used. Real screens need an owner-run capture."
  - "Repo name case differs: roster says mbaliga/Alloy, the fact sheet says mbaliga/alloy. Both resolve."
---
