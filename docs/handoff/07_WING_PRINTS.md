# Wing 4 — Alloy prints (3D prints)

Two promises on one page: **slice it yourself, free, in the browser** and **have it printed here and sent to you**. Alloy (the owner's native Android slicer, `mbaliga/alloy`) is the brand and the engine lineage; the web slicer is its lighter sibling shell. Printer at the owner's end: Bambu Lab A1 mini (180×180×180 mm build volume, 0.4 mm nozzle, PLA by default).

## 1. Pages and flow

- `/prints` — index: how it works (three steps), finish tiers with prices, materials/colours available, lead time, FAQ ("Your model never leaves your phone unless you ask us to print it"). Analytics: yes.
- `/prints/slicer` — the tool. **Analytics: never.** One page, three panes that stack on a phone: *Plate* (3D), *Settings* (material, layer height, infill, supports, finish tier, quantity), *Quote & order*. The heavy modules load after the first file is dropped.
- `/orders/{id}` — status page (shared with the Cabinet).

Visitor flow:
1. Drop/choose STL · 3MF · OBJ (≤ 100 MB). Parsed in a Worker; placed on the plate; auto-centred; a "lay flat" button (largest face down); scale/rotate handles.
2. The plate preview shows fit: **the model lights up when inside the build volume and goes grey outside** (owner's rule); the bounding box outline marks the volume.
3. Stage 0 (ship now): an **estimate** of mass, time, support need, computed in the browser from the mesh. Stage B: a real slice with layer preview and exact figures.
4. Either **Download** (Stage 0: the untouched model + `print-brief.json`; Stage B: `.gcode.3mf` for Bambu, `.gcode` for others) — or **Order**: pick finish tier + quantity + colour → address → `POST /api/counter/orders` `{kind:"print"}`; the model uploads only now.

## 2. The plate preview (Three.js) — visual spec

From the owner's standing decisions for Alloy: Tesla-driving-visualisation look. Matte low-poly greys, low contrast, geometry dissolving into background-coloured fog with **no visible horizon**; black ground by default (`#07070A` house ground; pure `#000` only for pixels-off), white mode for the light theme. Plate centred and fully in frame on load; a 3D bounding-box outline of the printable volume; the printer itself as a grey low-poly A1 mini silhouette (gantry + bed, ~300 tris, modelled in code, no asset). Upper-left key light + soft fill; MSAA on; `MeshStandardMaterial` with `roughness 0.9, metalness 0`. Model colour: the filament colour the visitor picked, desaturated 20 % and lit; **outside volume → `#6F7D86` grey at 60 % opacity**. Multiple plates: adding a plate lifts the current plate up and away conveyor-style while the next falls into place (the same whip/settle easing as the home conveyor). Orbit controls with damping; pinch on touch; double-tap to re-centre. Performance budget: 60 fps with a 500 k-triangle mesh on a RedMagic-class phone; above 1 M triangles show a simplified proxy (`SimplifyModifier` to 300 k) for interaction and the full mesh for stills.

## 3. Stage 0 estimator (`tools/estimate.mjs` reference, port to `src/scripts/prints/estimate.js`, runs in the Worker)

Inputs: triangle soup (Float32Array positions), unit = mm; settings `{ layerHeight, lineWidth, perimeters, topBottomMm, infillPct, supports: auto|none, overhangDeg, filament }`.

Mesh quantities:
- `volume` = |Σ signed tetrahedra (v0·(v1×v2))/6| (mm³). Non-manifold meshes give a wrong sign locally; take the absolute total and flag `manifold: false` if the shell has open edges (edge-use count ≠ 2).
- `area` = Σ triangle areas; `bbox`, `height = bbox.z`.
- `overhangArea` = Σ area of faces with `n.z < −sin(overhangDeg)` and centroid height > 0.3 mm (not on the plate) — i.e. downward faces steeper than the threshold.
- `supportVolume` ≈ Σ over those faces: `area_xy_projected × centroidHeight × supportFill` where `supportFill = 0.12` (tree/normal supports' effective density; calibrate).

Material model (shell + infill):
- `wallT = perimeters × lineWidth` (default 2 × 0.42 = 0.84 mm); `topBottomMm` default 0.8.
- `shellVolume = min(volume, area × wallT)` (surface area times wall thickness is the thin-shell approximation; capped by the true volume for small parts).
- `innerVolume = max(0, volume − shellVolume)`; `plasticVolume = shellVolume + infillPct/100 × innerVolume`.
- `massG = density × plasticVolume / 1000` (PLA 1.24 g/cm³, PETG 1.27, TPU 1.21) `+ density × supportVolume / 1000`.

Time model (calibrated, not physical):
- `printMin = 60 × massG / gramsPerHour` with `gramsPerHour` per layer height from `calibration.json` (placeholder 16 g/h at 0.2 mm; 11 g/h at 0.12 mm; 20 g/h at 0.28 mm on the A1 mini),
- `+ layers × layerOverheadSec / 60` where `layers = ceil(height / layerHeight)`, `layerOverheadSec = 1.2` (z-hop, retraction, wipe),
- `+ supportMassG × 60 / gramsPerHour × 1.3` (supports print slower),
- `+ 6` min fixed (bed level, purge, cooldown).

Honesty: the UI calls these **estimates** and shows the ±20 % band; the order confirmation says the final price may be revised by up to the band and the customer approves before paying (that approval *is* the Razorpay link step).

Calibration: `data/calibration.prints.json` holds the three Alloy parity fixtures (20 mm cube, overhang fixture, thin-wall case) with their desktop-OrcaSlicer mass/time for the A1 mini at the default profile. The owner fills these from one Orca session; `tools/estimate.test.mjs` asserts the estimator lands within ±20 % of each. Until filled, the tests run against synthetic geometry (closed cube, hollow box, cantilever) and check the formulae, not the calibration.

## 4. Stage B — real slicing in the browser (after go-live)

Engine: **Kiri:Moto** (`GridSpace/grid-apps`, MIT — verify the licence file at the pinned tag), pure JavaScript, slices in a Web Worker, exports G-code; it has an embeddable engine (`engine.js`) with `load/setDevice/setProcess/slice/prepare/export`. Vendored under `apps/asoc-com/public/vendor/kiri/<version>/` with its LICENSE (static → analytics-free by construction).

Alloy's contribution — the thing that makes this "Alloy" and not "a Kiri:Moto page":
- **Profiles.** `alloy/parity/profile_resolver.py` + `export_resolved_orca_profiles.py` resolve the A1 mini printer/filament/process bundles with inheritance. Add a small exporter (`tools/alloy-profile-to-kiri.py`, lives in the alloy repo) that maps the resolved Orca fields → Kiri device/process JSON (bed size, nozzle, max speeds, temps, retraction, start/end G-code with Bambu's `M620`/`M621` AMS lines stripped, first-layer and cooling settings). The site ships `public/vendor/kiri/profiles/a1mini.{device,process}.json` generated by that exporter, with the Orca revision recorded.
- **Output.** Kiri gives `.gcode`. Wrap it as a Bambu `.gcode.3mf` (a ZIP: `Metadata/plate_1.gcode`, `Metadata/plate_1.gcode.md5`, `Metadata/model_settings.config`, `Metadata/slice_info.config`, `3D/3dmodel.model`, `[Content_Types].xml`, `_rels/.rels`, thumbnails `Metadata/plate_1.png` + `plate_no_light_1.png` rendered from the Three.js scene). Port `alloy/parity/verify_gcode_3mf.py` to JS and run it on the output before offering the download — the same gate Alloy uses.
- **Stats.** Replace the Stage 0 estimate with Kiri's filament length/weight and time; keep the estimator as the pre-slice preview.
- **UI.** Alloy's own UI, not Kiri's: the plate from §2, a layer scrubber over the G-code preview (Kiri's `prepare()` output lines rendered as `LineSegments2`), the settings pane limited to what the A1 mini profile exposes (layer height 0.08–0.28, infill, supports on/off + type, brim, seam), and a "Compare with desktop Orca" ⓘ that states the parity status honestly.

Gate for B (mirrors Alloy G3): the three fixtures sliced on the page vs desktop Orca at the pinned revision: time within 10 %, filament within 10 %, no missing walls/supports on visual inspection. Until that passes the download button says *"Preview slice — check in Bambu Studio before printing"*.

## 5. Stage C — Alloy kernel in WebAssembly (research track)

`boolean3d/slicers.wasm` proves the whole OrcaSlicer desktop app runs in a tab under Emscripten (16–28 MB first load, 8 threads max, cross-origin-isolated page required, Chrome/Edge). The useful lesson is narrower: **headless `libslic3r` compiles.** Phase C builds `alloy-kernel-wasm`: libslic3r + the Bambu/Orca print-config code, no wxWidgets, no GL, exported through a typed API that is byte-for-byte the same shape as Alloy's Android JNI surface:

```ts
interface AlloyKernel {
  loadProfiles(printer: Uint8Array, filament: Uint8Array, process: Uint8Array): void   // .orca_printer bundles
  loadModel(name: string, bytes: Uint8Array): ModelId                                 // STL/3MF
  arrange(): void; transform(id: ModelId, m: Float32Array /*4x4*/): void
  slice(opts: SliceOpts, onProgress: (p: number, stage: string) => void): SliceStats
  exportGcode3mf(): Uint8Array; exportGcode(): Uint8Array
  previewLayer(i: number): Float32Array                                                // line segments
}
```

Gates G1–G4 exactly as `alloy/docs/UPSTREAM_EVALUATION.md` (reproducible build, pinned upstream, G-code parity, profile fidelity). AGPL-3.0 obligations: the kernel source is published; the site links it. Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on `/prints/slicer` only (add to `vercel.json` headers for that path) — which also means that page cannot embed cross-origin resources without CORP headers; keep it self-contained.

## 6. Finish tiers and pricing

`data/finish-tiers.json` and `data/pricing.prints.json` (both bundled into the client *and* the function; the function's number wins). Tiers, in the owner's words:

| Tier | What the owner does | Price shape |
|---|---|---|
| `as-is` | Peeled off the plate, supports left on | base × 1.00 |
| `supports-removed` | Supports removed and clipped neatly | base × 1.15 + ₹60 per part |
| `processed` | Sanded and prepared as best as possible | base × 1.60 + ₹200 per part |

`base = max(minimumInr, massG × inrPerGram[filament] + printMin/60 × inrPerHour)`; `quantity` multiplies material/time, adders apply per part; `+ packagingInr`; `+ shipping` from `data/shipping.json` by `(massG × qty + boxGrams) × 1.15`. All numbers are placeholders for the owner to calibrate. Minimum order ₹299. Colours: a list in `pricing.prints.json` (what spools the owner stocks); "other colour on request" → `note` field.

Rejections the quote gives *before* order: outside the volume after lay-flat (offer scale-to-fit if ≤ 10 % down); non-manifold mesh (still orderable, flagged for the owner); > 24 h print (orderable, flagged "quote may be revised").

## 7. Print-from-phone handoff — the honest version

The page's output is a file. How it reaches a printer from a phone:
1. **Bambu Studio / Bambu Handy.** A sliced `.gcode.3mf` opens in Bambu Studio on desktop and can be sent to the printer. Whether Handy can open a *local* sliced file from the phone is **not verified** as of 2026-11-04 (forum threads from 2024–25 asked for it; no documentation found saying it exists). Claude Code must not write copy claiming it. Owner verifies on his own A1 mini and sets `data/handoff.json → handy.localFile: true|false`; the page shows the Handy route only when true.
2. **SD card.** Always works: copy the file to the printer's microSD. Shown always.
3. **Alloy (Android).** Alloy implements Bambu LAN transport (`docs/BAMBU_LAN_TRANSPORT.md`). When Alloy is installed, the page offers *"Send to Alloy"* via Web Share Target / an `intent://` link with the file; Alloy pushes over LAN in Developer Mode. This is the sovereign route and the reason the native app exists. Until Alloy ships, the button is hidden (feature-flag `handoff.alloy`).
4. **Other printers (Klipper/Moonraker, OctoPrint, PrusaLink).** Plain `.gcode` download. The page cannot POST to a LAN printer from https (mixed content), so it does not pretend to; it says "upload in your printer's own interface".
5. **Order from here.** The route that needs none of the above.

## 8. Order kind `print` (ledger + Counter)

Order carries: `{ model: { name, bytes, sha256, storageKey }, settings, estimate: { massG, printMin, supports, manifold }, tier, qty, colour, filament, note, quote: { base, finish, packaging, shipping, total, band: 0.2 } }`. The model file goes to the object store (§9), **not** into git. Owner sees the quote and the estimate; accepts (optionally editing `total` within the band, or above it with a reason the customer sees) → Razorpay link → paid → `in_production` → `finishing` (tier work) → `dispatched` with tracking → `delivered`. Rejected → customer gets the reason, file deleted immediately. Model files are deleted 30 days after dispatch (TTL rule on the store) and on rejection/expiry.

## 9. Object storage for models

Cloudflare R2 (S3 API, private bucket, presigned PUT from the function, zero egress) — or Vercel Blob if the owner prefers one vendor. Abstracted in `api/counter/_storage.js` (`presignUpload(key, size, type)`, `delete(key)`, `presignDownload(key)` for the owner app). Max 100 MB; types `model/stl`, `model/3mf`, `model/obj`, `application/octet-stream` with magic-byte check client-side. Disclosed on the privacy page.

## 10. Acceptance (A5, Stage 0)

- Drop a 20 mm cube STL: fits, lights up; estimate mass ≈ 8 g at 15 % infill 0.2 mm (±20 % once calibrated), time ≈ 25–35 min; moving it off the plate greys it; lay-flat works on a tilted cube.
- `tools/estimate.test.mjs` passes (synthetic fixtures).
- Quote for `processed × 2` matches a hand computation from the JSON; shipping band picks by estimated mass.
- Order creates a ledger entry and uploads the model via presigned URL; nothing is uploaded before the order button.
- Page passes `tools/check-analytics-boundary.sh`; the heavy bundle (`three` + worker) loads only after a file is chosen.
