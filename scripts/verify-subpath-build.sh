#!/usr/bin/env bash
# Verify ASL subpath build output before Cloudflare deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/apps/web/dist"
FAIL=0

check() {
  if "$@"; then
    echo "OK: $*"
  else
    echo "FAIL: $*" >&2
    FAIL=1
  fi
}

cd "$ROOT"
npm run build >/dev/null

check test -f "$DIST/index.html"
check grep -q '/ASLTutor/assets/' "$DIST/index.html"
check test -f "$DIST/_redirects"
check grep -q '/ASLTutor/\*' "$DIST/_redirects"
check test -f "$DIST/sw.js"
if grep -q 'registerSW.js' "$DIST/index.html" 2>/dev/null; then
  echo "FAIL: index.html still references missing registerSW.js" >&2
  FAIL=1
else
  echo "OK: no broken registerSW.js reference"
fi

if [[ $FAIL -eq 0 ]]; then
  echo ""
  echo "All subpath checks passed."
  echo "Deploy with: ./scripts/prepare-entangleit-deploy.sh /path/to/entangleit-site/public"
else
  exit 1
fi
