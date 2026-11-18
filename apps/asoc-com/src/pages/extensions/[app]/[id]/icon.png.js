// Serves the extension's own icon from the repo at build time, so the store never loads images from a third-party host.
import { readFileSync } from 'node:fs'
import { loadStore, localAsset } from '../../../../lib/extensions.js'

export function getStaticPaths() {
  return loadStore().extensions.filter((e) => localAsset(e.icon)).map((e) => ({ params: { app: e.app, id: e.id }, props: { file: localAsset(e.icon) } }))
}
export function GET({ props }) {
  return new Response(readFileSync(props.file), { headers: { 'Content-Type': 'image/png' } })
}
