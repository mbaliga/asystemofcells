// Small shared helpers for the Counter functions: ids, tokens, HTTP, validation.
import { randomBytes, timingSafeEqual } from 'node:crypto'

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** ULID: 48-bit ms timestamp + 80 random bits, Crockford base32, 26 chars. */
export function ulid(now = Date.now(), rand = randomBytes(10)) {
  let t = now, ts = ''
  for (let i = 0; i < 10; i++) { ts = CROCKFORD[t % 32] + ts; t = Math.floor(t / 32) }
  let bits = 0n
  for (const b of rand) bits = (bits << 8n) | BigInt(b)
  let r = ''
  for (let i = 0; i < 16; i++) { r = CROCKFORD[Number(bits & 31n)] + r; bits >>= 5n }
  return ts + r
}

/** The ms timestamp a ULID carries (the order file path is derived from it). */
export function ulidTime(id) {
  let t = 0
  for (const ch of id.slice(0, 10)) {
    const v = CROCKFORD.indexOf(ch)
    if (v < 0) throw new Error('bad ulid')
    t = t * 32 + v
  }
  return t
}

export const isUlid = (s) => typeof s === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(s)
export const b64url = (buf) => Buffer.from(buf).toString('base64url')
export const newToken = () => b64url(randomBytes(32))

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export function send(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(body))
}

export function sendError(res, err) {
  if (err instanceof HttpError) {
    return send(res, err.status, { error: { code: err.code, message: err.message, ...err.extra } })
  }
  // Ids only in logs: never PII, never the error object (it may carry a request body).
  console.error('counter: unexpected error', err && err.code ? err.code : 'unknown')
  return send(res, 500, { error: { code: 'internal', message: 'Something went wrong on the counter.' } })
}

export async function readBody(req, limit = 64 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
    req = { ...req, rawBody: req.body }
  }
  const chunks = []
  let size = 0
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const c of req) {
      size += c.length
      if (size > limit) throw new HttpError(413, 'too_large', 'That request is too large.')
      chunks.push(c)
    }
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try { return JSON.parse(text) } catch { throw new HttpError(400, 'bad_json', 'The request was not valid JSON.') }
}

/** Raw body for signature checks (Razorpay signs the exact bytes). */
export async function readRaw(req, limit = 256 * 1024) {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > limit) throw new HttpError(413, 'too_large', 'That request is too large.')
    chunks.push(c)
  }
  return Buffer.concat(chunks).toString('utf8')
}

// ---- validation (hand-rolled; no schema dependency) -----------------------

export const str = (v, { min = 0, max = 300, label = 'field', pattern } = {}) => {
  if (typeof v !== 'string') throw new HttpError(400, 'invalid', `${label} must be text.`)
  const s = v.trim()
  if (s.length < min) throw new HttpError(400, 'invalid', `${label} is required.`)
  if (s.length > max) throw new HttpError(400, 'invalid', `${label} is too long.`)
  if (pattern && !pattern.test(s)) throw new HttpError(400, 'invalid', `${label} is not valid.`)
  return s
}
export const optStr = (v, opts) => (v === undefined || v === null || v === '' ? null : str(v, opts))
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const int = (v, { min = 1, max = 1000, label = 'number' } = {}) => {
  if (!Number.isInteger(v) || v < min || v > max) throw new HttpError(400, 'invalid', `${label} is not valid.`)
  return v
}

// ---- rate limit: in-memory token bucket per function instance --------------

const buckets = new Map()
export function rateLimit(key, { perMinute = 10, now = Date.now() } = {}) {
  const b = buckets.get(key) || { tokens: perMinute, at: now }
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60000) * perMinute)
  b.at = now
  if (b.tokens < 1) { buckets.set(key, b); throw new HttpError(429, 'rate_limited', 'Too many requests. Try again in a minute.') }
  b.tokens -= 1
  buckets.set(key, b)
  if (buckets.size > 5000) buckets.clear()
}
export const clientIp = (req) => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || 'local').split(',')[0].trim()

export const env = (name, { required = false } = {}) => {
  const v = process.env[name]
  if (!v && required) throw new Error(`Counter: missing env ${name}`)
  return v || ''
}
// 'production' on a real Vercel production/preview deploy; anything else is dev.
export const isProd = () => process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
