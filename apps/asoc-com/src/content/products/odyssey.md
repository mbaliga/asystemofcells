---
headline: "Odyssey draws Odysseus's ship, the raft and the Strait in native Canvas code on your home screen."
lede: "A live wallpaper of the voyage, with twelve chapters of the poem, a sun and moon placed from your clock, and an optional weather lookup. It is not on a store yet."
features:
  - title: "Twelve chapters"
    body: "Each chapter sets the waters, vessel, weather, hour and wind in one tap. The set runs from the fleet leaving for Troy to Ithaca. The settings screen shows a thumbnail of each."
    status: shipped
    image: odyssey.trireme.phone.dark
  - title: "Voyage mode"
    body: "Voyage mode moves the wallpaper on to the next chapter once an hour or a day has passed. The check runs when the wallpaper becomes visible, so the change lands between glances at the phone. It is off by default."
    status: shipped
  - title: "Six scene modes"
    body: "Open sea, islands, the fleet, Aiaia, the Strait and a landfall camp. Aiaia carries hearth smoke. The Strait sets Scylla's cliff and cave beside the ship and Charybdis's whirlpool in the water."
    status: shipped
  - title: "Two vessels, three cameras"
    body: "The vessel is a ship or Calypso's raft, with Odysseus at the steering oar. Views are deck, aloft and helm."
    status: shipped
  - title: "A sea drawn from a wave function"
    body: "The sea uses the same Gerstner wave function as the HTML spec it was ported from, including the whirlpool term. The ship rides it with spring and damper heave, pitch and roll. The wave maths is tested against reference values taken from that spec."
    status: shipped
  - title: "Sun and moon from the clock"
    body: "Sun and moon positions come from the device clock and your location. Without the location permission, coordinates you type in drive the sun, the moon and the forecast."
    status: shipped
  - title: "Optional live weather"
    body: "Off by default, with procedural weather instead. When you turn it on, the app sends approximate latitude and longitude to Open-Meteo for cloud cover, rain, wind and weather code."
    status: shipped
  - title: "Reactive weather"
    body: "A reactive setting offers one driver at a time: off, battery or signal. On battery, a draining charge builds Poseidon's storm. On signal, a lost connection rolls in a fog bank. It is off by default."
    status: shipped
  - title: "Synthesised sound"
    body: "Sea, wind, rain, thunder, timber creaks, gulls and the Strait's drum and siren notes are generated as audio in code. Sound is off by default."
    status: shipped
  - title: "The Story screen"
    body: "Every chapter is told in full with background notes, and a glossary of ship's parts and a crew primer. Quotations are adapted from Samuel Butler's 1900 translation."
    status: shipped
  - title: "Ships and Crew museum"
    body: "A viewer with touch orbit and pinch zoom shows the ship, the raft and crew figures with animated oars. Eight unit models and one temple are adapted from 0 A.D. under CC BY-SA 3.0."
    status: shipped
  - title: "Render and battery controls"
    body: "Quality tiers are High, Balanced and Battery. Animation is continuous or battery saver. Camera drift, sound and captions can each be turned off. You can pin the hour, weather and wind, or leave them on Auto."
    status: shipped
  - title: "Water shader"
    body: "A GL-rendered sea composited into the Canvas pass is in the plan as an optional later step. Nothing of it exists yet."
    status: planned
neverHappens:
  - "A fresh install makes no network requests. Live weather is off until you turn it on."
  - "When live weather is on, approximate coordinates go to Open-Meteo, a third party, and nowhere else."
  - "No analytics, ads or crash-reporting library is in the app. Its only dependency is androidx.core-ktx."
  - "Backup is switched off in the manifest. Your settings stay in the app's private storage until you uninstall."
openSource:
  isOpen: false
  licence: "No licence file"
  repo: "mbaliga/RTS-live-wallpapers"
  note: "The repository is private. A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged."
faq:
  - q: "Where can I install it?"
    a: "Nowhere yet. The app is at version 0.24.0 and is being prepared for a Play beta. There is no release to download."
  - q: "Does it need my location?"
    a: "No. The permission is optional. You can type coordinates in by hand, and the weather lookup works without the permission. The app reads the last known position and does not run continuous GPS."
  - q: "Is there a second voyage?"
    a: "A second voyage is in the yard. Nothing more is decided."
statusProposal: "Roster status 'soon' is supported: no releases or tags, Play beta prep only, and the code is a working native app at v0.24.0. No change proposed."
ownerNotes:
  - "Default branch claude/new-session-ipcj30 has no LICENSE. PolyForm Noncommercial 1.0.0 exists only on claude/asystemofcells-redesign-s6yv4c. Merge it, then change licence to 'Source-available (PolyForm Noncommercial 1.0.0)'."
  - "The repository is private. Make it public or drop the repo field."
  - "The hero image is a web render of trireme.html (software WebGL), not the Android app. Confirm the provenance label reads as Web."
  - "Roster oneLiner says 'built book by book'. The facts support twelve chapters, not one per book. Consider rewording."
  - "Roster accent #2F855A is unconfirmed."
  - "Roster model is freemium. No billing code was found. The page claims no paid tier."
  - "Footnoted gaps from PLAY_RELEASE.md: CC BY-SA attribution for the 0 A.D. models is incomplete, so it must be fixed before the museum is shown on a store."
  - "Privacy policy at asystemofcells.com/odyssey/privacy was not confirmed to exist, so it is not linked."
  - "All on-device behaviour (frame rate, audio, the weather path) is unverified in the repo. Voyage mode switching 'between glances' is design intent, not device-tested."
  - "The 'Notify me' CTA from the brief is not on this page. The layout decides it."
---
