// Gitea twin of _ledger.js (08 §4, §10). Gitea's contents API is a near copy of
// GitHub's, with one difference that matters here: create is POST (no sha),
// update is PUT (with sha). Create on an existing path answers 422; a 409 is
// reported as CONFLICT and buildLedger.create settles which it was by looking.
import { LedgerError, buildLedger } from './_ledger.js'

export function createGiteaLedger({ baseUrl, repo, token, branch, fetchImpl = fetch }) {
  const root = `${baseUrl.replace(/\/$/, '')}/api/v1/repos/${repo}/contents`
  const url = (p) => `${root}/${p.split('/').map(encodeURIComponent).join('/')}`
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : ''
  const call = (u, init) =>
    fetchImpl(u, { ...init, headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(init && init.headers) } })
  const unavailable = (res) => new LedgerError('UNAVAILABLE', `ledger ${res.status}`)

  const raw = {
    async get(path) {
      const res = await call(url(path) + q, { method: 'GET' })
      if (res.status === 404) return null
      if (!res.ok) throw unavailable(res)
      const j = await res.json()
      if (Array.isArray(j) || j.type !== 'file') throw new LedgerError('NOT_FILE', path)
      return { text: Buffer.from(j.content || '', 'base64').toString('utf8'), sha: j.sha }
    },
    async put(path, text, sha, message) {
      const body = { message, content: Buffer.from(text, 'utf8').toString('base64') }
      if (branch) body.branch = branch
      if (sha) body.sha = sha
      const res = await call(url(path), { method: sha ? 'PUT' : 'POST', body: JSON.stringify(body) })
      if (res.ok) { const j = await res.json(); return { sha: j.content && j.content.sha } }
      if (!sha && res.status === 422) throw new LedgerError('EXISTS', path)
      if (res.status === 409 || res.status === 422) throw new LedgerError('CONFLICT', path)
      throw unavailable(res)
    },
    async del(path, sha, message) {
      const body = { message, sha }
      if (branch) body.branch = branch
      const res = await call(url(path), { method: 'DELETE', body: JSON.stringify(body) })
      if (res.status === 404) return
      if (res.status === 409 || res.status === 422) throw new LedgerError('CONFLICT', path)
      if (!res.ok) throw unavailable(res)
    },
    async list(prefix) {
      const res = await call(url(prefix.replace(/\/$/, '')) + q, { method: 'GET' })
      if (res.status === 404) return []
      if (!res.ok) throw unavailable(res)
      const j = await res.json()
      return Array.isArray(j) ? j.map((e) => ({ name: e.name, path: e.path })) : []
    },
  }
  return buildLedger(raw)
}
