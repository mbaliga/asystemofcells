import { route, send } from '../../../_handler.js'
import { ctx, requireOwner } from '../../../_ctx.js'
import { ownerListOrders } from '../../../_service.js'

export default route(['GET'], async function ownerOrders(req, res) {
  requireOwner(req)
  send(res, 200, { orders: await ownerListOrders(await ctx(), { open: req.query.all !== '1' }) })
})
