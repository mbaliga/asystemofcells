// Item page: add to basket, and flip the button to the ledger's truth.
import { addLine, cartCount, loadCart } from './cart.js'

const btn = document.getElementById('addToBasket')
const note = document.getElementById('stateNote')
const count = document.getElementById('basketCount')
const refresh = () => { if (count) count.textContent = String(cartCount()) }
refresh()

if (btn) {
  const line = JSON.parse(btn.dataset.line)
  const set = (text, disabled) => { note.textContent = text; btn.disabled = disabled }
  btn.addEventListener('click', () => {
    addLine(line); refresh()
    note.textContent = 'In your basket.'
    btn.textContent = line.kind === 'curiosity' ? 'In your basket' : 'Add another'
    btn.disabled = line.kind === 'curiosity'
    document.getElementById('toBasket').hidden = false
  })
  if (loadCart().some((l) => l.item === line.item) && line.kind === 'curiosity') { btn.disabled = true; btn.textContent = 'In your basket'; document.getElementById('toBasket').hidden = false }
  // Static page, live truth: ask the ledger. A failure leaves the page as built.
  fetch('/api/counter/catalog-state').then((r) => (r.ok ? r.json() : null)).then((s) => {
    const st = s && s.items && s.items[line.item]
    if (!st) return
    if (st.status === 'sold') set('Sold.', true)
    else if (st.status === 'reserved' && line.kind === 'curiosity') set(`Reserved until ${new Date(st.reservedUntil).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. You can ask to be told if it frees up.`, true)
    if (st.soldQty != null && line.edition) { const left = line.edition - st.soldQty; if (left <= 0) set('Sold out.', true) }
  }).catch(() => {})
}
