import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { match, dispatch, ROUTES } from '../_router.js'

function res() {
  const r = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v }, end(b) { this.body = b ?? '' } }
  return r
}

test('every route is reachable and :id binds, with the path winning over a query parameter', () => {
  assert.equal(match('/api/counter/orders').handler, ROUTES[0].handler)
  const m = match('/api/counter/orders/01ABC/cancel'); assert.equal(m.query.id, '01ABC')
  assert.equal(match('/api/counter/owner/orders/01ABC/accept').query.id, '01ABC')
  assert.equal(match('/api/counter/webhooks/razorpay').handler.name, 'handler')
  assert.equal(match('/api/counter/nope'), null); assert.equal(match('/api/counter/orders/a/b/c/d'), null)
  assert.equal(ROUTES.length, 14)
})

test('dispatch: 404 JSON for unknown routes, route errors stay JSON, a query cannot override :id', async () => {
  let r = res(); await dispatch({ url: '/api/counter/nope', method: 'GET', headers: {} }, r)
  assert.equal(r.statusCode, 404); assert.equal(JSON.parse(r.body).error.code, 'not_found')
  r = res(); await dispatch({ url: '/api/counter/orders/01M6NEZEM0484K9J3H01KDEPTV?id=evil&t=x', method: 'GET', headers: {} }, r)
  assert.equal(r.statusCode, 404) // not found, as an order, not a crash
  r = res(); await dispatch({ url: '/api/counter/catalog-state', method: 'GET', headers: {} }, r)
  assert.equal(r.statusCode, 200); assert.ok('items' in JSON.parse(r.body))
  r = res(); await dispatch({ url: '/api/counter/orders', method: 'GET', headers: {} }, r)
  assert.equal(r.statusCode, 405)
})

test('the Vercel form: routed by __p, including a trailing slash, with the original query kept', async () => {
  let r = res(); await dispatch({ url: '/api/counter?__p=catalog-state/', query: { __p: 'catalog-state/' }, method: 'GET', headers: {} }, r)
  assert.equal(r.statusCode, 200)
  r = res(); await dispatch({ url: '/api/counter?__p=orders/01M6NEZEM0484K9J3H01KDEPTV/&t=abc', query: { __p: 'orders/01M6NEZEM0484K9J3H01KDEPTV/', t: 'abc' }, method: 'GET', headers: {} }, r)
  assert.equal(r.statusCode, 404) // an order that does not exist: JSON 404, route and :id resolved
  assert.equal(JSON.parse(r.body).error.code, 'not_found')
  r = res(); await dispatch({ url: '/api/counter?__p=nope/', query: { __p: 'nope/' }, method: 'GET', headers: {} }, r)
  assert.equal(JSON.parse(r.body).error.message, 'No such counter route.')
})

test('Vercel Hobby allows 12 functions per deployment: this repo must stay well under', () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n.startsWith('_') ? [] : walk(p)) : (n.startsWith('_') || !n.endsWith('.js') ? [] : [p]) })
  const fns = walk(new URL('../../', import.meta.url).pathname)
  assert.ok(fns.length <= 6, `${fns.length} functions: ${fns.join(', ')}`)
})
