# asoc-handoff — the four-wing asystemofcells.com, ready for Claude Code

Drop this folder into the repo as `docs/handoff/`, commit, then paste `10_CLAUDE_CODE_PROMPT.md` into Claude Code. Everything the session needs is here; everything it must not guess is marked *verify* or *OWNER*.

## Read order

| File | What it settles |
|---|---|
| `01_MASTER_PLAN.md` | the four wings, house rules, phases A1–A8 with gates, owner decisions with defaults, timeline, model/tool choice |
| `02_SITE_ARCHITECTURE.md` | routes, `WingLayout`, home changes, roster v2, content collections, API surface, SEO, privacy delta, how to lift a wing to its own domain later |
| `03_WING_APPS.md` | product page v2 and a brief for every app (angle, features to verify, imagery lane, CTA, open-source line) |
| `04_SCREENSHOT_PIPELINE.md` | what the repos actually contain (none have real screenshots), the three capture lanes, the manifest, provenance on every image |
| `05_WING_CABINET.md` | the store: content model, cart, checkout, one-off reservations, status drift |
| `06_WING_ARCHITECTURE.md` | explorables, Sun / Wind / Vaastu tools (algorithms + honesty labels), commission |
| `07_WING_PRINTS.md` | the slicer in three stages (preview+estimate now → Kiri:Moto → Alloy kernel in Wasm), plate-preview visual spec, estimator math, finish tiers, pricing, the honest print-from-phone routes, order kind `print` |
| `08_COUNTER_BACKEND.md` | the one backend: git-file ledger, API contract, Razorpay links + webhook, ntfy, mail, security, migration off GitHub/Vercel |
| `09_COUNTER_APP.md` | the owner's Android orders app |
| `10_CLAUDE_CODE_PROMPT.md` | the driver prompt |

## What runs today (verified in this session)

```
node --test tools/sunpath.test.mjs      # 6/6 — NOAA solar position, Hyderabad solstice/equinox vectors
node --test tools/estimate.test.mjs     # 7/7 — mesh stats, occlusion-aware supports, quote from the JSON tables
PW_CHROME=/usr/bin/google-chrome node tools/shoot-web.mjs --targets tools/web-targets.json --out screenshots --serve apps/asoc-com/public
                                        # Lane W — captured the generators and the reader; see screenshots/manifest.sample.json
```

`tools/harvest-screenshots.sh` needs `gh` logged in on the owner's machine to see private repos; in the container it falls back to the public name list in `04 §1`. `tools/shoot-device.sh` runs on the phone over adb. `tools/build-windrose.mjs` is the one build-time network call (NASA POWER) and is owner-run.

## Owner to-do list (nothing here blocks the build; all have defaults)

1. Decide the wing names (`data/wings.json`) and whether wings 2–4 stay on `.com` (default: yes).
2. Create the private ledger repo `mbaliga/asoc-counter` + a fine-grained PAT (Contents RW on that repo only).
3. Razorpay account activation (and international cards if wanted); webhook secret; PayPal.me handle for the fallback line.
4. ntfy topic (homelab or ntfy.sh), Resend domain for `counter@asystemofcells.com`.
5. Object store: Cloudflare R2 bucket (or Vercel Blob) credentials.
6. Calibrate `data/pricing.prints.json`, `finish-tiers.json`, `shipping.json`; fill `calibration.prints.json` from one Orca session.
7. Correct `data/vaastu.zones.json` as the practising architect.
8. Verify on the A1 mini whether Bambu Handy opens a local sliced `.gcode.3mf`; flip `data/handoff.json`.
9. Run the device lane for Clackpad (and anything else that must be real) with `tools/shoot-device.sh`.
10. Supply explorable images for the three architecture work entries; flip `pending: false`.

## Model and tool choice (per your standing preference)

Sonnet orchestrates and does the repo work; the driver prompt spawns Opus for exactly two reviews (ledger concurrency before A7, estimator port before A5). Iterate the looks of the plate preview, the sun diagram and the vaastu overlay as HTML artifacts in the chat app first, then hand the HTML to the session as the UI source of truth — the same workflow you used for Typewright.
