// Razorpay Payment Links (08 §3). The site never builds a payment form: it
// links out to the provider-hosted page. Secrets stay in this file's env reads.
import { createHmac } from 'node:crypto'
import { env, isProd, safeEqual } from './_util.js'

export function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(expected, signature)
}

export function createRazorpay({ keyId, keySecret, fetchImpl = fetch }) {
  const auth = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const call = async (path, body) => {
    const res = await fetchImpl('https://api.razorpay.com/v1' + path, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) throw new Error('razorpay ' + res.status)
    return res.json()
  }
  return {
    async createPaymentLink({ amountInr, orderId, customer, expireBy, callbackUrl, description }) {
      const j = await call('/payment_links', {
        amount: Math.round(amountInr * 100), currency: 'INR', accept_partial: false, reference_id: orderId, description,
        customer: { name: customer.name, email: customer.email, ...(customer.phone ? { contact: customer.phone } : {}) },
        notify: { email: true, sms: !!customer.phone }, reminder_enable: false,
        expire_by: Math.floor(expireBy / 1000), callback_url: callbackUrl, callback_method: 'get',
      })
      return { id: j.id, shortUrl: j.short_url }
    },
    async cancelPaymentLink(id) { try { await call(`/payment_links/${id}/cancel`) } catch { /* best effort */ } },
  }
}

/** Dev fake: no network, a link that looks like one. */
export function createFakeRazorpay() {
  const links = []
  return {
    links,
    async createPaymentLink(a) { const id = 'plink_dev_' + a.orderId.slice(-8); links.push({ id, ...a }); return { id, shortUrl: `https://rzp.io/dev/${id}` } },
    async cancelPaymentLink(id) { links.push({ cancelled: id }) },
  }
}

export function getRazorpay() {
  if (env('RAZORPAY_KEY_ID') && env('RAZORPAY_KEY_SECRET')) return createRazorpay({ keyId: env('RAZORPAY_KEY_ID'), keySecret: env('RAZORPAY_KEY_SECRET') })
  if (isProd()) throw new Error('Counter: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured')
  return createFakeRazorpay()
}
