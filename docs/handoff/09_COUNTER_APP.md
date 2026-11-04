# Counter for Android — the owner's orders app

The app the owner asked for: orders arrive on the phone, he accepts or rejects, the customer pays, he prints/packs, dispatches, and marks delivered. One user. Built in the constellation's own grammar (Hyle, rooms, cell-shell, crash-recovery, pure-JVM core) so it costs nothing to maintain and can later become an Orrery widget.

Repo: new, `mbaliga/asoc-counter-app` (public — nothing secret in code), package `com.asystemofcells.counter`. Kotlin lockstep with the constellation (match Hyle's Kotlin/AGP), minSdk 26.

## 1. Modules

```
:core        pure JVM, zero Android imports — ledger model (Order, Event, Reservation, Inquiry), state machine,
             quote recomputation (ports data/*.json), ntfy payload parsing, JSON (kotlinx.serialization). Unit-tested.
:data        Android — Retrofit/Ktor client for /api/counter/owner/*, optional git sync (JGit, read-only clone of the ledger),
             Keystore-backed token store, WorkManager jobs (poll every 15 min when ntfy is unavailable).
:app         Compose, Hyle, cell-shell rooms. Receives ntfy via the ntfy Android app's UnifiedPush-style broadcast
             or its own subscription (ntfy WebSocket in a foreground service while charging; polling otherwise).
```

## 2. Rooms (cell-shell grammar: home is the inbox, rooms push no back-stack)

- **Inbox (home):** open orders grouped by what the owner must do next — *Decide* (placed/reviewing), *Waiting for payment* (accepted), *Make* (paid/in_production/finishing, prints only), *Pack* (paid cabinet, finishing done), *Sent* (dispatched). Each row: kind glyph (cabinet / print as cell-marks), customer first name + city, total, age. Badge counts come from `counters.json`.
- **Order (push):** everything in the order file: customer, address (copy button), items; for prints: the estimate, the quote band, flags (`non-manifold`, `long-print`), a *view model* button that opens the file from a presigned download in the phone's 3D viewer / Alloy if installed; for cabinet one-offs: the reservation expiry. Actions as a bottom arc (the owner's nav pattern): **Accept** (sheet: total editable within/above band + note) · **Reject** (sheet: reason) · later states: **Start making** · **Finishing** · **Dispatch** (sheet: carrier, tracking, photo of the package optional, saved to the order's event log) · **Delivered**. Every action is one call to the owner endpoint and one appended event; the UI shows the event log as the order's timeline.
- **Left room — Cabinet:** catalogue state from the ledger (available/reserved/sold), a *mark sold offline* action (for things sold in person), and *rebuild site* (hits `owner/rebuild`).
- **Right room — Settings:** API base, owner token (Keystore), ntfy topic, poll interval, print capacity (max open prints before the site shows "queue full — lead time +N days", which the site reads from `counters.json`), vacation mode (site shows "the counter is closed until …", orders still accepted but flagged).
- **Top room — Search/jump:** by order id, customer, item.

## 3. Notifications

ntfy topic subscription; tapping opens the order. Priority mapping: new order = default, paid = high, cancel = low. No Firebase. If the owner prefers, the official ntfy app handles delivery and Counter registers a deep link `asoc-counter://orders/{id}`.

## 4. Offline and sync

Local Room cache of orders/events; optimistic UI; actions queue with WorkManager if offline and replay with the same idempotency key. Ledger is the truth: a pull-to-refresh re-reads `counters.json` and changed order files (ETag-based).

## 5. Design

Hyle: ground `#07070A`, violet accent for the owner's own actions, radium glow for "money arrived" (local good news), never red/green for state — status is a cell-mark shape + label. Whitespace, no boxes; the order sheet is typographic. Explanations behind ⓘ. Nintendo-style ticks on arc-menu moves are optional and off by default.

## 6. What the app must not do

- No analytics, no crash reporting to a vendor (use the constellation `:crash-recovery` module: local crash screen + export).
- Never store Razorpay secrets; the server creates links.
- Never edit an order file directly from the app (events only, through the endpoints) — keeps the ledger history clean.

## 7. Acceptance (A8)

- `:core` tests: state machine transitions; quote recomputation equals `tools/estimate.test.mjs` expectations for the same inputs; ntfy payload parsing.
- Against the dev ledger: a placed print order appears in *Decide* within one poll; Accept creates a link (fake Razorpay in dev); the paid webhook moves it to *Make*; Dispatch records tracking and the customer status page shows it.
- APK builds in CI; device behaviour is owner-verified (environment-honesty rule).

## 8. Later

Expose the inbox as an Orrery widget (the owner's ruled widget contract: widget UI lives in Orrery, data in the app's repo); Wear OS glance for *Decide* count; Gitea-only mode with JGit when Counter moves to the homelab.
