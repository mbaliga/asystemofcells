import { route, send } from '../../_handler.js'
import { ctx } from '../../_ctx.js'
import { attachModel } from '../../_service.js'

// The browser has PUT the file to the presigned URL; this confirms it and opens the order for review.
export default route(['PUT', 'POST'], async function model(req, res) {
  await attachModel(await ctx(), req.query.id, req.query.t)
  send(res, 200, { ok: true })
}, { limit: 20 })
