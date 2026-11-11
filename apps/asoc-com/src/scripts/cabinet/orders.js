// The order status page: reached only through the link in the customer's email.
const p = new URLSearchParams(location.search)
const id = p.get('id'), t = p.get('t')
const root = document.getElementById('orderRoot')
const say = (s) => { root.textContent = s }
const LABEL = { placed: 'Placed', reviewing: 'Being reviewed', accepted: 'Accepted — waiting for payment', paid: 'Paid', in_production: 'Being made', finishing: 'Being finished', dispatched: 'On its way', delivered: 'Delivered', rejected: 'Not taken on', cancelled: 'Cancelled', expired: 'Expired', refunded: 'Refunded' }

async function load() {
  if (!id || !t) return say('This page needs the link from your order email.')
  const res = await fetch(`/api/counter/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(t)}${p.get('v') === '1' ? '&v=1' : ''}`)
  if (!res.ok) return say('We could not find that order. Check the link in your email.')
  const o = await res.json()
  root.replaceChildren()
  const h = document.createElement('h2'); h.textContent = LABEL[o.status] || o.status
  const meta = document.createElement('p'); meta.textContent = `Order ${o.id} · ₹${o.quote.total}`
  root.append(h, meta)
  if (o.acceptedNote) { const n = document.createElement('p'); n.textContent = o.acceptedNote; root.append(n) }
  if (!o.emailVerified) { const v = document.createElement('p'); v.textContent = 'Please confirm your email by opening the link in your email; unconfirmed orders close after 24 hours.'; root.append(v) }
  if (o.payment && o.payment.shortUrl) { const a = document.createElement('a'); a.className = 'cab-btn'; a.href = o.payment.shortUrl; a.textContent = 'Pay now'; a.rel = 'noopener'; root.append(a) }
  if (o.fulfilment && o.fulfilment.tracking) { const f = document.createElement('p'); f.textContent = `${o.fulfilment.carrier}: ${o.fulfilment.tracking}`; root.append(f) }
  const ul = document.createElement('ul'); ul.className = 'cab-timeline'
  for (const e of o.timeline) { const li = document.createElement('li'); li.textContent = `${new Date(e.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} — ${LABEL[e.status] || e.status}${e.note ? ': ' + e.note : ''}`; ul.append(li) }
  root.append(ul)
  if (['placed', 'reviewing', 'accepted'].includes(o.status)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cab-link'; b.textContent = 'Cancel this order'
    b.addEventListener('click', async () => { if (!confirm('Cancel this order?')) return; await fetch(`/api/counter/orders/${encodeURIComponent(id)}/cancel?t=${encodeURIComponent(t)}`, { method: 'POST' }); load() })
    root.append(b)
  }
}
load()
