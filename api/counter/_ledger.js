// Ledger adapter (08 §4). The ledger is a private git repo; one JSON file per
// order. Interface (all async):
//   read(path)               -> { text, sha } | null
//   readJson(path)           -> { json, sha } | null
//   create(path, value)      -> { sha }       throws LedgerError('EXISTS') if the path exists
//   update(path, fn, opts)   -> new json      optimistic: read, fn(json), PUT with sha; retries on CONFLICT
//   updateText(path, fn)     -> new text      same, for .jsonl logs
//   remove(path)             -> void
//   list(prefix)             -> [{ name, path }]
//
// Locks and idempotency are *create without sha*: GitHub answers 422 when the
// path already exists, and that is the lock (reservations, idempotency keys).
import { env, isProd } from './_util.js'

export class LedgerError extends Error {
  constructor(code, message) { super(message || code); this.code = code }
}

const MAX_RETRIES = 3
// Every PUT is a commit on one branch, so unrelated writers collide too: back off with jitter.
const backoff = (attempt) => new Promise((r) => setTimeout(r, 40 * 2 ** attempt + Math.random() * 80))
const toText = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n')

// Shared logic over any backend that provides getRaw / putRaw / delRaw / listRaw.
export function buildLedger(raw) {
  const api = {
    async read(path) { return raw.get(path) },
    async readJson(path) {
      const r = await raw.get(path)
      return r ? { json: JSON.parse(r.text), sha: r.sha } : null
    },
    async create(path, value) {
      // A 409 on create means the branch moved under us (a concurrent commit),
      // not that the path exists; retrying is safe because the next attempt
      // answers EXISTS if somebody else did create it.
      for (let attempt = 0; ; attempt++) {
        try { return await raw.put(path, toText(value), undefined, `create ${path}`) }
        catch (e) {
          if (e instanceof LedgerError && e.code === 'CONFLICT') {
            // Some servers answer 409, not 422, for create-on-existing. If the
            // path is there, that is the lock speaking: EXISTS, not a retry.
            if (await raw.get(path)) throw new LedgerError('EXISTS', path)
            if (attempt < MAX_RETRIES) { await backoff(attempt); continue }
          }
          throw e
        }
      }
    },
    async updateText(path, fn, { create = false } = {}) {
      for (let attempt = 0; ; attempt++) {
        const cur = await raw.get(path)
        if (!cur && !create) throw new LedgerError('NOT_FOUND', path)
        const next = await fn(cur ? cur.text : null)
        if (next === undefined) return cur ? cur.text : null // fn declined to write
        try {
          await raw.put(path, next, cur ? cur.sha : undefined, `update ${path}`)
          return next
        } catch (e) {
          if (e instanceof LedgerError && ['CONFLICT', 'EXISTS'].includes(e.code) && attempt < MAX_RETRIES) { await backoff(attempt); continue }
          throw e
        }
      }
    },
    async update(path, fn, opts) {
      let result
      await api.updateText(path, async (text) => {
        const out = await fn(text === null ? null : JSON.parse(text))
        if (out === undefined) { result = text === null ? null : JSON.parse(text); return undefined }
        result = out
        return toText(out)
      }, opts)
      return result
    },
    async remove(path) {
      const cur = await raw.get(path)
      if (!cur) return
      await raw.del(path, cur.sha, `remove ${path}`)
    },
    async list(prefix) { return raw.list(prefix) },
  }
  return api
}

// ---- in-memory (tests, `vercel dev`) -----------------------------------------

export function createMemoryLedger({ onBeforePut } = {}) {
  const files = new Map()
  let counter = 0
  const raw = {
    async get(path) { const f = files.get(path); return f ? { text: f.text, sha: f.sha } : null },
    async put(path, text, sha) {
      if (onBeforePut) await onBeforePut(path, sha, files) // tests: simulate a concurrent writer
      const cur = files.get(path)
      if (sha === undefined && cur) throw new LedgerError('EXISTS', path)
      if (sha !== undefined && (!cur || cur.sha !== sha)) throw new LedgerError('CONFLICT', path)
      const next = { text, sha: 'sha' + ++counter }
      files.set(path, next)
      return { sha: next.sha }
    },
    async del(path, sha) {
      const cur = files.get(path)
      if (cur && cur.sha !== sha) throw new LedgerError('CONFLICT', path)
      files.delete(path)
    },
    async list(prefix) {
      const dir = prefix.endsWith('/') ? prefix : prefix + '/'
      const names = new Set()
      for (const p of files.keys()) if (p.startsWith(dir)) names.add(p.slice(dir.length).split('/')[0])
      return [...names].sort().map((name) => ({ name, path: dir + name }))
    },
  }
  const ledger = buildLedger(raw)
  ledger._files = files
  return ledger
}

// ---- GitHub Contents API ------------------------------------------------------

async function githubFetch(fetchImpl, url, init, token) {
  const res = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'asoc-counter',
      ...(init && init.headers),
    },
  })
  return res
}

export function createGithubLedger({ repo, token, branch, baseUrl = 'https://api.github.com', fetchImpl = fetch } = {}) {
  if (!repo || !token) throw new Error('createGithubLedger needs repo and token')
  const url = (p) => `${baseUrl}/repos/${repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : ''
  const unavailable = (res) => new LedgerError('UNAVAILABLE', `ledger ${res.status}`)
  const raw = {
    async get(path) {
      const res = await githubFetch(fetchImpl, url(path) + q, { method: 'GET' }, token)
      if (res.status === 404) return null
      if (!res.ok) throw unavailable(res)
      const j = await res.json()
      if (Array.isArray(j) || j.type !== 'file') throw new LedgerError('NOT_FILE', path)
      // Files over 1 MB come back with empty content; order files never are.
      return { text: Buffer.from(j.content || '', 'base64').toString('utf8'), sha: j.sha }
    },
    async put(path, text, sha, message) {
      const body = { message, content: Buffer.from(text, 'utf8').toString('base64') }
      if (sha) body.sha = sha
      if (branch) body.branch = branch
      const res = await githubFetch(fetchImpl, url(path), { method: 'PUT', body: JSON.stringify(body) }, token)
      if (res.ok) { const j = await res.json(); return { sha: j.content && j.content.sha } }
      // Create (no sha) on an existing path: 422. Update with a stale sha: 409
      // (some responses are 422 "does not match"). 409 on a create is the branch
      // moving under a concurrent commit.
      if (res.status === 422) throw new LedgerError(sha ? 'CONFLICT' : 'EXISTS', path)
      if (res.status === 409) throw new LedgerError('CONFLICT', path)
      throw unavailable(res)
    },
    async del(path, sha, message) {
      const body = { message, sha }
      if (branch) body.branch = branch
      const res = await githubFetch(fetchImpl, url(path), { method: 'DELETE', body: JSON.stringify(body) }, token)
      if (res.status === 404) return
      if (res.status === 409 || res.status === 422) throw new LedgerError('CONFLICT', path)
      if (!res.ok) throw unavailable(res)
    },
    async list(prefix) {
      const res = await githubFetch(fetchImpl, url(prefix.replace(/\/$/, '')) + q, { method: 'GET' }, token)
      if (res.status === 404) return []
      if (!res.ok) throw unavailable(res)
      const j = await res.json()
      return Array.isArray(j) ? j.map((e) => ({ name: e.name, path: e.path })) : []
    },
  }
  return buildLedger(raw)
}

// ---- selection -----------------------------------------------------------------

let singleton
/** LEDGER_PROVIDER=github|gitea|memory. Production must be configured; dev falls back to memory. */
export async function getLedger() {
  if (singleton) return singleton
  const provider = env('LEDGER_PROVIDER') || (isProd() ? '' : 'memory')
  if (provider === 'memory') {
    if (isProd()) throw new Error('Counter: the in-memory ledger is not allowed in production')
    singleton = createMemoryLedger()
  } else if (provider === 'github') {
    singleton = createGithubLedger({ repo: env('LEDGER_REPO', { required: true }), token: env('LEDGER_TOKEN', { required: true }), branch: env('LEDGER_BRANCH') || undefined })
  } else if (provider === 'gitea') {
    const { createGiteaLedger } = await import('./_ledger.gitea.js')
    singleton = createGiteaLedger({ baseUrl: env('LEDGER_URL', { required: true }), repo: env('LEDGER_REPO', { required: true }), token: env('LEDGER_TOKEN', { required: true }), branch: env('LEDGER_BRANCH') || undefined })
  } else {
    throw new Error('Counter: LEDGER_PROVIDER must be github, gitea or memory')
  }
  return singleton
}
export const setLedgerForTests = (l) => { singleton = l }
