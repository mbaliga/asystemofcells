// The Cabinet's pieces for this build. Sample entries are dropped from a
// production deploy (same rule as @asoc/roster/sections placeholders).
import { getCollection } from 'astro:content'
import { placeholdersHidden } from '@asoc/roster/sections'

export async function getCabinetItems() {
  const all = await getCollection('cabinet')
  const items = placeholdersHidden() ? all.filter((e) => !e.data.sample) : all
  return items.filter((e) => e.data.status !== 'archived').sort((a, b) => a.id.localeCompare(b.id))
}

export const slugOf = (entry) => entry.slug

export const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', sold: 'Sold' }

/** What the Counter function needs per piece (the page's catalog.json). */
export function catalogEntry(entry) {
  const d = entry.data
  return {
    title: d.title.replace(/^Sample: /, ''), kind: d.kind, status: d.status, priceInr: d.price.inr, weightGrams: d.weightGrams,
    fragile: d.fragile, shipsTo: d.shipsTo, ...(d.edition ? { editionSize: d.edition.size, editionSold: d.edition.sold } : {}),
  }
}

export function kickerOf(d) {
  return d.kind === 'made' ? `Edition of ${d.edition.size}` : `Curiosity · ${d.condition}`
}
