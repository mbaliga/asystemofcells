// The one address that exists. Pages that show it or link to it must wrap the
// region in Cloudflare's `<!--email_off-->` ... `<!--/email_off-->` comments
// (see contact.astro), or Cloudflare's Email Address Obfuscation rewrites it.
export const CONTACT_EMAIL = 'nooz@asystemofcells.com'

// A mailto: link that opens the visitor's own mail app with a subject and a
// plain-text body already written. Nothing is sent by the site: this is only a
// string. Each body line is encoded on its own and the lines are joined with an
// encoded CRLF, which is what mail clients expect for a line break in `body`.
export function enquiryMailto({ subject, lines = [] }) {
  const body = lines.map(encodeURIComponent).join('%0D%0A')
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`
}
