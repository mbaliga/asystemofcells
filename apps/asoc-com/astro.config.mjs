import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://asystemofcells.com',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
})
