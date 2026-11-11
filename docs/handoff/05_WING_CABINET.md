# Wing 2 — The Cabinet (Collectibles & Curiosities)

A small studio shop. Two kinds of thing: **made** (things the owner made: prints, objects, editions, drawings) and **curiosity** (things bought over time and now sold on — one-offs with provenance). It is a cabinet of curiosities, so the page is a *collection*, not a grid of SKUs: generous whitespace, one object per breath, object photographs on white, type doing the work.

## 1. Pages

- `/cabinet` — the collection. Default sort: newest. Filters as quiet text toggles: *Made · Curiosities · Available · Sold*. Sold items stay visible (struck price, "Sold" cell-mark) — a cabinet keeps its history. Search via `fuse.js` over title/tags/provenance (client-side).
- `/cabinet/{item}` — the object. Large image sequence (swipe/scroll), title, kind, edition or one-off, price (INR primary; USD shown as an estimate with the configured rate), dimensions, weight, condition grade (curiosities), provenance paragraph (curiosities) / making notes (made), ships-to list, **Add to cart** or **Reserve** (one-offs). JSON-LD `Product`.
- `/cabinet/cart` — client-only; `localStorage` key `asoc.cabinet.cart.v1`; shows items, quantities (made editions only), shipping zone selector (India / International), computed shipping from `data/shipping.json`, total. No analytics.
- `/cabinet/checkout` — one form: name, email, phone (optional, needed for India shipping), address block, country select, note. Submits `POST /api/counter/orders` with `kind: "cabinet"`. On success routes to `/orders/{id}?t={token}`.

## 2. Content model (`src/content/cabinet/{item}.md`)

```yaml
title: "Hyle cell, brass"            # required
kind: made | curiosity                # required
status: available | reserved | sold | archived   # the ledger flips this via a daily rebuild (see §5)
price: { inr: 2400, usd: 29 }        # usd optional (display estimate only)
edition: { size: 12, sold: 3 }        # made only; omit for one-offs
qty: 1                                # curiosity → always 1
condition: "very good"                # curiosity: mint | excellent | very good | good | fair, plus a free-text note
provenance: "Bought at …, 2019. …"    # curiosity
making: "Cast in …; finished by hand" # made
dims: { w: 42, h: 42, d: 8, unit: mm }
weightGrams: 120
materials: ["brass"]
tags: ["hyle", "mark", "desk"]
images: ["01.jpg", "02.jpg"]          # under src/assets/cabinet/{item}/
shipsTo: ["IN", "INTL"]               # INTL = anywhere the shipping table covers
fragile: false
madeOn: 2026-09-01                    # made
acquired: 2019-04-01                  # curiosity
```

Body (markdown) = the long description. Zod schema in `content/config.ts` enforces `qty: 1` for curiosities and `edition` only for made.

## 3. Cart and pricing rules (client, `packages/kit/src/client/cart.js`)

- Line = `{ item, qty, unitInr }`. Curiosities max qty 1. Made editions capped at `edition.size − edition.sold`.
- Shipping = `data/shipping.json` zone table keyed by destination (`IN` vs `INTL`), weight band (sum of `weightGrams` + packaging allowance 15 %), and a fragile surcharge. International shows "customs/duties are the recipient's" line.
- Totals are **quotes**: the ledger recomputes server-side from the same JSON (it is bundled into the function) and the accepted order carries the server's number. Client/server drift > ₹1 → order placed with server total, customer sees the recomputed figure on the status page.
- No coupon system in v1.

## 4. The one-off problem: reservations

Two people can want the same curiosity. Flow:

1. Checkout for a `qty:1` item creates the order **and a reservation** on the item (`reservations/{item}.json` in the ledger with `orderId`, `expiresAt = now + 48h`).
2. Second checkout for the same item while a live reservation exists → `409 reserved` with `expiresAt`; the site shows "Reserved until … — you can leave your email and be told if it frees up" (`inquiries` kind `waitlist`).
3. Reservation ends when: owner rejects (item back to `available`), owner accepts and payment succeeds (item → `sold`), or 48 h pass without acceptance (expires; the next waitlist email gets a nudge — owner action, not automatic email).
4. Atomicity on the git ledger: reservation files are created with the GitHub Contents API `PUT` **without** `sha`, which fails with 422 if the file exists — that is the lock. Expired reservations are swept by the owner app or the daily rebuild (§5), never by the customer path.

## 5. Status drift between content and ledger

Item `status` lives in two places by design: the markdown (what the static site shows) and the ledger (what is true). Keep them honest with:

- `GET /api/counter/catalog-state` → `{ [item]: { status, reservedUntil? } }` (cached 60 s). Item pages fetch it on load and flip the button client-side (`Reserved until …` / `Sold`) — static page, live truth, still no analytics.
- A Vercel Deploy Hook the owner app can trigger after marking sold, which rebuilds the site with the ledger state baked in (the build script reads the ledger via a read-only token and rewrites `status` fields — never edits prose).

## 6. Order kind `cabinet` in the ledger (see `08_COUNTER_BACKEND.md` for the full state machine)

Items array carries `{ item, title, qty, unitInr, kind: made|curiosity }`, shipping zone and weight, computed totals. Accept → Razorpay link for `total`. Paid → owner packs and dispatches → tracking number entered in the Counter app → status page shows carrier + tracking.

## 7. Photography and layout notes (owner's taste)

- Objects on white or on the Hyle light ground; no drop shadows; one hero image, then details.
- Type: Hyle Deco for the object title eyebrow (kind + edition), UI face for the rest.
- No "cards": the collection page is a vertical sequence on desktop with alternating image/text alignment, a single column on mobile; the cell-mark shows status (available = whole cell, reserved = half-outlined, sold = outlined).
- Explanations (condition grades, how reservations work, shipping) live behind ⓘ.

## 8. Acceptance (A4)

- Three sample items in the collection (one made edition, one curiosity, one sold) render; JSON-LD validates.
- Cart persists across reloads; totals match a hand-computed sample from `shipping.json`.
- Checkout places an order on the dev ledger; a second checkout on the same curiosity gets `409` and the waitlist path.
- `/cabinet/cart` and `/cabinet/checkout` pass no `analytics`; `tools/check-analytics-boundary.sh` passes.
