# Go live — the owner's steps

A1 to A7 are merged: the four wings, the Cabinet, Alloy prints Stage 0, Practice and the Counter backend. Everything below is yours to do. Nothing here needs code, and nothing here is guessed.

The order matters. Do 1 to 5 in any order, then 6, 7, 8.

## 1. The ledger (private repo)

1. Create the private repo `mbaliga/asoc-counter`. Add a `README.md` (one line is enough).
2. Create a fine-grained personal access token: repository access **only** `mbaliga/asoc-counter`, permission **Contents: read and write**. Nothing else.
3. Vercel env: `LEDGER_PROVIDER=github`, `LEDGER_REPO=mbaliga/asoc-counter`, `LEDGER_TOKEN=<the token>`. Optional: `LEDGER_BRANCH`.

Later, on the homelab: `LEDGER_PROVIDER=gitea`, `LEDGER_URL`, `LEDGER_REPO`, `LEDGER_TOKEN`. Nothing in the site changes.

## 2. Razorpay

1. Finish KYC and activate the account. Payment Links must be enabled. Turn on international cards if you want them.
2. Create API keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
3. Add a webhook to `https://www.asystemofcells.com/api/counter/?__p=webhooks/razorpay` (**exactly this, with the `www`**: the site redirects the bare domain, and a webhook sender may not follow a redirect), event **payment_link.paid** only. Choose a secret and set it as `RAZORPAY_WEBHOOK_SECRET`.
4. Check against Razorpay's live API whether a payment link's `reference_id` must be unique. The code appends a suffix either way, so this only confirms.

## 3. Notifications and mail

- **ntfy:** `NTFY_URL` (your homelab, or `https://ntfy.sh`), `NTFY_TOPIC` (a long random string), `NTFY_TOKEN` if the topic is protected. Subscribe your phone to the topic.
- **Resend:** verify the domain, then set `RESEND_API_KEY` and `MAIL_FROM=counter@asystemofcells.com`.

## 4. Storage for model files and attachments

1. Create a Cloudflare R2 bucket, private. Add a lifecycle rule that deletes objects after 45 days (a backstop; the Counter deletes at 30 days after dispatch).
2. Create an R2 API token with object read/write on that bucket. Set `STORAGE_ACCOUNT_ID`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`.
3. R2 bucket CORS: allow `PUT` from `https://asystemofcells.com`, headers `content-type` and `x-amz-checksum-sha256`.

## 5. The rest of the env

- `COUNTER_OWNER_TOKEN`: a long random string. The Counter app sends it as a bearer token.
- `CRON_SECRET`: the **same value** as `COUNTER_OWNER_TOKEN`. Vercel's daily cron sends it to `/api/counter/owner/rebuild`.
- `SITE_URL=https://asystemofcells.com`.
- `DEPLOY_HOOK_URL`: a Vercel deploy hook, so a rebuild can refresh the site.

Without these, production refuses to start the Counter (it never falls back to the in-memory ledger).

## 6. Calibrate the numbers (they are placeholders)

- `data/pricing.prints.json`: grams, hours, minimum, packaging, lead times.
- `data/finish-tiers.json`: the three finish multipliers and adders.
- `data/shipping.json`: real India Post and Delhivery bands.
- `data/calibration.prints.json`: one OrcaSlicer session on the A1 mini for the cube, the overhang fixture and the thin-wall fixture. The estimator runs low for small parts until this is filled (3.6 g where a real cube is 5 to 9 g).
- `data/handoff.json`: set `bambuHandyLocal` once you have checked on the A1 mini that Handy opens a local `.gcode.3mf`.

## 7. Replace the samples

- **Cabinet:** delete the three `sample-*.md` pieces in `apps/asoc-com/src/content/cabinet/` (they are hidden in production anyway) and add real pieces. Add a `smoke-test.md` priced at ₹1, weight 1 g, ships to IN, for step 8, and delete it afterwards.
- **Practice:** name the three `pending-work-*.md` entries and supply their images; set `pending: false`.
- **Tropical tool:** transcribe the book's Tables 4 and 5 into `data/mahoney.recommendations.json`, and check `tropical.js` against your copy.
- **Vastu:** correct `data/vaastu.zones.json`.
- **Products:** the open items listed in each product PR (Clackpad's Play link, unsettled licences, Nooz re-shoot, device captures: `docs/handoff/DEVICE-CAPTURES.md`).

## 8. The ₹1 smoke order

After 1 to 5 and 7 (the `smoke-test` piece) are deployed:

```
COUNTER_BASE=https://asystemofcells.com \
COUNTER_OWNER_TOKEN=... \
SMOKE_EMAIL=you@example.com \
node docs/handoff/tools/counter-smoke.mjs
```

It places the order, checks that the same key replays rather than making a second order, accepts it through the owner endpoint, and prints the Razorpay link. Then:

1. Pay the link (UPI is fine). You should get a **Paid** push from ntfy within seconds.
2. Open the status link: the order shows **Paid**.
3. Mark it dispatched (the Counter app, or `POST https://www.asystemofcells.com/api/counter/?__p=owner/orders/<id>/status` with `{"status":"dispatched","carrier":"test","tracking":"T1"}`): the status page shows the tracking.
4. Run the rebuild (`POST https://www.asystemofcells.com/api/counter/?__p=owner/rebuild`): `catalog-state.json` and `counters.json` appear in the ledger.
5. Refund the ₹1 from the Razorpay dashboard. Delete `smoke-test.md`.

Go live once that has worked end to end on the live ledger.

## 9. Device screenshot checklist

`docs/handoff/DEVICE-CAPTURES.md` lists what only a phone can show. Until a capture exists, no page says "captured on device".

## What is not built yet

- Real slicing in the browser (Phase B, Kiri:Moto) and the Alloy kernel in Wasm (Phase C).
- The Sun tool's 3D massing view, the wind rose for an arbitrary place, the Tropical tool's Tables 4 and 5, wall and roof heat performance, and the daylight factor.
- The explorable layouts (scroll, compare, plan) for the Practice work pages.
- The Counter app (A8): a separate repo, `mbaliga/asoc-counter-app`.
- Edition stock is refreshed by rebuild, so it can oversell a few units between rebuilds.
