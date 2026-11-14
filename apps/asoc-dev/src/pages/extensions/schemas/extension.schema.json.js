// Served at /extensions/schemas/extension.schema.json. Generated at build time from
// extensions/sdk/schemas/extension.schema.json in the repo, byte for byte.
import { rawExtensionSchema } from '../../../lib/extensions-docs.js'

export function GET() {
  return new Response(rawExtensionSchema(), { headers: { 'Content-Type': 'application/schema+json; charset=utf-8' } })
}
