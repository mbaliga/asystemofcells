import { route, send } from '../../_handler.js'
import { readBody } from '../../_util.js'
import { ctx, requireOwner } from '../../_ctx.js'
import { ownerMarkSoldOffline } from '../../_service.js'

export default route(['POST'], async function sold(req, res) {
  requireOwner(req)
  await ownerMarkSoldOffline(await ctx(), (await readBody(req)).item)
  send(res, 200, { ok: true })
})
