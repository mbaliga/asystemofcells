// The Cabinet basket: localStorage only; nothing leaves the browser until the
// customer presses the order button on the checkout page.
import { quoteCabinet } from '../../../../../api/counter/_quote.js'

const KEY = 'asoc-cabinet-cart-v1'

export function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter((l) => l && typeof l.item === 'string' && l.qty >= 1) : []
  } catch { return [] }
}
function save(lines) { try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch { /* private mode: the basket lives this page only */ } return lines }

/** Curiosities are one of one; editions are capped at what is left. */
export function maxQty(line) { return line.kind === 'curiosity' ? 1 : Math.max(1, line.left ?? 20) }

export function addLine(line) {
  const lines = loadCart()
  const have = lines.find((l) => l.item === line.item)
  if (have) have.qty = Math.min(maxQty(have), have.qty + (line.qty || 1))
  else lines.push({ ...line, qty: Math.min(maxQty(line), line.qty || 1) })
  return save(lines)
}
export const removeLine = (item) => save(loadCart().filter((l) => l.item !== item))
export function setQty(item, qty) {
  const lines = loadCart()
  const l = lines.find((x) => x.item === item)
  if (!l) return lines
  l.qty = Math.max(1, Math.min(maxQty(l), Math.floor(qty) || 1))
  return save(lines)
}
export const clearCart = () => save([])
export const cartCount = () => loadCart().reduce((s, l) => s + l.qty, 0)

export function cartQuote(lines, zone = 'IN') {
  return quoteCabinet({ lines: lines.map((l) => ({ unitInr: l.unitInr, qty: l.qty, weightGrams: l.weightGrams, fragile: l.fragile })), zone })
}
export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')
