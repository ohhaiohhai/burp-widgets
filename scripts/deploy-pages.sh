#!/usr/bin/env bash
# Build the demo and publish it to the `gh-pages` branch, which GitHub Pages
# serves at https://ohhaiohhai.github.io/burp-widgets/.
#
# Usage:  npm run deploy:pages   (from the repo root)
#
# This is the manual deploy path. Once the GitHub token has the `workflow`
# scope, this can be replaced by a GitHub Actions workflow that deploys on push.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "→ Building demo…"
npm run build:demo

ORIGIN="$(git config --get remote.origin.url)"
EMAIL="$(git config user.email || true)"; EMAIL="${EMAIL:-deploy@local}"
NAME="$(git config user.name || true)";  NAME="${NAME:-deploy}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -R demo-dist/. "$TMP/"
touch "$TMP/.nojekyll"   # tell Pages to serve files as-is (no Jekyll)

cd "$TMP"
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email="$EMAIL" -c user.name="$NAME" \
  commit -q -m "Deploy demo $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git remote add origin "$ORIGIN"
git push -q -f origin gh-pages

echo "✓ Deployed to gh-pages → https://ohhaiohhai.github.io/burp-widgets/"
echo "  (Pages takes ~30–60s to serve the new build.)"
