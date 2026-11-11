import { getCabinetItems, catalogEntry } from '../../lib/cabinet.js'

// Read by the Counter function to price an order from the same markdown the page shows.
export async function GET() {
  const items = await getCabinetItems()
  const body = Object.fromEntries(items.map((e) => [e.slug, catalogEntry(e)]))
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
}
