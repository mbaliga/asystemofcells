import { route, send } from '../_handler.js'
import { readRaw, HttpError, env } from '../_util.js'
import { createHash } from 'node:crypto'
import { ctx } from '../_ctx.js'
import { verifySignature } from '../_razorpay.js'
import { handleRazorpayEvent } from '../_service.js'

export const config = { api: { bodyParser: false } } // the signature covers the exact bytes

export default route(['POST'], async function razorpayWebhook(req, res) {
  const raw = await readRaw(req)
  if (!verifySignature(raw, req.headers['x-razorpay-signature'], env('RAZORPAY_WEBHOOK_SECRET'))) throw new HttpError(400, 'bad_signature', 'Bad signature.')
  let event
  try { event = JSON.parse(raw) } catch { throw new HttpError(400, 'bad_json', 'Bad JSON.') }
  let eventId = req.headers['x-razorpay-event-id']
  // The header is not covered by the signature and ends up in a ledger path: allow-list it.
  if (!eventId || !/^[A-Za-z0-9_]{1,64}$/.test(eventId)) eventId = createHash('sha256').update(raw).digest('hex').slice(0, 40)
  await handleRazorpayEvent(await ctx(), event, eventId)
  send(res, 200, { ok: true }) // 2xx for events we ignore too, so Razorpay stops retrying them
})
