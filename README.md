# asystemofcells

Monorepo for `asystemofcells.com` (the product house) and `asystemofcells.dev`
(the developer surface), plus the shared packages both consume.

```
apps/asoc-com     asystemofcells.com - the product house / marketing surface
apps/asoc-dev     asystemofcells.dev - the builder/engineering surface
packages/kit      shared Astro components, layout, SEO, design tokens (from Hyle)
packages/roster   the single roster.public.json + a typed loader
```

Zero analytics, zero third-party runtime scripts, on both `.com` and `.dev`.
`mdhv.xyz` is the one exception in the wider constellation and is a separate
repo entirely.

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
