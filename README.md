# asystemofcells

Monorepo for `asystemofcells.com` (the product house) and `asystemofcells.dev`
(the developer surface), plus the shared packages both consume.

```
apps/asoc-com     asystemofcells.com - the product house / marketing surface
apps/asoc-dev     asystemofcells.dev - the builder/engineering surface (not started yet)
packages/kit      shared Astro components, layout, SEO, design tokens (from Hyle)
packages/roster   the single roster.public.json + a typed loader
```

Zero analytics, zero third-party runtime scripts, on both `.com` and `.dev`.
`mdhv.xyz` is the one exception in the wider constellation and is a separate
repo entirely.

## Develop

```
pnpm install
pnpm dev        # asoc-com
```

See `packages/roster/README.md` for what's confirmed vs. still needs an owner
confirm in the product roster.
