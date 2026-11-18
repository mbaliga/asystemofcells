// Served at /extensions/schemas/catalog.schema.json. Generated at build time from
// extensions/sdk/schemas/catalog.schema.json in the repo, byte for byte.
import { rawCatalogSchema } from '../../../lib/extensions-docs.js'

export function GET() {
  return new Response(rawCatalogSchema(), { headers: { 'Content-Type': 'application/schema+json; charset=utf-8' } })
}
