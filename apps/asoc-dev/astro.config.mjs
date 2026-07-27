import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://asystemofcells.dev',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    resolve: {
      // Same as asoc-com: the workspace packages are symlinked by pnpm, and
      // Vite must not resolve through the link or the kit's relative imports
      // break.
      preserveSymlinks: true,
    },
  },
})
