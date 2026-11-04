---
headline: "Counter is the one place the house keeps orders: a private git repository of JSON files, in the plan."
lede: "Counter is the shop counter behind the Cabinet and Alloy prints. It is the house's one marked exception to having no backend, and none of it is running yet. This page says what it is planned to store and where."
features:
  - title: "One file per order"
    body: "In the plan: each order is a JSON file in a private git repository, named by a ULID. Later status changes are appended to a separate event log. Nothing is built yet."
    status: planned
  - title: "Files, not a database"
    body: "In the plan: a few serverless functions write to the ledger through the GitHub Contents API. A Gitea adapter with the same interface is specified, so the ledger could move to the owner's own server by changing an environment variable. Not built."
    status: planned
  - title: "A fixed order life"
    body: "In the plan: an order moves from placed to delivered through set steps. The owner accepts, rejects and advances it, the payment webhook marks it paid, a sweep expires it, and the customer can cancel before acceptance."
    status: planned
  - title: "Payment through Razorpay links"
    body: "In the plan: on acceptance the server creates a Razorpay Payment Link that expires after 72 hours. The site and the app never see card or UPI details. The link is created with the customer's email and phone so Razorpay can notify them."
    status: planned
  - title: "Model files stay out of git"
    body: "In the plan: a customer's 3D model goes to a separate object store, not the ledger. Files are to be deleted on reject, expiry or cancel, and 30 days after dispatch. Not built."
    status: planned
  - title: "An owner-only Android app"
    body: "In the plan: an app for the owner to accept, reject and advance orders, with new orders announced through an ntfy topic rather than Firebase. It is not for customers and has no build. Its repository does not exist yet."
    status: planned
neverHappens:
  - "In the plan: customer mail carries no tracking pixels and no link rewriting."
  - "In the plan: function logs record order ids only, never personal data."
  - "In the plan: card and UPI details never reach the site or the app. Razorpay holds them."
  - "In the plan: the app carries no analytics and no vendor crash reporting. This is a requirement, not yet checked against code."
openSource:
  isOpen: false
  licence: "No repository yet"
  note: "The ledger repository is private because it holds customer orders. The app repository is planned as public; no licence is stated yet."
faq:
  - q: "Why does a house with no backend have one?"
    a: "A shop needs somewhere to keep orders. Counter is the narrow, marked exception: one ledger, a few serverless functions, one payment provider, one notification channel."
  - q: "Where would my order details be kept?"
    a: "In the plan: as JSON files in a private git repository, or on the owner's own server after a move. Uploaded model files go to a separate object store. Nothing is live yet."
  - q: "Who sees my card details?"
    a: "Razorpay, the payment provider. By design the site and the app never see them. International orders may use PayPal per the site plan; the Counter specification covers Razorpay only."
  - q: "Can I install the Counter app?"
    a: "No. It is the owner's app for running the shop. It has no build, and its repository does not exist yet."
ownerNotes:
  - "No repo exists (roster verify[]), so the Watch the repo CTA has nothing to link to. Omit the button until A8 creates mbaliga/asoc-counter-app."
  - "Licence for the app repo is undecided. The generic template FAQ that asserts PolyForm Noncommercial for Counter contradicts this; remove it."
  - "The built page line 'Public source, no installable build yet: the page links to the repository' is false today."
  - "Resolve the conflict between 08 and 02 section 8 on whether an uploaded model is stored before acceptance, then add retention wording. No retention period for orders is stated; 30 days applies to model files only."
  - "The privacy page has no Counter section yet (02 section 8, planned). This page should link to /privacy/ once that section exists."
  - "PayPal appears in 02 section 8 but not in 08. Confirm whether it is in scope."
  - "No Counter images exist in the manifest. Page is feature-led."
---

Counter is not a product you can use. It is a plan, written down so the privacy page has something exact to point at.

Everything else in the house runs on your device. A shop cannot. It has to keep orders somewhere, so Counter is the one deliberate exception, and it is kept narrow.

What it is planned to store, where it is planned to be kept, who is planned to process payment and how long files are kept is planned to be set out on the privacy page, which has no Counter section yet. Until the functions are deployed, none of it is live.
