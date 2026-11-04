#!/usr/bin/env bash
# check-analytics-boundary.sh — fail the build if any Astro page both opts into analytics
# and contains something a visitor *does* (form, cart, canvas, worker, counter fetch).
# House rule: count pages that DESCRIBE the house, never pages where someone MAKES, READS,
# RUNS, SLICES, SHOPS or SUBMITS.
set -euo pipefail
ROOT="${1:-apps/asoc-com/src/pages}"
DO_RE='(<form|/api/counter|new Worker\(|<canvas|cart\.js|counter-client|checkout|import\(.*three)'
bad=0
while IFS= read -r f; do
  if grep -Eq '(^|\s)analytics(\s|$|=|/>)' "$f" && grep -Eq "$DO_RE" "$f"; then
    echo "BOUNDARY VIOLATION: $f opts into analytics and contains an interactive surface" >&2
    bad=1
  fi
done < <(grep -rlE '(^|\s)analytics(\s|$|=|/>)' "$ROOT" --include='*.astro' || true)
# Static tool dirs must never contain the analytics script tag.
if grep -rlE 'vercel.*(insights|analytics)' apps/asoc-com/public 2>/dev/null | grep -q .; then
  echo "BOUNDARY VIOLATION: analytics script referenced under public/" >&2; bad=1
fi
[[ $bad -eq 0 ]] && echo "analytics boundary OK"
exit $bad
