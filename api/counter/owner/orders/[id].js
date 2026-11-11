import { route, send } from '../../_handler.js'
import { ctx, requireOwner } from '../../_ctx.js'
import { ownerGetOrder } from '../../_service.js'

export default route(['GET'], async function ownerOrder(req, res) {
  requireOwner(req)
  send(res, 200, await ownerGetOrder(await ctx(), req.query.id))
})
