// Served at /extensions/permissions.json. Generated at build time from
// extensions/tools/permissions.json in the repo, byte for byte.
import { rawPermissions } from '../../lib/extensions-docs.js'

export function GET() {
  return new Response(rawPermissions(), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
