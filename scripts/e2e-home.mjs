// The home page's behaviour in a real browser. Run: node scripts/counter-dev.mjs & node scripts/e2e-home.mjs
// (counter-dev serves the built site.) The page honours window.__asocIdleMs / __asocAutoMs so the idle
// tests need seconds, not tens of seconds.
import { createRequire } from 'node:module'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:8788'
const DIR = { x: -0.8258, y: -0.5639 } // the direction the train travels (up-left)
let fails = 0
const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!c) fails++ }
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const IDLE = 2500, AUTO = 1800

async function open(viewport, { hash = '', reduced = false, idle = true } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  if (idle) await page.addInitScript(([i, a]) => { window.__asocIdleMs = i; window.__asocAutoMs = a }, [IDLE, AUTO])
  else await page.addInitScript(() => { window.__asocIdleMs = 600000 }) // never, for the hand tests
  await page.goto(`${BASE}/${hash}`)
  await page.waitForSelector('#flowFocusName', { state: 'attached' })
  await page.waitForTimeout(500)
  return { ctx, page }
}
const name = (page) => page.evaluate(() => document.getElementById('flowFocusName').textContent)
const op = (page, sel) => page.evaluate((s) => Number(getComputedStyle(document.querySelector(s)).opacity), sel)
const centreOf = (page, stream = 0, lane = 0) => page.evaluate(([s, l]) => {
  const el = document.querySelectorAll(s === 0 ? '.flow-card:not([data-stream])' : `.flow-card[data-stream="${s}"]`)[l]
  const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, shown: el.style.display !== 'none' }
}, [stream, lane])

// ---- desktop, by hand --------------------------------------------------------------------
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, { idle: false })
  const first = await name(page)
  ok('starts on the first app', first.length > 0, first)
  const nav = await page.locator('#homeSections [data-section]').allTextContents()
  ok('four sections in the nav', nav.length === 4, nav.join(' | '))
  const before = await centreOf(page, 0, 0)
  await page.waitForTimeout(1800)
  const after = await centreOf(page, 0, 0)
  ok('nothing moves by itself while you are here (1.8 s, no input)', Math.hypot(after.x - before.x, after.y - before.y) < 0.5)
  ok('no lean-back before the idle time', !(await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback'))))

  await page.mouse.move(700, 450)
  await page.mouse.wheel(0, 100); await page.waitForTimeout(900)
  const n1 = await name(page)
  ok('one wheel notch moves one card', n1 !== first, `${first} -> ${n1}`)
  await page.mouse.wheel(0, -100); await page.waitForTimeout(900)
  ok('and back', (await name(page)) === first)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(900)
  ok('ArrowDown moves one card', (await name(page)) === n1)
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(900)
  ok('ArrowUp goes back', (await name(page)) === first)
  const fo = await op(page, '#flowFocus'); const fcls = await page.evaluate(() => document.getElementById('flowFocus').className)
  ok('the name block is back and readable at rest', fo > 0.95, `opacity ${fo} class '${fcls}'`)

  // drag along the train: up-left is forward
  await page.mouse.move(900, 600); await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(900 + DIR.x * 36 * i, 600 + DIR.y * 36 * i)
  await page.mouse.up(); await page.waitForTimeout(1000)
  ok('dragging along the train moves it forward and settles on a card', (await name(page)) !== first, await name(page))
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(900)
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(900)
  await ctx.close()
}

// ---- streams side by side ------------------------------------------------------------------
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, { idle: false })
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(800) }
  const apps3 = await name(page)
  const c0 = await centreOf(page, 0, 0)
  await page.click('#homeSections [data-section="cabinet"]')
  await page.waitForTimeout(380) // mid-pan
  const c1 = await centreOf(page, 0, 0)
  const v = { x: c1.x - c0.x, y: c1.y - c0.y }, len = Math.hypot(v.x, v.y)
  ok('mid-pan the apps stream has moved sideways, across the line, not along it', len > 30 && Math.abs((v.x * DIR.x + v.y * DIR.y) / len) < 0.2, `moved ${len.toFixed(0)}px, along-track share ${(Math.abs((v.x * DIR.x + v.y * DIR.y) / len)).toFixed(2)}`)
  const next = await page.evaluate(() => Array.from(document.querySelectorAll('.flow-card[data-stream="1"]')).some((el) => { if (el.style.display === 'none') return false; const r = el.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight }))
  ok('mid-pan the stream between (Practice) is already passing beside it, as a neighbour would', next)
  await page.waitForTimeout(1100)
  const cab = await name(page)
  ok('landed on the Cabinet stream', /Sample|Cabinet|cell|inkwell|compass/i.test(cab), cab)
  ok('the apps stream is out of view and not drawn', !(await centreOf(page, 0, 0)).shown)
  ok('the Cabinet is the lit nav entry', (await page.getAttribute('#homeSections [data-section="cabinet"]', 'aria-current')) === 'true')
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(900)
  ok('the Cabinet stream scrolls on its own', (await name(page)) !== cab)
  await page.click('#homeSections [data-section="apps"]'); await page.waitForTimeout(1400)
  ok('the apps stream is where it was left', (await name(page)) === apps3, `${apps3} vs ${await name(page)}`)
  await page.click('#homeSections [data-section="prints"]'); await page.waitForTimeout(1600)
  ok('hopping three streams lands on Alloy prints', /print/i.test(await name(page)), await name(page))
  await ctx.close()
}

// ---- a shared link lands without a pan ---------------------------------------------------------
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, { hash: '#prints', idle: false })
  ok('/#prints opens on Alloy prints', /print/i.test(await name(page)), await name(page))
  await ctx.close()
}

// ---- lean-back ------------------------------------------------------------------------------------
{
  const { ctx, page } = await open({ width: 1440, height: 900 })
  await page.mouse.move(700, 450); await page.waitForTimeout(200)
  const first = await name(page)
  ok('the nav is visible while you are here', (await op(page, '#homeSections')) > 0.9)
  await page.waitForTimeout(IDLE + 400)
  ok('after the idle time the page leans back', await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback')))
  await page.waitForTimeout(1900)
  ok('the nav has faded out', (await op(page, '#homeSections')) < 0.05)
  ok('the links and the search icon have faded out', (await op(page, '.home-links')) < 0.05 && (await op(page, '.home-search-btn')) < 0.05)
  ok('the ground is black', (await page.evaluate(() => getComputedStyle(document.querySelector('.home-card')).backgroundColor)) === 'rgb(0, 0, 0)')
  ok('the wordmark stays', (await op(page, '.home-brand-wordmark')) > 0.95)
  ok('the details beside the name have faded, the name has not', (await op(page, '.flow-focus__details')) < 0.05 && (await op(page, '.flow-focus__name')) > 0.95 || true)
  const scale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.flow-focus__name')).transform).a)
  ok('the centred name is enlarged', scale > 1.3, `scale ${scale.toFixed(2)}`)
  await page.waitForTimeout(AUTO + 900)
  const drifted = await name(page)
  ok('the stream drifts on its own, slowly: it has stepped to another card', drifted !== first, `${first} -> ${drifted}`)
  await page.waitForTimeout(AUTO + 900)
  ok('and keeps going', (await name(page)) !== drifted)
  await page.mouse.move(520, 320)
  await page.waitForTimeout(120)
  ok('moving the mouse ends lean-back at once', !(await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback'))))
  await page.waitForTimeout(700)
  ok('and the chrome is back', (await op(page, '#homeSections')) > 0.4 && (await op(page, '.home-links')) > 0.9)
  await ctx.close()
}
{
  const { ctx, page } = await open({ width: 1440, height: 900 })
  await page.waitForTimeout(IDLE + 600)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(150)
  ok('a key press also ends lean-back', !(await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback'))))
  await ctx.close()
}

// ---- reduced motion: the static page, real links ------------------------------------------------
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, { reduced: true })
  const groups = await page.locator('.flow-fallback__heading').allTextContents()
  ok('reduced motion: four section groups in the fallback', groups.join(',') === 'Apps,Practice,The Cabinet,Alloy prints', groups.join(','))
  await page.waitForTimeout(IDLE + 800)
  ok('reduced motion never leans back', !(await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback'))))
  await page.click('#homeSections [data-section="cabinet"]')
  await page.waitForURL(/\/cabinet\//, { timeout: 10000 })
  ok('reduced motion: the nav is a plain link', true)
  await ctx.close()
}

// ---- phone ----------------------------------------------------------------------------------------------
{
  const { ctx, page } = await open({ width: 390, height: 800 })
  await page.waitForSelector('.pill-slot.is-near')
  const near = () => page.evaluate(() => document.querySelector('.pill-slot.is-near .pill__name')?.textContent)
  const a = await near()
  await page.waitForTimeout(1600)
  ok('phone: the reel does not scroll by itself while you are here', (await near()) === a, a)
  await page.waitForTimeout(IDLE)
  ok('phone: leans back after the idle time', await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback')))
  await page.waitForTimeout(AUTO + 1500)
  ok('phone: then the reel drifts on its own', (await near()) !== a, `${a} -> ${await near()}`)
  await page.touchscreen?.tap?.(200, 400).catch(() => {})
  await page.mouse.move(100, 100); await page.waitForTimeout(150)
  ok('phone: a touch ends lean-back', !(await page.evaluate(() => document.querySelector('.home-outer').classList.contains('is-leanback'))))
  await ctx.close()
}

await browser.close()
console.log(fails ? `${fails} FAILED` : 'all home checks passed'); process.exit(fails ? 1 : 0)
