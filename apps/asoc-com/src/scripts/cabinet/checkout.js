// Checkout: one POST to the Counter. The customer's figure is a preview; the
// server recomputes and its number is the one shown on the status page.
import { loadCart, clearCart, cartQuote, inr } from './cart.js'

const form = document.getElementById('checkoutForm')
const lines = loadCart()
const startedAt = Date.now()
const out = document.getElementById('msg')
const summary = document.getElementById('summary')
const submit = form.querySelector('button[type=submit]')
const zoneOf = () => (form.country.value.trim().toUpperCase() === 'IN' ? 'IN' : 'INTL')

function showQuote() {
  if (!lines.length) { summary.textContent = 'Your basket is empty.'; submit.disabled = true; return }
  const q = cartQuote(lines, zoneOf())
  summary.textContent = `${lines.map((l) => `${l.title} × ${l.qty}`).join(', ')} — pieces ${inr(q.subtotal)}, shipping ${inr(q.shipping)}, total ${inr(q.total)}.` + (zoneOf() === 'INTL' ? ' Customs and duties at destination are the recipient’s.' : '') + (q.overTable ? ' This parcel is heavier than the shipping table; shipping will be confirmed when we accept.' : '')
}
showQuote(); form.country.addEventListener('input', showQuote)

// One key per basket content, kept for the tab: a double click or a retry returns the same order.
const keyFor = () => {
  const sig = JSON.stringify(lines.map((l) => [l.item, l.qty]))
  try {
    const have = JSON.parse(sessionStorage.getItem('asoc-checkout-key') || 'null')
    if (have && have.sig === sig) return have.key
    const key = 'c' + crypto.randomUUID().replace(/-/g, '')
    sessionStorage.setItem('asoc-checkout-key', JSON.stringify({ sig, key })); return key
  } catch { return 'c' + crypto.randomUUID().replace(/-/g, '') }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  out.textContent = ''
  submit.disabled = true; submit.textContent = 'Placing…'
  const f = new FormData(form)
  const q = cartQuote(lines, zoneOf())
  const body = {
    kind: 'cabinet', idempotencyKey: keyFor(), startedAt, website: f.get('website') || '',
    customer: { name: f.get('name'), email: f.get('email'), phone: f.get('phone') || '' },
    shipTo: { line1: f.get('line1'), line2: f.get('line2') || '', city: f.get('city'), state: f.get('state'), postcode: f.get('postcode'), country: String(f.get('country')).toUpperCase() },
    items: lines.map((l) => ({ item: l.item, qty: l.qty })), clientQuote: { total: q.total }, note: f.get('note') || '',
  }
  try {
    const res = await fetch('/api/counter/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    if (res.ok) { clearCart(); try { sessionStorage.removeItem('asoc-checkout-key') } catch {} ; location.href = j.statusUrl; return }
    const err = j.error || {}
    if (res.status === 409 && (err.code === 'reserved' || err.code === 'sold')) {
      out.textContent = err.code === 'sold' ? 'Someone has just bought one of these. It is sold.' : `Someone is holding one of these until ${new Date(err.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. Leave your email below and you will be told if it frees up.`
      document.getElementById('waitlist').hidden = false
    } else out.textContent = err.message || 'That did not go through. Nothing was charged. Try again.'
  } catch { out.textContent = 'Could not reach the counter. Nothing was charged. Try again.' }
  submit.disabled = false; submit.textContent = 'Place order'
})

const wl = document.getElementById('waitlist')
wl.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = wl.querySelector('input[name=wemail]').value
  const res = await fetch('/api/counter/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'waitlist', idempotencyKey: 'w' + crypto.randomUUID().replace(/-/g, ''), startedAt: startedAt - 0, fields: { email, item: lines.map((l) => l.item).join(',').slice(0, 80) } }) })
  wl.querySelector('p').textContent = res.ok ? 'Noted. You will hear if it frees up.' : 'Could not save that. Try again.'
})
