---
headline: One local-first HTML page draws your projects from a git scan and keeps its state in your browser.
lede: Orrery is a single page you build with one Python command. The public build shows renamed sample data, and it is still being built.
features:
  - title: One HTML file, built without a bundler
    body: python3 build.py joins the shared kit, the scripts, the markup and the stylesheet into one file. State is kept in the browser under a tracker. localStorage prefix.
    status: shipped
  - title: A scan of your repos, read from git alone
    body: A Python scan reads git history with no token. A second script turns it into the project, language, library, agent and pull-request data the page draws. The public tree ships a renamed sample so the page builds for anyone.
    status: shipped
  - title: Year view with a force graph and runways
    body: The Year view draws a force graph, and runways to everything that has a date. The graph supports brush, drag and pin, wheel zoom, focus and a context menu.
    status: shipped
  - title: A usage ledger from Claude Code transcripts
    body: The page reads the transcripts Claude Code writes, in the browser. It attributes token counts to project, model, day and session as weighted units, and keeps totals only, never a prompt or a reply.
    status: shipped
  - title: Search over your own notes
    body: A BM25 index covers your notes, with wikilink references and a similar-notes lookup. A desk pins notes, and a map draws the graph with saved lenses.
    status: shipped
  - title: Obsidian vault and Baseline import
    body: An Obsidian vault is parsed read-only. Baseline output can be imported and drawn. Orrery does not read EEG itself.
    status: shipped
  - title: Ask, with a model you attach
    body: Ask answers from facts retrieved from your own graph. A model can be attached through a key you hold (Claude, ChatGPT, DeepSeek, Grok) or an endpoint you run (Llama via Ollama, llama.cpp). Hosted providers are marked watched and the payload is shown first. Live calls have not been checked against a real provider, and replies do not stream yet.
    status: partial
  - title: Release meters per store target
    body: One row per project and one meter per target, in five bands. Each tick is sourced from a task, a repo fact, a connector or your own mark. Every store connector is switched off in this build.
    status: partial
  - title: Weather and sky as the background
    body: The page places the sun and moon from your coordinates. Weather is off until you turn it on.
    status: shipped
neverHappens:
  - No account, and no telemetry code found in the source that was read.
  - Your state stays in this browser. Check-ins, sessions and the body map are not sent anywhere.
  - Hosted models and weather are off until you turn them on. A hosted model is marked watched, and you see the exact payload first.
  - If you point it at your own AI endpoint, your text goes there and nowhere else.
openSource:
  isOpen: true
  licence: Apache-2.0
  repo: mbaliga/orrery
  note: A person's own workspace data is not in the repo. The scan output and the curated content stay private, and the build falls back to renamed samples.
faq:
  - q: Can I install it?
    a: Not yet. There is no release, no tag and no app-store listing. Watching the repo is the way to follow it.
  - q: Does the page make any network request on its own?
    a: One. The built page asks Google Fonts for its typefaces. Weather and hosted models make requests only after you turn them on.
  - q: What does weather send?
    a: The forecast request sends your coordinates only. A place name you type is sent once to the open-meteo geocoder, and only the coordinates are kept.
  - q: Is it read-only?
    a: Only in two places. The Obsidian vault is read-only, and so is the default scan. The board, notes, tasks and desk are editable, and the GitHub connector can read and write with a token you hold.
statusProposal: Roster status building is supported by the facts. No change proposed.
ownerNotes:
  - "Roster oneLiner says 'A read-only view of a whole pipeline, with a git repo as the truth. The owner's cockpit, free for anyone to read.' The code does not support this. The page keeps state in localStorage, parts are editable, git-as-store is task card T7 (design only), and the real scan data is private. Suggest rewording the oneLiner."
  - "No hosted URL for the page was found. Confirm whether an 'open the page' link should exist. The page uses the Watch the repo CTA only."
  - "Roster repo is written mbaliga/Orrery. The page uses mbaliga/orrery, which resolves."
  - "The hero screenshot is sample data (sample_data: true). Confirm the layout labels it as sample."
  - "Bring-your-own model is marked partial because HANDOFF.md lists live provider calls as unchecked. The ASOM connector (127.0.0.1:11435) is 'In the build' and is not claimed here."
  - "Dial, body map and planner exist in the source but are not on the page, to keep it short. Add if wanted."
  - "No telemetry is stated as 'none found in the source that was read'. Not every file was read."
  - "README uses 'cockpit' and 'orchestrator'. Neither is used here."
---

Orrery is a page that draws a set of projects from their git history. It runs in a browser tab. Apart from its fonts, only the opt-in model and weather calls and the GitHub connector, which uses a token you hold, reach a server.

The public build uses renamed sample data. A real scan stays on the machine that ran it.
