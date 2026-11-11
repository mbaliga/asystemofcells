import { route, send } from '../_handler.js'
import { ctx } from '../_ctx.js'
import { getCatalogState } from '../_service.js'

export default route(['GET'], async function catalogState(req, res) {
  send(res, 200, await getCatalogState(await ctx()), { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' })
})
