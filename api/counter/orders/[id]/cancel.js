import { route, send } from '../../_handler.js'
import { ctx } from '../../_ctx.js'
import { cancelOrder } from '../../_service.js'

export default route(['POST'], async function cancel(req, res) {
  await cancelOrder(await ctx(), req.query.id, req.query.t)
  send(res, 200, { ok: true })
}, { limit: 10 })
