// Tiny wrapper: method check, same-origin CORS, rate limit, error mapping.
import { send, sendError, clientIp, rateLimit, HttpError } from './_util.js'

export function route(methods, fn, { limit = 0 } = {}) {
  return async function handler(req, res) {
    try {
      res.setHeader('Vary', 'Origin')
      if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); throw new HttpError(405, 'method', 'Method not allowed.') }
      if (limit && req.method !== 'GET') rateLimit(`${fn.name || 'r'}:${clientIp(req)}`, { perMinute: limit })
      await fn(req, res)
    } catch (e) { sendError(res, e) }
  }
}
export { send }
