# asystemofcells

Monorepo for `asystemofcells.com` (the product house), `asystemofcells.dev`
(the developer surface) and `fonebrew.app` (one cell with its own site), plus
the shared packages they consume.

```
apps/asoc-com       asystemofcells.com - the product house / marketing surface
apps/asoc-dev       asystemofcells.dev - the builder/engineering surface
apps/fonebrew-app   fonebrew.app       - the Fonebrew product site + loop gallery
packages/kit        shared Astro components, layout, SEO, design tokens (from Hyle)
packages/roster     the single roster.public.json + a typed loader
packages/loops      the single loops.public.json + a loader (the Fonebrew gallery)
```

Fonebrew is a hub cell: it has its own authoritative site rather than a product
page on `.com`, the same relationship `animalcules.app` has. A `fonebrew.dev`
mirroring the `.com`/`.dev` split is the natural next step and does not exist
yet. `packages/roster`'s `hubUrl` for the `fonebrew` entry points at
`fonebrew.app`, matching this app.

## The analytics boundary

One rule, and it is enforced by structure rather than by configuration:
**pages that describe the house are counted, pages where someone makes, reads,
or runs something are not.**

Cookieless Vercel Web Analytics runs on the Astro-rendered pages of `.com` and
on all of `.dev`. It never runs in the Nooz reader or the generators, because
those are static files under `apps/asoc-com/public/`, which Astro copies
verbatim and never injects into. No layout change can reach them.
**`fonebrew.app` runs none at all**, on any page — see below.

That distinction is load-bearing. Vercel's `beforeSend` hook is a
send-suppressor, not a load-suppressor: it still ships and runs the script and
merely skips the outbound request, and Vercel documents no way to keep the
script from loading on a route. So the only real mechanism is structural, and
`BaseLayout.astro` therefore defaults `analytics` to **false** and makes pages
opt in. A marketing page that forgets loses one datapoint; a tool page that
forgets would break a printed promise.

### The `analytics={false}` prop is not on its own a mechanism

Worth knowing before writing a page that opts out, because it is not obvious and
it was found by checking a build rather than by reading the code:

**Astro collects a page's `<script>`s from the static module graph, not from
what actually renders.** `@vercel/analytics/astro` does its work from a bundled
`<script>`, so a plain top-level `import Analytics from '@vercel/analytics/astro'`
in a layout puts the analytics chunk on **every page that layout renders**, even
where `{analytics && <Analytics />}` is false. Moving it behind a dynamic
`await import(...)` does not help either — Astro walks those too.

This is not currently a live leak: every Astro page in `.com` and `.dev` opts
in, so neither has an opted-out page shipping the script. It becomes one the
day either grows a page that opts out. `fonebrew.app`, where nothing opts in,
handles it the only way that works — the module is not imported in that app at
all, and `apps/fonebrew-app/src/layouts/BaseLayout.astro` carries the two
commented lines that turn it on plus the full note.

`mdhv.xyz` is a separate repo entirely.

## Develop

```
pnpm install
pnpm dev            # asoc-com      -> asystemofcells.com
pnpm dev:dev        # asoc-dev      -> asystemofcells.dev
pnpm dev:fonebrew   # fonebrew-app  -> fonebrew.app
pnpm build          # asoc-com      -> apps/asoc-com/dist
pnpm build:dev      # asoc-dev      -> apps/asoc-dev/dist
pnpm build:fonebrew # fonebrew-app  -> apps/fonebrew-app/dist
```

`pnpm-workspace.yaml` already globs `apps/*` and `packages/*`, so a new app or
package needs no registration there — only its own `package.json` and, by
convention, a pair of root scripts like the ones above.

### Deploying the second and third sites

`vercel.json` at the repo root configures the `.com` project only: it pins
`outputDirectory` to `apps/asoc-com/dist`, and the root `api/*.js` functions
behind the Nooz reader require that project's Root Directory to stay `/`.

`.dev` and `fonebrew.app` therefore each need their **own Vercel project pointed
at this same repo**, rather than a change to that file. In each new project's
settings:

- Root Directory: `/` (leave it, so the pnpm workspace resolves)
- Install Command: `pnpm install`
- Build Command: `pnpm run build:dev` / `pnpm run build:fonebrew`
- Output Directory: `apps/asoc-dev/dist` / `apps/fonebrew-app/dist`
- Domain: `asystemofcells.dev` / `fonebrew.app`

Nothing about the `.com` project changes. The builds share the workspace and the
lockfile, and each one only builds its own app.

See `packages/roster/README.md` for what's confirmed vs. still needs an owner
confirm in the product roster, and `packages/loops/README.md` plus
`apps/fonebrew-app/CONTRIBUTING.md` for how a loop joins the gallery.
