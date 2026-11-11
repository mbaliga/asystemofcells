#!/usr/bin/env bash
# harvest-screenshots.sh — enumerate the owner's repos, collect existing imagery,
# and queue HTML specs (Lane W) and Compose apps (Lane P) for capture.
#
# Usage:
#   tools/harvest-screenshots.sh [--owner mbaliga] [--out screenshots] [--public-only] [--repos a,b,c]
#
# Idempotent: never deletes, re-runs update refs. Writes:
#   <out>/repos.json          repo list (from gh, or from --repos / the public list)
#   <out>/raw/<repo>/...      copied asset files (with .source.json beside each)
#   <out>/queue.web.json      HTML specs to capture with tools/shoot-web.mjs
#   <out>/queue.preview.json  Android modules with @Preview composables
#   <out>/manifest.json       merged manifest (lane: art) — W/P/D lanes append later
set -euo pipefail

OWNER="mbaliga"; OUT="screenshots"; PUBLIC_ONLY=0; REPOS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) OWNER="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --public-only) PUBLIC_ONLY=1; shift;;
    --repos) REPOS="$2"; shift 2;;
    *) echo "unknown arg $1" >&2; exit 2;;
  esac
done

# Public repos found by name-probe on 2026-11-04 (fallback when gh cannot list the account).
PUBLIC_LIST="asystemofcells alloy Fyl-Manager hnm_playground asystemofmodels android-ide-core nooz orrery Shared-Libraries-asoc mw75-streamer TWA-Template Redmagic-Edge Bocal Assay Foto-Xplorr ebbflow typewright hyle-design-system form-analyser LG-Gear-VR-Port"

mkdir -p "$OUT/raw" "$OUT/tmp"
command -v jq >/dev/null || { echo "jq required" >&2; exit 1; }

# 1. Repo list -------------------------------------------------------------
if [[ -n "$REPOS" ]]; then
  echo "$REPOS" | tr ',' '\n' | jq -R . | jq -s 'map({name:., isPrivate:null, defaultBranch:null})' > "$OUT/repos.json"
elif [[ $PUBLIC_ONLY -eq 0 ]] && gh auth status >/dev/null 2>&1 \
     && gh repo list "$OWNER" --limit 300 --json name,isPrivate,defaultBranchRef,pushedAt > "$OUT/tmp/gh.json" 2>/dev/null; then
  jq 'map({name, isPrivate, defaultBranch: .defaultBranchRef.name, pushedAt})' "$OUT/tmp/gh.json" > "$OUT/repos.json"
else
  echo "gh listing unavailable; using the public name list" >&2
  echo "$PUBLIC_LIST" | tr ' ' '\n' | jq -R . | jq -s 'map({name:., isPrivate:false, defaultBranch:null})' > "$OUT/repos.json"
fi
echo "repos: $(jq length "$OUT/repos.json")"

# 2. Per repo: blob-less shallow clone, list tree, copy assets --------------
ASSET_RE='(^|/)(screenshots?|fastlane/metadata/[^/]+/[^/]+/images|marketing|branding|press|store-?listing|web-source/public/images|docs/[^/]*/?(atelier|previews|images|assets)?|assets/atelier/(cinematic|posters))(/|$)'
IMG_RE='\.(png|jpe?g|webp|gif)$'
SKIP_RE='(mipmap|ic_launcher|favicon|/reference/|reference-ui|/res/drawable|node_modules|icon-[0-9]+\.png)'

: > "$OUT/tmp/web.jsonl"; : > "$OUT/tmp/preview.jsonl"; : > "$OUT/tmp/art.jsonl"

jq -r '.[].name' "$OUT/repos.json" | while read -r repo; do
  dir="$OUT/tmp/$repo"
  if [[ ! -d "$dir/.git" ]]; then
    GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 --filter=blob:none "https://github.com/$OWNER/$repo" "$dir" 2>/dev/null || { echo "  skip $repo (clone failed)"; continue; }
  fi
  ref=$(git -C "$dir" rev-parse HEAD 2>/dev/null || true)
  [[ -z "$ref" ]] && { echo "  skip $repo (empty)"; continue; }
  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD)
  git -C "$dir" ls-tree -r --name-only HEAD > "$dir.tree"
  n_img=$(grep -Eic "$IMG_RE" "$dir.tree" || true)
  echo "  $repo @ $branch ($ref:0:7) — $(wc -l < "$dir.tree") files, $n_img images"

  # 2a. art assets
  grep -Ei "$IMG_RE" "$dir.tree" | grep -Ei "$ASSET_RE" | grep -Eiv "$SKIP_RE" | while read -r path; do
    dest="$OUT/raw/$repo/$path"; mkdir -p "$(dirname "$dest")"
    git -C "$dir" show "HEAD:$path" > "$dest" 2>/dev/null || continue
    jq -nc --arg repo "$OWNER/$repo" --arg ref "$ref" --arg path "$path" --arg dest "$dest" \
      '{lane:"art", repo:$repo, ref:$ref, path:$path, file:$dest}' >> "$OUT/tmp/art.jsonl"
  done

  # 2b. HTML specs (Lane W): big single-file html at root/docs/web/prototype/spec
  grep -Ei '^(docs/|web/|prototype/|spec/|public/)?[^/]+\.html$' "$dir.tree" | while read -r path; do
    size=$(git -C "$dir" cat-file -s "HEAD:$path" 2>/dev/null || echo 0)
    [[ "$size" -gt 51200 ]] || continue
    jq -nc --arg repo "$OWNER/$repo" --arg ref "$ref" --arg path "$path" --argjson size "$size" \
      '{lane:"web", repo:$repo, ref:$ref, path:$path, bytes:$size}' >> "$OUT/tmp/web.jsonl"
  done

  # 2c. Compose modules (Lane P)
  if grep -Eq '\.kt$' "$dir.tree"; then
    # cheap: only fetch blobs of files whose path mentions preview or ui; otherwise grep all kt (slower but exact)
    kt_with_preview=$(git -C "$dir" grep -l --no-color '@Preview' -- '*.kt' 2>/dev/null | wc -l || echo 0)
    if [[ "$kt_with_preview" -gt 0 ]]; then
      modules=$(git -C "$dir" grep -l --no-color '@Preview' -- '*.kt' 2>/dev/null | sed -E 's#/src/.*##' | sort -u | jq -R . | jq -s .)
      jq -nc --arg repo "$OWNER/$repo" --arg ref "$ref" --argjson modules "$modules" --argjson files "$kt_with_preview" \
        '{lane:"preview", repo:$repo, ref:$ref, modules:$modules, filesWithPreview:$files}' >> "$OUT/tmp/preview.jsonl"
    fi
  fi
done

# 3. Queues + manifest merge ----------------------------------------------
jq -s . "$OUT/tmp/web.jsonl"     > "$OUT/queue.web.json"
jq -s . "$OUT/tmp/preview.jsonl" > "$OUT/queue.preview.json"

# manifest: merge art entries by file path, keep existing W/P/D entries
[[ -f "$OUT/manifest.json" ]] || echo '{"version":1,"generated":"","entries":[]}' > "$OUT/manifest.json"
jq -s --arg now "$(date -u +%FT%TZ)" '
  .[0] as $m | .[1] as $art |
  ($art | map({
     id: ((.repo|split("/")[1]|ascii_downcase) + "." + (.path|gsub("[^A-Za-z0-9]+";".")|ascii_downcase)),
     imagery: (.repo|split("/")[1]|ascii_downcase),   # owner remaps to roster.imagery later
     role: "gallery", lane: "art", label: (.path|split("/")|last),
     src: .file, scheme: null, viewport: null, sample_data: false,
     source: {repo:.repo, ref:.ref, path:.path, tool:"harvest-screenshots.sh"}, device: null })) as $new |
  $m | .generated = $now
     | .entries = ((.entries | map(select(.lane != "art"))) + $new)
' "$OUT/manifest.json" <(jq -s . "$OUT/tmp/art.jsonl") > "$OUT/manifest.next.json" && mv "$OUT/manifest.next.json" "$OUT/manifest.json"

echo
echo "art entries:     $(jq '[.entries[]|select(.lane=="art")]|length' "$OUT/manifest.json")"
echo "web queue:       $(jq length "$OUT/queue.web.json")  → tools/shoot-web.mjs"
echo "preview queue:   $(jq length "$OUT/queue.preview.json")  → apply Compose screenshot plugin, run updateDebugScreenshotTest"
echo "device lane:     run tools/shoot-device.sh on the phone for IME/launcher/anything that must be real"
