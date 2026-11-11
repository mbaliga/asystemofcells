// Counter's address on this site. The API is one function at /api/counter/ and the route travels as ?__p=,
// because Vercel's dynamic function names and rewrites did not resolve under the site's trailingSlash setting
// (probed on production). Callers write the natural path; this turns '/api/counter/orders/ID/model?t=x' into
// '/api/counter/?__p=orders/ID/model&t=x'.
export function api(u) {
  const m = /^\/api\/counter\/?([^?]*)(?:\?(.*))?$/.exec(u)
  if (!m) return u
  const path = m[1].replace(/\/$/, '')
  return `/api/counter/?__p=${path}${m[2] ? '&' + m[2] : ''}`
}
export const cfetch = (u, init) => fetch(api(u), init)
