import { getCollection } from 'astro:content'
/** Explorables that are ready: pending entries never reach the index, the sitemap or a page. */
export async function getWork() {
  return (await getCollection('work')).filter((e) => !e.data.pending).sort((a, b) => (b.data.year || 0) - (a.data.year || 0))
}
