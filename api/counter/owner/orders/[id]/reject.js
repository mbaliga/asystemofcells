import { route, send } from '../../../_handler.js'
import { readBody } from '../../../_util.js'
import { ctx, requireOwner } from '../../../_ctx.js'
import { ownerReject } from '../../../_service.js'

export default route(['POST'], async function reject(req, res) {
  requireOwner(req)
  await ownerReject(await ctx(), req.query.id, await readBody(req))
  send(res, 200, { ok: true })
})
