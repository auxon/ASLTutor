#!/usr/bin/env bash
# Build SignFlow ASL and prepare output for Entangleit.com Cloudflare Pages deploy.
#
# Usage:
#   ./scripts/prepare-entangleit-deploy.sh [TARGET_DIR]
#
# If TARGET_DIR is provided (your Entangleit.com site publish root), copies
# dist output to TARGET_DIR/ASLTutor/.
#
# Routing is handled by TARGET_DIR/_worker.js (Advanced Mode). This script
# does NOT write catch-all _redirects rules that would fight the worker.
#
# Example:
#   ./scripts/prepare-entangleit-deploy.sh ~/entangleit/portfolio/public

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/apps/web/dist"
TARGET="${1:-}"

# Resolve target against the caller's cwd before we change directories.
if [[ -n "$TARGET" ]]; then
  TARGET="$(cd "$TARGET" && pwd)"
fi

echo "Building SignFlow ASL..."
cd "$ROOT"
npm run build

if [[ ! -d "$DIST" ]]; then
  echo "Error: build output not found at $DIST" >&2
  exit 1
fi

echo "Verifying subpath asset references..."
if ! grep -q '/ASLTutor/' "$DIST/index.html"; then
  echo "Error: index.html does not reference /ASLTutor/ assets" >&2
  exit 1
fi
if [[ ! -f "$DIST/sw-v5.js" ]]; then
  echo "Error: dist/sw-v5.js missing" >&2
  exit 1
fi
if ! grep -q 'signflow-sw-kill' "$DIST/sw.js"; then
  echo "Error: dist/sw.js is not the kill-switch worker" >&2
  exit 1
fi

SW="$DIST/sw-v5.js"
if [[ -f "$SW" ]] && ! grep -q 'signflow-reload-clients' "$SW"; then
  cat >> "$SW" <<'EOF'

/* signflow-reload-clients */
self.addEventListener("activate",event=>{event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:!0}).then(cs=>Promise.all(cs.map(c=>typeof c.navigate=="function"?c.navigate(c.url):undefined))))});
EOF
fi

echo "Build OK — output at $DIST"
echo "Contents:"
ls -la "$DIST"

if [[ -n "$TARGET" ]]; then
  ASL_DIR="$TARGET/ASLTutor"

  echo "Copying to $ASL_DIR ..."
  mkdir -p "$ASL_DIR"
  rm -rf "${ASL_DIR:?}"/*
  cp -a "$DIST/." "$ASL_DIR/"

  # Cloudflare Pages ASSETS often SPA-fallback nested index.html to the site root.
  cp "$ASL_DIR/index.html" "$ASL_DIR/app.html"

  # Nested _redirects inside ASLTutor/ is unused by Pages (only root matters)
  # and can confuse future merges — keep a note only.
  cat > "$ASL_DIR/_redirects" <<'EOF'
# Served under /ASLTutor/ — site routing is owned by public/_worker.js
EOF

  if [[ -f "$TARGET/_worker.js" ]]; then
    echo "Found _worker.js — skipping _redirects merge (Advanced Mode routing)."
  else
    echo "WARNING: $TARGET/_worker.js missing." >&2
    echo "Copy portfolio/static/_worker.js into the publish dir before deploying." >&2
  fi

  echo "Deploy bundle ready at $TARGET"
  echo "Next: npx wrangler pages deploy $TARGET --project-name=richard-hein-portfolio --commit-dirty=true"
fi
