import { route, send } from '../../_handler.js'
import { ctx } from '../../_ctx.js'
import { getPublicOrder } from '../../_service.js'

export default route(['GET'], async function order(req, res) {
  const { id, t, v } = req.query
  send(res, 200, await getPublicOrder(await ctx(), id, t, { verify: v === '1' }), { 'Cache-Control': 'no-store' })
})
