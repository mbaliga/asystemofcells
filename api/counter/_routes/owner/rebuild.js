import { route, send } from '../../_handler.js'
import { ctx, requireOwner } from '../../_ctx.js'
import { ownerRebuild } from '../../_service.js'

// Called by the owner app, and daily by the Vercel cron in vercel.json (which sends GET).
export default route(['POST', 'GET'], async function rebuild(req, res) {
  requireOwner(req)
  send(res, 200, await ownerRebuild(await ctx()))
})
