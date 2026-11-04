import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  // The host the site is actually served from: the bare domain 308-redirects
  // here. Every canonical, og:url, sitemap entry and JSON-LD url is derived from
  // this, so if the primary domain is ever flipped in the host's settings this
  // is the one line to change (plus robots.txt).
  site: 'https://www.asystemofcells.com',
  trailingSlash: 'always',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
})
