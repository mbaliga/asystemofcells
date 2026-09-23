import loops from './loops.public.json' with { type: 'json' }

/*
 * The five orchestration topologies a Fonebrew loop can be built from. These
 * keys are not this package's invention: they are TopologyKind's own `key`
 * strings in the app (domain/loop/Distiller.kt), and the same string is what a
 * distilled loop stamps into `pattern` on its start event's <aarso:meta>. Keep
 * them in that spelling or the gallery and the app stop agreeing.
 */
export const PATTERNS = [
  { key: 'fan-out-aggregate', label: 'Fan out, aggregate', blurb: 'Many proposers answer in parallel; one aggregator synthesises.' },
  { key: 'sample-vote', label: 'Sample, vote', blurb: 'Sample the same solver several times and take the majority.' },
  { key: 'refine-loop', label: 'Refine loop', blurb: 'Attempt, evaluate, reflect, retry until it passes.' },
  { key: 'debate', label: 'Debate', blurb: 'Debaters argue and revise across rounds; a judge decides.' },
  { key: 'pipeline', label: 'Pipeline', blurb: 'Ordered steps, each handing to the next.' },
]

/*
 * Where the web editor lives and the query param it reads a loop from. Both are
 * named once, here, because the editor is being built in parallel: if it turns
 * out to read a different param, this is the single line to change and every
 * "Open in editor" link on the site follows.
 *
 * The explicit `.html` is the repo's own convention for a static file under
 * public/ (see asoc-com's /tools/cells-logo.html), and it is the safer one: it
 * does not depend on the root vercel.json's `cleanUrls` applying to whichever
 * Vercel project builds this app.
 */
export const EDITOR_PATH = '/loops/editor.html'
export const EDITOR_LOAD_PARAM = 'load'

export function getLoops() {
  return loops.loops
}

export function getLoop(slug) {
  return loops.loops.find(l => l.slug === slug) || null
}

export function getByPattern(patternKey) {
  return loops.loops.filter(l => l.pattern === patternKey)
}

export function groupedByPattern() {
  return PATTERNS.map(p => ({ ...p, loops: getByPattern(p.key) })).filter(p => p.loops.length > 0)
}

export function patternLabel(patternKey) {
  return PATTERNS.find(p => p.key === patternKey)?.label || patternKey
}

/** Every tag in use, deduped, in first-seen order. */
export function allTags() {
  const seen = []
  for (const l of loops.loops) for (const t of l.tags || []) if (!seen.includes(t)) seen.push(t)
  return seen
}

/** The "Open in editor" href for a loop. */
export function editorUrl(loop) {
  return `${EDITOR_PATH}?${EDITOR_LOAD_PARAM}=${encodeURIComponent(loop.bpmnPath)}`
}
