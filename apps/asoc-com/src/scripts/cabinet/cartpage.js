import { loadCart, removeLine, setQty, cartQuote, inr, maxQty } from './cart.js'

const root = document.getElementById('cartRoot')
const render = () => {
  const lines = loadCart()
  root.replaceChildren()
  if (!lines.length) {
    const p = document.createElement('p'); p.className = 'cab-empty'; p.textContent = 'Your basket is empty.'
    const a = document.createElement('a'); a.href = '/cabinet/'; a.className = 'cab-link'; a.textContent = 'Back to the cabinet'
    root.append(p, a); return
  }
  const q = cartQuote(lines, 'IN')
  const ul = document.createElement('ul'); ul.className = 'cab-lines'
  for (const l of lines) {
    const li = document.createElement('li')
    const name = document.createElement('a'); name.href = `/cabinet/${l.item}/`; name.textContent = l.title
    const qty = document.createElement('input'); qty.type = 'number'; qty.min = 1; qty.max = maxQty(l); qty.value = l.qty; qty.disabled = l.kind === 'curiosity'; qty.setAttribute('aria-label', `Quantity of ${l.title}`)
    qty.addEventListener('change', () => { setQty(l.item, Number(qty.value)); render() })
    const price = document.createElement('span'); price.textContent = inr(l.unitInr * l.qty)
    const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'Remove'; rm.addEventListener('click', () => { removeLine(l.item); render() })
    li.append(name, qty, price, rm); ul.append(li)
  }
  const tot = document.createElement('p'); tot.className = 'cab-total'
  tot.textContent = `Pieces ${inr(q.subtotal)} · shipping within India from ${inr(q.shipping)} · shown again, exactly, at checkout.`
  const go = document.createElement('a'); go.href = '/cabinet/checkout/'; go.className = 'cab-btn'; go.textContent = 'Check out'
  root.append(ul, tot, go)
}
render()
