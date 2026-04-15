#!/bin/bash
# Screenshots every primary page of the dev PM dashboard and saves to
# ../screenshots/. Single "current snapshot" set — re-running overwrites.
#
# Usage:   ./tools/screenshot-dashboard.sh [base_url]
# Default: https://pm.srv1466948.hstgr.cloud   (with basicauth admin:quietly2024)
#
# Each page waits 3 seconds for JS to hydrate before snapping. Output is 1440×900.
# Requires Google Chrome (macOS default path).

set -euo pipefail

BASE_URL="${1:-https://admin:quietly2024@pm.srv1466948.hstgr.cloud}"
OUT_DIR="$(cd "$(dirname "$0")/../screenshots" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -f "$CHROME" ]; then
  echo "❌ Chrome not found at $CHROME" >&2
  exit 1
fi

echo "📸 Saving snapshots to: $OUT_DIR"
echo "🌐 Base URL: ${BASE_URL//:quietly2024/:***}"
echo ""

# list: "path | filename" — edit here to add/remove pages
PAGES=(
  "/                                | 01-dashboard.png"
  "/inbox                           | 02-inbox.png"
  "/tickets                         | 03-tickets.png"
  "/properties                      | 04-properties.png"
  "/tenants                         | 05-tenants.png"
  "/vendors                         | 06-vendors.png"
  "/reporting                       | 07-reporting.png"
  "/announcements                   | 08-announcements.png"
  "/help                            | 09-help.png"
  "/settings                        | 10-settings.png"
  "/settings/audit                  | 11-settings-audit.png"
  "/settings/advanced               | 12-settings-advanced.png"
  "/changelog                       | 13-changelog.png"
  "/leases                          | 14-leases.png"
)

shot() {
  local path="$1"
  local name="$2"
  local url="${BASE_URL}${path}"
  local out="$OUT_DIR/$name"

  echo -n "  $path → $name ... "
  # --virtual-time-budget gives the client-side JS time to hydrate + render.
  # --hide-scrollbars keeps the frame clean.
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --window-size=1440,900 \
    --virtual-time-budget=5000 \
    --screenshot="$out" \
    "$url" \
    > /dev/null 2>&1

  if [ -f "$out" ]; then
    echo "✓"
  else
    echo "✗ (failed)"
  fi
}

for entry in "${PAGES[@]}"; do
  path="$(echo "$entry" | awk -F'|' '{print $1}' | xargs)"
  name="$(echo "$entry" | awk -F'|' '{print $2}' | xargs)"
  shot "$path" "$name"
done

echo ""
echo "✅ Done. $(ls "$OUT_DIR"/*.png 2>/dev/null | wc -l | xargs) screenshots in $OUT_DIR"
