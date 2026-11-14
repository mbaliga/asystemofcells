// Serves screenshots that live in the repo's extensions/ folder; external screenshot URLs are never hotlinked.
import { readFileSync } from 'node:fs'
import { loadStore, localAsset } from '../../../../lib/extensions.js'

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
export function getStaticPaths() {
  const out = []
  for (const e of loadStore().extensions) {
    e.screenshots.forEach((u, i) => {
      const f = localAsset(u)
      const ext = f && f.slice(f.lastIndexOf('.')).toLowerCase()
      if (f && TYPES[ext]) out.push({ params: { app: e.app, id: e.id, n: String(i) }, props: { file: f, type: TYPES[ext] } })
    })
  }
  return out
}
export function GET({ props }) {
  return new Response(readFileSync(props.file), { headers: { 'Content-Type': props.type } })
}
