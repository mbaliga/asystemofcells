# Wing 3 — Practice (Architecture services)

The owner is a licensed architect (B.Arch MANIT; co-founded Ourean 2024–26) and a Hyle typographer. This wing does three things: shows previous work as **explorables**, gives architects **free tools that run in the browser**, and opens a **commission** path. Images for the work come later from the owner; the scaffold must render cleanly with zero work items published (the section simply doesn't show).

## 1. Pages

- `/architecture` — index. Hero in Hyle Deco hairlines on the ink accent; three strands: *Work · Tools · Commission*. A short paragraph on practice (what kind of work: residential/interiors/branding-for-built-things — owner supplies; until then one honest sentence). Analytics: yes.
- `/architecture/work/{slug}` — explorable; one of three layouts (§2). Analytics: yes (a reading page; nothing is submitted).
- `/architecture/tools` — hub (same component as `/tools` with the architecture set). Analytics: yes.
- `/architecture/tools/sun`, `/wind`, `/vaastu` — tools. **Analytics: never.** Each is an Astro page using `WingLayout` without `analytics`, with its logic in a plain ES module under `src/scripts/arch/`; they share `arch/site.js` (location, north, plot) via `localStorage` key `asoc.arch.site.v1` so a visitor sets the site once.
- `/architecture/commission` — inquiry form → `POST /api/counter/inquiries` `{kind:"commission"}`. Analytics: never.
- `/hyle-fonts` already exists; the tools hub links it as *"Hyle Deco — a hairline face drawn for drawings; free under OFL"* with a one-screen demo of a title block set in Deco (an inline SVG, downloadable as SVG).

## 2. Explorables (`src/content/work/{slug}.md`)

```yaml
title: "…"
year: 2025
role: ["architecture", "brand"]       # tags
location: "Hyderabad"
layout: scroll | compare | plan
cover: "cover.jpg"
pending: true                          # true → excluded from index + sitemap; page 404s. Flip when images land.
scenes:
  - kind: pin                          # scroll layout: pinned image, text steps scroll past
    image: "01.jpg"
    steps: ["The brief…", "The section…"]
  - kind: compare                      # compare layout: two images, a draggable divider
    before: "plan.png"; after: "built.jpg"; labels: ["Drawing", "Built"]
  - kind: plan                         # plan layout: one image + hotspots
    image: "plan.png"
    hotspots: [{ x: 0.42, y: 0.31, title: "Court", body: "…" }]
```

Layouts are three small vanilla modules (`explorable-scroll.js` using `IntersectionObserver`; `explorable-compare.js` with pointer events; `explorable-plan.js` with absolutely positioned hotspots and a focus-visible ring). Images via `<Image>` with `sizes`. Captions in the UI face; no boxes; hotspots are cell-marks, not numbered circles.

Seed with three `pending: true` entries named after real work (the owner fills titles): the build must not invent project descriptions.

## 3. Tools

All three tools follow the same honesty shape: **compute locally, label what is traditional vs physical, mark any cloud fetch as a watched object with a button the visitor presses.**

### 3.1 Sun — sun path and shadows (`/architecture/tools/sun`)

What it is: a solar-position calculator with a 3D massing shadow study. Inputs: latitude/longitude (default Hyderabad 17.385, 78.4867; a geolocation button is a browser permission the visitor grants — mark it), date, time, time zone (IANA; default `Asia/Kolkata`), true-north offset of the plot. Massing: draw a rectangle footprint on a plan grid, set height and storeys; add up to five blocks (neighbours).

Outputs:
- Sun path diagram (stereographic): hourly arcs for the equinoxes and solstices, today's path, the current sun as a cell-mark, azimuth/elevation readout.
- 3D view (`three`, dynamic import): matte low-poly blocks on a ground plane, a `DirectionalLight` set from the computed azimuth/elevation with shadow map on; a time scrubber (sunrise→sunset) and a date scrubber (Jan→Dec); "shadow range" overlay = union of shadows between 09:00 and 15:00 (toggle), rendered as a translucent ground decal. Same visual grammar as the Alloy plate preview: fog, no horizon, one key light from upper-left plus the sun.
- Export: PNG of either view; CSV of the day's sun table (10-minute steps).

Algorithm (`tools/sunpath.mjs` in this bundle is the reference implementation with tests; port it 1:1 to `src/scripts/arch/sunpath.js`): NOAA's solar calculator method — Julian century from the UTC instant; geometric mean longitude and anomaly; equation of centre; apparent longitude with the nutation term; obliquity with its correction; declination; equation of time; true solar time from longitude and EoT; hour angle; zenith with a refraction correction; azimuth by hemisphere of the hour angle. Accuracy ≈ 0.01° for 1950–2050, which is far better than the tool needs. Sunrise/sunset: zenith 90.833°. Test vectors in `tools/sunpath.test.mjs` (Hyderabad solstice noons: June sun is north of zenith — azimuth ≈ 0°, elevation ≈ 83.9°; December azimuth ≈ 180°, elevation ≈ 49.2°).

### 3.2 Wind — wind rose and ventilation legibility (`/architecture/tools/wind`)

What it is, honestly: **not CFD.** A wind rose for the site from climate normals, overlaid on the plan, plus a rule-based cross-ventilation read: for each face of the footprint, is it windward or leeward for the prevailing months (monsoon SW, winter NE for most of peninsular India), and do the openings the visitor marks on faces produce a through-path?

Data: `data/windroses/{city}.json` — pre-baked 16-sector roses per month for ~20 Indian cities, built once by `tools/build-windrose.mjs` from the NASA POWER API (hourly `WS10M`, `WD10M`, 2015–2024). **That fetch happens at build time by the owner, never on the visitor's page.** For an arbitrary location the page offers a clearly marked cloud button: *"Fetch climate normals from NASA POWER (cloud)"* with the watched-object glyph; nothing is fetched until pressed.

Outputs: monthly rose (SVG, 16 sectors × 4 speed bands, luminance-coded with hatching for the top band — never hue alone), prevailing-direction arrow on the plan, a face-by-face table (windward/leeward per season, opening present or not, through-path yes/no), and the Beaufort-band speeds. Explanations behind ⓘ.

### 3.3 Vaastu — mandala grid tool (`/architecture/tools/vaastu`)

What it is: a Vastu Purusha Mandala overlay. The visitor draws or uploads a plan image, sets north and plot corners, and the tool lays a 9×9 (81-pada) grid with the 8 directional zones and the finer 16-zone ring, names the 32 perimeter padas, and lets the visitor tag rooms by function on the plan. It then lists, per the traditional tables in `data/vaastu.zones.json`: recommended functions for the zone each room sits in, functions traditionally avoided there, and whether the entrance falls on a pada the tradition favours. Output is a report (print stylesheet, Hyle Deco headings) and a **"Ask Madhav about this plan"** link that pre-fills the commission form with the report attached as JSON.

Tone and labelling: the page states, once, that Vastu is a traditional design system, not a physical model, and that the tables are the practitioner's working set, editable by the owner. No fear-language ("dosha", "inauspicious") on the surface — the report says *"the tradition places X here"*. The owner is a licensed architect and offers consultation; the tool is the on-ramp, not the verdict.

Geometry: plot polygon → oriented bounding square aligned to true north (rotate the image by the north offset); 9×9 cells; zone lookup by cell index (`data/vaastu.zones.json` has the cell→zone map for 8 and 16 zones and the 32 pada names clockwise from NE along the east side, matching the classical order). Room polygons → zone coverage % by rasterising at 1 px.

### 3.4 Later tools (do not build now; leave the hub hooks)
- Telangana building-rules quick check (setbacks/FSI/height by plot size) — data must come from the owner.
- Area statement generator (carpet/built-up/super built-up from room polygons) — easy once the plan tool exists; share the polygon editor.

## 4. Commission (`/architecture/commission`)

Fields: name, email, phone (optional), where (city/country), what (residential / interior / brand & identity for a space / consultation / other), scale (text), timeline, budget band (optional, select), message, optional attachments (PDF/images ≤ 10 MB total; uploaded to the ledger only after submit, see Counter §5). Submits `kind: "commission"`. Success page: "Madhav replies by email, usually within three days." No analytics, no honeypot vendor — a simple time-on-page + hidden-field honeypot in the function.

## 5. Acceptance (A6)

- Sun: all test vectors in `tools/sunpath.test.mjs` pass in the ported module (`node --test`); the 3D view renders with shadows on a mid-range phone (no WebGL2 → falls back to the diagram only, with a sentence saying so).
- Wind: Hyderabad rose renders from the baked file; the cloud button is inert until pressed and labelled.
- Vaastu: a square plot with north up maps the NE cell to the Ishanya zone; rotating north by 90° rotates the zones; entrance on pada N3 reports as favoured per the table.
- Work index hides `pending` entries; sitemap excludes them.
- Commission inquiry lands in the dev ledger with attachments only on success.
