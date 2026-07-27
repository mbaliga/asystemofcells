# Adding a loop to the gallery

There is no backend, no account and no upload form: `fonebrew.app` is static
files. A loop joins the gallery by pull request, and a PR adds exactly two
things.

## 1. The file

Put your exported loop at:

```
apps/fonebrew-app/public/loops/gallery/<slug>.bpmn
```

`<slug>` is lowercase, hyphenated, and becomes the URL (`/loops/<slug>/`).

Export it from Fonebrew (Loops → the loop → export) or save it out of the web
editor. Do not hand-write the XML unless you have read
`docs/design/bpmn-dialect.md` in the Fonebrew repo — that document is the format
contract, and a file that misses it parses into a quieter, emptier graph rather
than a loud error.

## 2. The entry

Add one object to the `loops` array in `packages/loops/loops.public.json`:

```jsonc
{
  "slug": "self-critique",
  "title": "Self-critique",
  "summary": "…",                        // one sentence, matches the file's own summary
  "pattern": "refine-loop",              // fan-out-aggregate | sample-vote | refine-loop | debate | pipeline
  "author": "your-handle",
  "source": "…",                         // what the loop was distilled from
  "distilledBy": "…",                    // the model that distilled it, or "hand-authored"
  "distilledOn": "2026-07-27",
  "nodes": 6,
  "edges": 6,
  "tags": ["reflection", "single-model"],
  "bpmnPath": "/loops/gallery/self-critique.bpmn",
  "accent": "#E4572E"
}
```

`summary`, `pattern`, `source`, `distilledBy` and `distilledOn` are **not free
text**: copy them from your file's own start event, where the format already
records them as `<aarso:meta>` attributes. The point of the gallery is that the
provenance shown on the page and the provenance inside the file are the same
thing. If your loop has no provenance (you drew it by hand rather than
distilling it), say so — `"distilledBy": "hand-authored"` is a real answer and
the seeded entries use it.

## What gets checked before merge

- The file parses as XML and has one `bpmn:process` with exactly one
  `startEvent` and at least one `endEvent`.
- No sequence flow points at an id that does not exist.
- Node kinds are among the five Fonebrew itself draws: `startEvent`, `endEvent`,
  `serviceTask`, `exclusiveGateway`, `parallelGateway`. Others are legal BPMN and
  round-trip through the reader, but Fonebrew's canvas and runner have no
  defined behaviour for them.
- `dc:Bounds` are present per node and roughly in the 0–900 range on each axis,
  so the loop opens at a sane size on a phone rather than tiny or enormous.
- The entry's `pattern` is one of the five keys, spelled exactly.
- Nothing in the file is private: prompts and instructions ship as plain text
  inside it. Read yours before you open the PR.

## What not to send

Loops carrying API keys, personal data, or a system prompt you would not publish.
The file is served verbatim to anyone who downloads it.
