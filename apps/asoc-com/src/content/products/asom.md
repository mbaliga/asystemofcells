---
headline: One app holds your model files and cloud keys, makes the routing call, and logs every network event; other apps ask it over 127.0.0.1:11435.
lede: ASOM is a routing daemon for Android that speaks the OpenAI wire format on loopback. It is at version 0.1.0 and has not yet been run on a phone.
features:
  - title: OpenAI-compatible server on loopback
    body: The daemon serves /v1/chat/completions (with SSE streaming), /v1/completions, /v1/embeddings and /v1/models on 127.0.0.1:11435. Any client that speaks the OpenAI wire format can call it. The server code and its JVM integration tests exist; behaviour on a phone is not yet tested.
    status: shipped
  - title: Five routing policies
    body: The model field accepts auto, cheapest, fastest, best-reasoning or local-only, or a concrete model id. The router is deterministic, with a per-provider cooldown registry and a latency tracker. Its JVM tests cover 97.8 per cent of branches in the router.
    status: shipped
  - title: Your cloud keys in a Keystore vault
    body: Provider keys are entered in the dashboard Keys tab and wrapped with an Android Keystore key. No API returns or accepts a key, and a redactor strips key material from logs. Survival across a reboot is on the device checklist and has not been run.
    status: shipped
  - title: Two cloud drivers
    body: Cloud calls go through one driver for Anthropic and one for OpenAI-compatible endpoints. The bundled catalogue lists OpenRouter, Groq and Anthropic; other OpenAI-compatible providers can be described in catalogue.json. Mocked-server tests pass; the real-key test has not been run.
    status: shipped
  - title: Egress ledger with matching headers
    body: Each request writes one ledger row. The same RouteRecord builds the X-Asom-Served-By, X-Asom-Egress and X-Asom-Cost-Est response headers, so the API and the dashboard are built from one source. Rows hold metadata only unless you switch verbose mode on, and a worker purges verbose bodies. Every network event is meant to write a row; that is the design, and not every path has been traced.
    status: shipped
  - title: Ledger export through the share sheet
    body: The ledger leaves the device only when you tap Export and pick a destination in the Android share sheet. The FileProvider that carries it is not exported and grants one read.
    status: shipped
  - title: Pairing through the OS
    body: A client app binds to asom's AIDL pairing service. asom reads the caller's UID with Binder.getCallingUid(), shows a consent sheet, and only then issues a bearer token. There is no HTTP registration endpoint. The device checklist for pairing has not been run.
    status: shipped
  - title: Model files stored once, shared read-only
    body: asom downloads models from catalogue URLs, checks a SHA-256, and hands paired apps a read-only file descriptor through a content provider. The caller's UID is checked against active pairings in code. A second app reading the file has not been tested on a device.
    status: shipped
  - title: Client library with a cloud fallback
    body: The client module handles discovery, pairing and streaming chat. A resolver tries asom first and falls back to a cloud-only implementation using the host app's own key. A nudge policy limits how often an app may suggest installing asom. Nothing is published to a package registry yet, and the uninstall fallback is untested on a device.
    status: partial
  - title: A service you start yourself
    body: The daemon runs as a foreground service with a persistent notification and a quick-settings tile to start and stop it. Start on boot is a toggle and defaults to off.
    status: shipped
  - title: Local generation engine
    body: Not yet. In v1, local-only returns 501 LOCAL_ENGINE_ABSENT and a stand-in engine sits behind the interface. A local engine is in the plan.
    status: planned
neverHappens:
  - No analytics, crash reporting or telemetry library is in the code or the manifests, and there is no Play Services or Firebase dependency.
  - The server binds 127.0.0.1 only, and cleartext traffic is refused for every address except localhost.
  - Provider keys are never returned by an API, written to logs or put in the ledger.
  - If you route to a cloud provider, your prompt goes to that provider and nowhere else.
openSource:
  isOpen: true
  licence: Apache-2.0
  repo: mbaliga/asystemofmodels
  note: A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged.
faq:
  - q: Does asom run models on my phone?
    a: Not in v1. It stores model files once and shares them read-only with paired apps, but local-only requests return 501 LOCAL_ENGINE_ABSENT.
  - q: What leaves my phone?
    a: Provider calls made with your own keys, the catalogue.json fetch and the model downloads you start. Each is meant to write a ledger row. The ledger itself leaves only when you export it.
  - q: Why does it declare the INTERNET permission?
    a: Cloud calls and downloads need it, and Android also gates loopback sockets on it. The server accepts connections on 127.0.0.1 only. The other manifest permissions are foreground service, notifications and boot completed.
  - q: Can I install it?
    a: Not yet. There is no release; only a CI debug build exists. Watch the repo.
statusProposal: "Roster status is \"soon\" and the brief says \"beta\". The facts support \"building\": version 0.1.0 is code-complete with JVM and CI tests green, the repo is public, there is no release, and every on-device and real-key gate is open. The page is written for building (CTA \"Watch the repo\", no install chooser)."
ownerNotes:
  - Licence conflict. The default branch (claude/asom-v1-build-brief-vw83oh) holds Apache-2.0, so the page says Apache-2.0 and isOpen true. The redesign branch holds PolyForm Noncommercial 1.0.0 (commit 8600435), and about.astro already says "source available, not open". If that commit merges, change isOpen to false and the licence to "Source-available (PolyForm Noncommercial 1.0.0)", and drop the note.
  - The default branch is a claude/ feature branch, not main. Confirm that is intended.
  - No raster screenshots exist for asom. The brief wants one inline SVG architecture diagram in two themes (client apps, pairing service, 127.0.0.1:11435 server, router, provider drivers, ledger). It must not use red/green for meaning.
  - Confirm the accent colour (roster verify list) and that the roster oneLiner should drop the word "sovereign".
  - The "leaves" text in the roster says "nothing about your use is reported to us" and "every outbound call is written to a ledger". The second is design intent and was not traced path by path.
  - Mesh, Apple, Windows and Ubuntu Touch work is design and lab material only, and is left off the page.
  - Package id is xyz.mdhv.asom; public name is asom.
---

ASOM is the plumbing under the house's other apps. It is a daemon, so most of what it does is invisible. The dashboard has five screens: Status, Hotspot, Models, Keys and Ledger.

The server code is tested on a desktop JVM, and a curl transcript of that desktop server is committed to the repo. Nothing here has been confirmed on a phone yet.
