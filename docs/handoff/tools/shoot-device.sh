#!/usr/bin/env bash
# shoot-device.sh — Lane D: a real capture from the owner's phone over adb. The only lane that may
# be labelled "Captured on device". Run by the owner, one shot per invocation, after navigating.
#
#   tools/shoot-device.sh <imagery> <label> [role=feature] [--out screenshots]
#   e.g. tools/shoot-device.sh clackpad "Keyboard over notes, dark" hero
set -euo pipefail
IMAGERY="$1"; LABEL="$2"; ROLE="${3:-feature}"; OUT="screenshots"
[[ "${4:-}" == "--out" ]] && OUT="$5"
command -v adb >/dev/null || { echo "adb not found" >&2; exit 1; }
command -v jq  >/dev/null || { echo "jq not found" >&2; exit 1; }

slug=$(echo "$LABEL" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/(^-|-$)//g')
dir="$OUT/device/$IMAGERY"; mkdir -p "$dir"
file="$dir/$slug.png"

model=$(adb shell getprop ro.product.model | tr -d '\r')
android=$(adb shell getprop ro.build.version.release | tr -d '\r')
pkg=$(adb shell dumpsys activity activities 2>/dev/null | grep -oE 'topResumedActivity.*' | grep -oE '[a-z][a-z0-9_.]+/' | head -1 | tr -d '/' || true)
appver=""
[[ -n "$pkg" ]] && appver=$(adb shell dumpsys package "$pkg" 2>/dev/null | grep -m1 versionName | sed 's/.*versionName=//' | tr -d '\r' || true)
scheme=$( [[ "$(adb shell settings get secure ui_night_mode | tr -d '\r')" == "2" ]] && echo dark || echo light )

adb exec-out screencap -p > "$file"
read -r w h < <(python3 -c "import struct,sys;f=open('$file','rb');f.read(16);print(*struct.unpack('>II',f.read(8)))")

mp="$OUT/manifest.json"; [[ -f "$mp" ]] || echo '{"version":1,"generated":"","entries":[]}' > "$mp"
id="$IMAGERY.$slug.phone.$scheme"
jq --arg id "$id" --arg imagery "$IMAGERY" --arg role "$ROLE" --arg label "$LABEL" --arg src "$file" \
   --argjson w "$w" --argjson h "$h" --arg scheme "$scheme" --arg model "$model" --arg android "$android" \
   --arg pkg "$pkg" --arg appver "$appver" --arg now "$(date -u +%FT%TZ)" '
  .generated = $now
  | .entries = (.entries | map(select(.id != $id))) + [{
      id:$id, imagery:$imagery, role:$role, lane:"device", label:$label, src:$src, w:$w, h:$h,
      scheme:$scheme, viewport:"phone", sample_data:false,
      source:{repo:null, ref:null, path:null, tool:"adb screencap"},
      device:{model:$model, android:$android, package:$pkg, appVersion:$appver} }]' "$mp" > "$mp.next" && mv "$mp.next" "$mp"
echo "captured $file  ($model, Android $android, $pkg $appver, $scheme) → manifest entry $id"
