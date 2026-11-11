// One Vercel function serves all of Counter (api/counter/[...path].js). The Hobby plan allows 12 functions per
// deployment and the site already has two, so the routes live under _routes/ (underscore: not functions) and
// this table maps method + path to them. The imports are static so the bundler traces every route.
import orders from './_routes/orders.js'
import orderById from './_routes/orders/[id].js'
import orderCancel from './_routes/orders/[id]/cancel.js'
import orderModel from './_routes/orders/[id]/model.js'
import inquiries from './_routes/inquiries.js'
import catalogState from './_routes/catalog-state.js'
import razorpay from './_routes/webhooks/razorpay.js'
import ownerOrders from './_routes/owner/orders/index.js'
import ownerOrder from './_routes/owner/orders/[id].js'
import ownerAccept from './_routes/owner/orders/[id]/accept.js'
import ownerReject from './_routes/owner/orders/[id]/reject.js'
import ownerStatus from './_routes/owner/orders/[id]/status.js'
import ownerRebuild from './_routes/owner/rebuild.js'
import ownerSold from './_routes/owner/catalog/sold.js'
import { send } from './_util.js'

// ':id' segments become req.query.id. Each handler does its own method check.
export const ROUTES = [
  ['orders', orders], ['orders/:id', orderById], ['orders/:id/cancel', orderCancel], ['orders/:id/model', orderModel],
  ['inquiries', inquiries], ['catalog-state', catalogState], ['webhooks/razorpay', razorpay],
  ['owner/orders', ownerOrders], ['owner/orders/:id', ownerOrder], ['owner/orders/:id/accept', ownerAccept],
  ['owner/orders/:id/reject', ownerReject], ['owner/orders/:id/status', ownerStatus], ['owner/rebuild', ownerRebuild], ['owner/catalog/sold', ownerSold],
].map(([pattern, handler]) => ({ parts: pattern.split('/'), handler }))

export function match(pathname) {
  const segs = pathname.replace(/^\/api\/counter\/?/, '').replace(/\/$/, '').split('/').filter(Boolean)
  for (const r of ROUTES) {
    if (r.parts.length !== segs.length) continue
    const query = {}
    if (r.parts.every((p, i) => (p.startsWith(':') ? ((query[p.slice(1)] = decodeURIComponent(segs[i])), true) : p === segs[i]))) return { handler: r.handler, query }
  }
  return null
}

export async function dispatch(req, res) {
  const url = new URL(req.url, 'http://x')
  // On Vercel, vercel.json rewrites /api/counter/:path+ to /api/counter?__p=:path+ (a dynamic [...path] file name
  // does not survive the site's trailingSlash setting), and req.query carries the merged query. Locally the
  // dev server passes the original URL. Either way the route comes from __p when present, else from the path.
  const q = { ...Object.fromEntries(url.searchParams), ...(req.query || {}) }
  const routed = q.__p
  delete q.__p
  const m = match(routed !== undefined ? '/api/counter/' + routed : url.pathname)
  if (!m) return send(res, 404, { error: { code: 'not_found', message: 'No such counter route.' } })
  // The path wins over a same-named query parameter: a caller must not be able to override :id.
  req.query = { ...q, ...m.query }
  return m.handler(req, res)
}
