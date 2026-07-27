import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://fonebrew.com',
  output: 'static',
  integrations: [
    sitemap({
      // The editor is a hand-written static file under public/, not an Astro
      // route, so it is not in the sitemap anyway. Filtered explicitly so that
      // stays true if it ever becomes one: a tool page is not a page to index
      // ahead of the thing it is a tool for.
      filter: (page) => !page.includes('/loops/editor'),
    }),
  ],
  vite: {
    resolve: {
      // Same as asoc-com/asoc-dev: the workspace packages are symlinked by
      // pnpm, and Vite must not resolve through the link or the kit's relative
      // imports break.
      preserveSymlinks: true,
    },
  },
})
