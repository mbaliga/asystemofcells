// Object store for model files and attachments (07 §9, 08 §5). Never git.
// R2 over the S3 API with SigV4 presigned URLs; an in-memory twin for tests and dev.
// The upload URL signs x-amz-checksum-sha256, so the store itself rejects a
// body whose sha256 differs from the one the client declared.
import { createHash, createHmac } from 'node:crypto'
import { env, isProd } from './_util.js'

const MAX_MODEL_BYTES = 100 * 1024 * 1024
export const MODEL_TYPES = { stl: 'model/stl', '3mf': 'model/3mf', obj: 'model/obj' }

const hmac = (key, data) => createHmac('sha256', key).update(data).digest()
const hex = (buf) => Buffer.from(buf).toString('hex')
const sha = (s) => createHash('sha256').update(s).digest('hex')
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

/** SigV4 query-string presign (R2: region "auto", service "s3"). */
export function presignUrl({ method, host, path, accessKeyId, secretAccessKey, region = 'auto', expires = 900, signedHeaders = {}, now = new Date() }) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const scope = `${date}/${region}/s3/aws4_request`
  const headers = { host, ...Object.fromEntries(Object.entries(signedHeaders).map(([k, v]) => [k.toLowerCase(), String(v)])) }
  const names = Object.keys(headers).sort()
  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': names.join(';'),
  }
  const qs = Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join('&')
  const canonicalPath = path.split('/').map(enc).join('/')
  const canonical = [method, canonicalPath, qs, names.map((n) => `${n}:${headers[n].trim()}\n`).join(''), names.join(';'), 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha(canonical)].join('\n')
  const key = hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, date), region), 's3'), 'aws4_request')
  return { url: `https://${host}${canonicalPath}?${qs}&X-Amz-Signature=${hex(hmac(key, toSign))}`, expiresAt: new Date(now.getTime() + expires * 1000).toISOString() }
}

export function createR2Storage({ accountId, bucket, accessKeyId, secretAccessKey, fetchImpl = fetch }) {
  const host = `${accountId}.r2.cloudflarestorage.com`
  const p = (key) => `/${bucket}/${key}`
  const sign = (method, key, opts = {}) => presignUrl({ method, host, path: p(key), accessKeyId, secretAccessKey, ...opts })
  return {
    async presignUpload({ key, maxBytes = MAX_MODEL_BYTES, contentType, sha256Hex }) {
      if (maxBytes > MAX_MODEL_BYTES) throw new Error('too large')
      const headers = { 'content-type': contentType }
      if (sha256Hex) headers['x-amz-checksum-sha256'] = Buffer.from(sha256Hex, 'hex').toString('base64')
      const { url, expiresAt } = sign('PUT', key, { signedHeaders: headers })
      return { url, headers, expiresAt, maxBytes }
    },
    async head(key) {
      const res = await fetchImpl(sign('HEAD', key, { expires: 60 }).url, { method: 'HEAD' })
      if (res.status === 404) return null
      if (!res.ok) throw new Error('storage head ' + res.status)
      return { bytes: Number(res.headers.get('content-length')) }
    },
    async delete(key) {
      const res = await fetchImpl(sign('DELETE', key, { expires: 60 }).url, { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error('storage delete ' + res.status)
    },
    async presignDownload(key, ttl = 900) { return sign('GET', key, { expires: ttl }).url },
  }
}

export function createMemoryStorage({ uploadBase = '' } = {}) {
  const objects = new Map()
  return {
    _objects: objects,
    async presignUpload({ key, maxBytes = MAX_MODEL_BYTES, contentType, sha256Hex }) {
      return { url: uploadBase ? `${uploadBase}/dev-upload/${key}` : `memory://${key}`, headers: { 'content-type': contentType, ...(sha256Hex ? { 'x-amz-checksum-sha256': sha256Hex } : {}) }, expiresAt: new Date(Date.now() + 900000).toISOString(), maxBytes }
    },
    async put(key, bytes) { objects.set(key, { bytes }) }, // tests play the browser
    async head(key) { const o = objects.get(key); return o ? { bytes: o.bytes } : null },
    async delete(key) { objects.delete(key) },
    async presignDownload(key) { return `memory://${key}?download` },
  }
}

export function getStorage() {
  const account = env('STORAGE_ACCOUNT_ID')
  if (account) {
    return createR2Storage({ accountId: account, bucket: env('STORAGE_BUCKET', { required: true }), accessKeyId: env('STORAGE_ACCESS_KEY_ID', { required: true }), secretAccessKey: env('STORAGE_SECRET_ACCESS_KEY', { required: true }) })
  }
  if (isProd()) throw new Error('Counter: STORAGE_* is not configured')
  return createMemoryStorage({ uploadBase: env('DEV_UPLOAD_BASE') })
}
