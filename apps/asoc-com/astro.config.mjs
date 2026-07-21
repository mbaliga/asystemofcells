import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://asystemofcells.com',
  output: 'static',
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
})
