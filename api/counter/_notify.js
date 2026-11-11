// Owner push (ntfy) and customer mail (Resend). Both are best-effort: a failed
// notification never fails an order. Logs carry ids only, never PII (08 §7).
import { env, isProd } from './_util.js'

export function createNtfy({ url, topic, token, fetchImpl = fetch }) {
  return {
    async publish({ title, message, priority = 'default', click, tags }) {
      try {
        const res = await fetchImpl(`${url.replace(/\/$/, '')}/${topic}`, {
          method: 'POST',
          headers: { Title: title, Priority: priority, ...(click ? { Click: click } : {}), ...(tags ? { Tags: tags } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: message,
        })
        if (!res.ok) console.error('counter: ntfy', res.status)
      } catch { console.error('counter: ntfy unreachable') }
    },
  }
}

export function createResend({ apiKey, from, fetchImpl = fetch }) {
  return {
    async send({ to, subject, text }) {
      try {
        const res = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [to], subject, text }),
        })
        if (!res.ok) console.error('counter: mail', res.status)
      } catch { console.error('counter: mail unreachable') }
    },
  }
}

export function createRecorder() {
  const sent = []
  return { sent, publish: async (m) => { sent.push({ kind: 'ntfy', ...m }) }, send: async (m) => { sent.push({ kind: 'mail', ...m }) } }
}

export function getNotifiers() {
  const ntfy = env('NTFY_URL') && env('NTFY_TOPIC') ? createNtfy({ url: env('NTFY_URL'), topic: env('NTFY_TOPIC'), token: env('NTFY_TOKEN') }) : null
  const mail = env('RESEND_API_KEY') && env('MAIL_FROM') ? createResend({ apiKey: env('RESEND_API_KEY'), from: env('MAIL_FROM') }) : null
  if ((!ntfy || !mail) && isProd()) console.error('counter: notifications are not fully configured')
  const none = { publish: async () => {}, send: async () => {} }
  return { ntfy: ntfy || none, mail: mail || none }
}
