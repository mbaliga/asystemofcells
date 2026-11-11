import { route, send } from './_handler.js'
import { readBody } from './_util.js'
import { ctx } from './_ctx.js'
import { createOrder } from './_service.js'

export default route(['POST'], async function orders(req, res) {
  const out = await createOrder(await ctx(), await readBody(req))
  send(res, out.status, out.body)
}, { limit: 10 })
