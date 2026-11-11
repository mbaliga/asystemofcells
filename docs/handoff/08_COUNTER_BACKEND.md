# Counter — the house's one backend

The constellation's law is "no operator backend." A shop needs a counter. Counter is the deliberately narrow, visibly marked exception: one ledger, a handful of serverless functions on the site's existing Vercel project, one payment provider, one notification channel. It is disclosed on the privacy page, and it is designed so the owner can move it off GitHub/Vercel to his homelab without changing the site.

## 1. Shape

```
site (static)  ──POST──▶  api/counter/*  (Vercel Functions, Node 20)
                              │  writes one JSON file per order/inquiry
                              ▼
                   ledger: private git repo  mbaliga/asoc-counter  (GitHub Contents API; swappable for Gitea)
                              │  ▲
       Razorpay webhook ──────┘  │ git pull / Contents API
       (payment_link.paid)       │
                              Counter app (Android)  ◀── ntfy push (owner's topic)
model files ──presigned PUT──▶  object store (R2 or Vercel Blob), keys referenced from the ledger
```

Why files in a private git repo and not a database: it matches the owner's standing ruling for Orrery (a git repo is the truth, items as files, GitHub only a mirror of convenience), the owner app syncs with `git pull`, every change is audited by construction, and moving to Gitea on the homelab is a URL + token change. Volume is small (a solo shop); concurrency is handled by git's own conditional writes (§4).

## 2. Ledger layout (`mbaliga/asoc-counter`, private)

```
orders/2026/11/ord_01JC…K7.json         one file per order (ULID id), never rewritten by the customer path
orders/2026/11/ord_01JC…K7.events.jsonl append-only event log (status changes, notes, payment events)
inquiries/2026/11/inq_01JC…A2.json      commission / notify / waitlist / contact
reservations/<cabinetItem>.json         one-off item locks (presence = reserved; contains orderId, expiresAt)
catalog-state.json                      derived: { item: { status, reservedUntil } } — rebuilt by the owner app or a function on change
counters.json                           derived: open orders by kind, next actions (for the app's inbox badge)
README.md                               what this repo is, retention rules, how to migrate
```

Order document (`orders/.../ord_*.json`):

```jsonc
{
  "id": "ord_01JC…", "kind": "cabinet" | "print", "createdAt": "2026-11-05T09:12:00Z", "status": "placed",
  "customer": { "name": "…", "email": "…", "phone": "+91…" | null },
  "shipTo": { "line1": "…", "line2": "", "city": "…", "state": "…", "postcode": "…", "country": "IN" }, "zone": "IN",
  "items": [ /* cabinet: {item,title,qty,unitInr,kind} | print: {model:{name,sha256,storageKey,bytes}, settings, estimate, tier, qty, colour, filament} */ ],
  "quote": { "subtotal": 0, "finish": 0, "packaging": 0, "shipping": 0, "total": 0, "bandInr": 0, "currency": "INR" },
  "accepted": null | { "at": "…", "total": 0, "note": "…" },          // owner may revise total; customer sees note
  "payment": null | { "provider": "razorpay", "linkId": "plink_…", "shortUrl": "https://rzp.io/…", "status": "created|paid|expired", "paidAt": "…", "paymentId": "pay_…" },
  "fulfilment": { "startedAt": null, "finishedAt": null, "dispatchedAt": null, "carrier": null, "tracking": null, "deliveredAt": null },
  "statusToken": "base64url(32 random bytes)",                           // required to read /orders/{id}
  "customerNote": "…", "flags": ["non-manifold", "long-print", "intl"]
}
```

Status machine (events append to `.events.jsonl`; `status` on the order file is updated by the owner path only):

```
placed ─▶ reviewing ─▶ accepted ─▶ paid ─▶ in_production ─▶ finishing ─▶ dispatched ─▶ delivered
   │          │            │ (72h)                                            
   └──────────┴─▶ rejected  └─▶ expired              any paid state ─▶ refunded (manual, Razorpay dashboard; event recorded)
   any pre-paid state ─▶ cancelled (customer, via status page)
```
`cabinet` orders skip `in_production/finishing` (go `paid → dispatched`). Reservations (one-offs) end on `rejected`, `expired`, `paid` (→ item `sold`), or `cancelled`.

## 3. API contract (`api/counter/*`)

All responses JSON; errors `{ error: { code, message } }`. CORS: same-origin only (plus the wing domains if lifted later). Rate limit: 10 writes/min/IP via an in-memory token bucket per function instance **and** a ledger-side check (≤ 5 open orders per email).

| Method & path | Body / query | Does | Returns |
|---|---|---|---|
| `POST /api/counter/orders` | `{ kind, customer, shipTo, items, clientQuote, idempotencyKey }` | Recomputes the quote server-side from the bundled JSON tables; for `cabinet` creates reservations for `qty:1` items (409 if reserved); for `print` validates `estimate` ranges and returns a presigned upload URL; writes the order file; posts ntfy + email to owner | `201 { id, statusUrl, token, quote, upload?: { url, headers, expiresAt } }` |
| `PUT /api/counter/orders/{id}/model` | — (client PUTs to the presigned URL, then calls this) | Verifies the object exists and sha256 matches; flips `placed → reviewing` | `200` |
| `GET /api/counter/orders/{id}?t={token}` | — | Public status (sanitised: no address line, no phone) | `200 { id, kind, status, timeline[], quote, payment: { shortUrl? }, fulfilment: { carrier, tracking } }` |
| `POST /api/counter/orders/{id}/cancel?t={token}` | — | Customer cancel if status ∈ {placed, reviewing, accepted} | `200` |
| `POST /api/counter/inquiries` | `{ kind: commission|notify|waitlist|contact, …fields, attachments? }` | Honeypot + time-on-page check; writes inquiry; attachments go to the store and are referenced | `201 { id }` |
| `GET /api/counter/catalog-state` | — | `catalog-state.json`, cached 60 s (`s-maxage=60`) | `200 {...}` |
| `POST /api/counter/webhooks/razorpay` | Razorpay signed payload | Verifies `X-Razorpay-Signature` (HMAC-SHA256 with the webhook secret); on `payment_link.paid` → `accepted → paid`, records `paymentId`; idempotent on `event.id` | `200` |
| **Owner-only** (bearer `COUNTER_OWNER_TOKEN`, used by the Counter app): | | | |
| `POST /api/counter/owner/orders/{id}/accept` | `{ total?, note? }` | Creates a Razorpay Payment Link (`amount` paise, `customer`, `notify: {email:true, sms:true}`, `expire_by` +72h, `reference_id = order id`, `callback_url = statusUrl`); writes `accepted`; emails the customer | `200 { shortUrl }` |
| `POST /api/counter/owner/orders/{id}/reject` | `{ reason }` | `rejected`; frees reservation; deletes model object; emails customer | `200` |
| `POST /api/counter/owner/orders/{id}/status` | `{ status: in_production|finishing|dispatched|delivered, carrier?, tracking? }` | Advances; emails customer on `dispatched` | `200` |
| `POST /api/counter/owner/rebuild` | — | Recomputes `catalog-state.json` + `counters.json`, sweeps expired reservations, triggers the Vercel Deploy Hook | `200` |

The app may equally talk to the ledger directly over git; the owner endpoints exist so the app can stay thin and so Razorpay secrets never leave the server.

## 4. Ledger adapter (`api/counter/_ledger.js`)

- Writes via GitHub Contents API `PUT /repos/{owner}/{repo}/contents/{path}` with a fine-grained PAT scoped to the ledger repo (Contents: read/write). **Create = PUT without `sha`** → the API returns 422 if the path exists, which is the lock used for reservations and idempotency keys (`idempotency/<key>.json`). Update = PUT with the current `sha` (optimistic concurrency); on 409 re-read and retry up to 3 times.
- Event log append: read file → append line → PUT with sha (same retry).
- Reads for public status: `GET contents` with the token, cached 15 s in-function; sanitise before returning.
- Adapter interface (`create(path, json)`, `update(path, fn)`, `read(path)`, `list(prefix)`), with a second implementation `_ledger.gitea.js` that is API-identical (Gitea's contents API is a near copy) so the move to the homelab is a `LEDGER_PROVIDER=gitea` env switch.
- Secrets (Vercel env): `LEDGER_PROVIDER`, `LEDGER_REPO`, `LEDGER_TOKEN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NTFY_URL`, `NTFY_TOPIC`, `NTFY_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM`, `STORAGE_*` (R2 account/bucket/keys or Blob token), `COUNTER_OWNER_TOKEN`, `DEPLOY_HOOK_URL`.

## 5. Files (models, attachments)

Never in git. `_storage.js` abstracts R2 (default) / Vercel Blob: `presignUpload({ key, maxBytes, contentType })`, `head(key)`, `delete(key)`, `presignDownload(key, ttl)`. Keys: `orders/<id>/<sha256>.<ext>`; `inquiries/<id>/<n>.<ext>`. Lifecycle: delete on `rejected/expired/cancelled`; 30 days after `dispatched` (a scheduled Vercel cron hits `owner/rebuild` daily which also runs retention). Client computes sha256 (Web Crypto) before upload; server verifies on `PUT …/model`.

## 6. Notifications and mail

- **Owner:** ntfy publish on every new order/inquiry and on payment (`priority: high` for paid), with click URL into the app (`asoc-counter://orders/<id>`), fallback to the web ledger. Self-hosted ntfy on the homelab if reachable, else `ntfy.sh` with a long random topic + access token.
- **Customer:** Resend (already used by mdhv.xyz) transactional mail from `counter@asystemofcells.com` (Cloudflare email routing already handles the domain): placed (with status link), accepted (with payment link), paid (receipt line + what happens next), dispatched (tracking), rejected (reason). Plain text + minimal HTML, Hyle Deco wordmark as an inline SVG, no tracking pixels, no link rewriting.

## 7. Security and abuse

- Idempotency key per checkout attempt (client ULID) → duplicate submits return the original order.
- Honeypot field + `startedAt` timestamp (reject < 3 s) on every form; no third-party CAPTCHA.
- Input validation with a small schema layer (zod in the function); addresses limited to 300 chars/line; email verified by format + a confirmation link in the "placed" email that the status page checks (`emailVerified` event) — unverified orders auto-expire in 24 h.
- The status token is the only credential for `/orders/{id}`; it is in the email and the redirect URL, never logged.
- Razorpay webhook signature verified; event ids deduplicated in `idempotency/`.
- Owner endpoints: bearer token + an allowlist on the app's device (the app stores the token in Android Keystore).
- No PII in function logs (log ids only).

## 8. Privacy page copy (exact delta — see `02_SITE_ARCHITECTURE.md` §8)

## 9. Testing

`api/counter/__tests__/` with a fake ledger (in-memory adapter) and a fake Razorpay: exercise every transition in §2; reservation race (two creates → one 409); webhook replay (same `event.id` twice → one transition); retention sweep. Run in CI with `node --test`. One live smoke script `tools/counter-smoke.mjs` that places a ₹1 order on the live ledger, accepts it via the owner endpoint, and prints the Razorpay link for the owner to pay.

## 10. Migrating off GitHub/Vercel later

Ledger → Gitea on the homelab (`LEDGER_PROVIDER=gitea`), store → MinIO (S3 API, same `_storage.js`), functions → the same Node handlers under a tiny Hono server in a container, mail → self-hosted Postal or keep Resend, ntfy → already self-hosted. Nothing in the site changes.
