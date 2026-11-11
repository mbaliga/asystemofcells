import { cfetch } from '../counter-api.js'
const form = document.getElementById('commission'), msg = document.getElementById('msg')
const startedAt = Date.now()
const plan = new URLSearchParams(location.search).get('plan')
if (plan) document.getElementById('planNote').hidden = false
form.addEventListener('submit', async (e) => {
  e.preventDefault(); msg.textContent = 'Sending…'
  const f = new FormData(form), btn = form.querySelector('button[type=submit]'); btn.disabled = true
  const files = [...document.getElementById('filesInput').files].slice(0, 5)
  try {
    const key = sessionStorage.getItem('asoc-commission-key') || ('m' + crypto.randomUUID().replace(/-/g, '')); sessionStorage.setItem('asoc-commission-key', key)
    const res = await cfetch('/api/counter/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      kind: 'commission', idempotencyKey: key, startedAt, website: f.get('website') || '',
      fields: { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), where: f.get('where'), what: f.get('what'), scale: f.get('scale'), timeline: f.get('timeline'), budget: f.get('budget'), message: (f.get('message') || '') + (plan ? '\n\n[A plan from the Vaastu tool is attached as data: ' + plan.slice(0, 1500) + ']' : '') },
      attachments: files.map((x) => ({ name: x.name, bytes: x.size })),
    }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((j.error && j.error.message) || 'That did not send. Try again.')
    // The attachments are uploaded only now that the inquiry is safely recorded.
    for (let i = 0; i < (j.uploads || []).length; i++) await fetch(j.uploads[i].url, { method: 'PUT', headers: j.uploads[i].headers, body: files[i] })
    sessionStorage.removeItem('asoc-commission-key')
    form.hidden = true; document.getElementById('done').hidden = false
  } catch (err) { msg.textContent = err.message; btn.disabled = false }
})
