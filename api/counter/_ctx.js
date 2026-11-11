// Builds the production context from env. Handlers call ctx() once per request.
import { getLedger } from './_ledger.js'
import { getStorage } from './_storage.js'
import { getNotifiers } from './_notify.js'
import { getRazorpay } from './_razorpay.js'
import { env, isProd, HttpError, safeEqual } from './_util.js'

let cache
let catalogCache = { at: 0, data: null }

async function fetchCatalog() {
  if (catalogCache.data && Date.now() - catalogCache.at < 60000) return catalogCache.data
  const url = env('CATALOG_URL') || `${siteUrl()}/cabinet/catalog.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('catalog ' + res.status)
  const data = await res.json()
  catalogCache = { at: Date.now(), data }
  return data
}

export const siteUrl = () => (env('SITE_URL') || 'https://asystemofcells.com').replace(/\/$/, '')

export async function ctx() {
  if (cache) return cache
  const { ntfy, mail } = getNotifiers()
  cache = { ledger: await getLedger(), storage: getStorage(), ntfy, mail, razorpay: getRazorpay(), catalog: fetchCatalog, siteUrl: siteUrl(), now: () => Date.now(), deployHook: env('DEPLOY_HOOK_URL') || '' }
  return cache
}

/** Owner endpoints: bearer COUNTER_OWNER_TOKEN. */
export function requireOwner(req) {
  // Vercel cron sends `Bearer ${CRON_SECRET}`; the owner app sends COUNTER_OWNER_TOKEN.
  const wants = [env('COUNTER_OWNER_TOKEN'), env('CRON_SECRET')].filter(Boolean)
  const want = wants[0]
  if (!want) {
    if (isProd()) throw new HttpError(503, 'not_configured', 'The counter is not configured.')
    return // dev: open, like the in-memory ledger
  }
  const m = /^Bearer (.+)$/.exec((req.headers && req.headers.authorization) || '')
  if (!m || !wants.some((w) => safeEqual(m[1], w))) throw new HttpError(401, 'unauthorized', 'Not allowed.')
}
