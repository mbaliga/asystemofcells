import { route, send } from '../_handler.js'
import { readBody } from '../_util.js'
import { ctx } from '../_ctx.js'
import { createInquiry } from '../_service.js'

export default route(['POST'], async function inquiries(req, res) {
  const out = await createInquiry(await ctx(), await readBody(req))
  send(res, out.status, out.body)
}, { limit: 6 })
