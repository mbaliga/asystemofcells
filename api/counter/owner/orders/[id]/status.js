import { route, send } from '../../../_handler.js'
import { readBody } from '../../../_util.js'
import { ctx, requireOwner } from '../../../_ctx.js'
import { ownerAdvance } from '../../../_service.js'

export default route(['POST'], async function status(req, res) {
  requireOwner(req)
  await ownerAdvance(await ctx(), req.query.id, await readBody(req))
  send(res, 200, { ok: true })
})
