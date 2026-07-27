# asystemofcells

Monorepo for `asystemofcells.com` (the product house) and `asystemofcells.dev`
(the developer surface), plus the shared packages both consume.

```
apps/asoc-com     asystemofcells.com - the product house / marketing surface
apps/asoc-dev     asystemofcells.dev - the builder/engineering surface
packages/kit      shared Astro components, layout, SEO, design tokens (from Hyle)
packages/roster   the single roster.public.json + a typed loader
```

## The analytics boundary

One rule, and it is enforced by structure rather than by configuration:
**pages that describe the house are counted, pages where someone makes, reads,
or runs something are not.**

Cookieless Vercel Web Analytics runs on the Astro-rendered pages of `.com` and
on all of `.dev`. It never runs in the Nooz reader or the generators, because
those are static files under `apps/asoc-com/public/`, which Astro copies
verbatim and never injects into. No layout change can reach them.

That distinction is load-bearing. Vercel's `beforeSend` hook is a
send-suppressor, not a load-suppressor: it still ships and runs the script and
merely skips the outbound request, and Vercel documents no way to keep the
script from loading on a route. So the only real mechanism is structural, and
`BaseLayout.astro` therefore defaults `analytics` to **false** and makes pages
opt in. A marketing page that forgets loses one datapoint; a tool page that
forgets would break a printed promise.

`mdhv.xyz` is a separate repo entirely.

## Develop

```
pnpm install
pnpm dev          # asoc-com   -> asystemofcells.com
pnpm dev:dev      # asoc-dev   -> asystemofcells.dev
pnpm build        # asoc-com   -> apps/asoc-com/dist
pnpm build:dev    # asoc-dev   -> apps/asoc-dev/dist
```

### Deploying the second site

`vercel.json` at the repo root configures the `.com` project only: it pins
`outputDirectory` to `apps/asoc-com/dist`, and the root `api/*.js` functions
behind the Nooz reader require that project's Root Directory to stay `/`.

`.dev` therefore needs its **own Vercel project pointed at this same repo**,
rather than a change to that file. In the new project's settings:

- Root Directory: `/` (leave it, so the pnpm workspace resolves)
- Install Command: `pnpm install`
- Build Command: `pnpm run build:dev`
- Output Directory: `apps/asoc-dev/dist`
- Domain: `asystemofcells.dev`

Nothing about the `.com` project changes. The two builds share the workspace
and the lockfile, and each one only builds its own app.

See `packages/roster/README.md` for what's confirmed vs. still needs an owner
confirm in the product roster.
