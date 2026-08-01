#!/usr/bin/env bash
# Build SignFlow ASL and prepare output for Entangleit.com Cloudflare Pages deploy.
#
# Usage:
#   ./scripts/prepare-entangleit-deploy.sh [TARGET_DIR]
#
# If TARGET_DIR is provided (your Entangleit.com site publish root), copies
# dist output to TARGET_DIR/ASLTutor/ and merges _redirects rules.
#
# Example:
#   ./scripts/prepare-entangleit-deploy.sh ../entangleit-site/public

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/apps/web/dist"
TARGET="${1:-}"

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

echo "Build OK — output at $DIST"
echo "Contents:"
ls -la "$DIST"

if [[ -n "$TARGET" ]]; then
  TARGET="$(cd "$TARGET" && pwd)"
  ASL_DIR="$TARGET/ASLTutor"

  echo "Copying to $ASL_DIR ..."
  mkdir -p "$ASL_DIR"
  rm -rf "$ASL_DIR"/*
  cp -a "$DIST/." "$ASL_DIR/"

  REDIRECTS="$TARGET/_redirects"
  MERGE="$ROOT/deploy/entangleit-redirects.snippet"

  echo "Merging _redirects into $REDIRECTS ..."
  if [[ -f "$REDIRECTS" ]]; then
    # Prepend ASL rules if not already present
    if ! grep -q '/ASLTutor/\*' "$REDIRECTS"; then
      cat "$MERGE" "$REDIRECTS" > "$REDIRECTS.tmp"
      mv "$REDIRECTS.tmp" "$REDIRECTS"
    fi
  else
    cp "$MERGE" "$REDIRECTS"
  fi

  echo "Deploy bundle ready at $TARGET"
  echo "Next: push to Git or run 'wrangler pages deploy $TARGET --project-name=YOUR_PROJECT'"
fi
