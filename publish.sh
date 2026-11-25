#!/usr/bin/env bash
# Re-publish the client deck to GitHub Pages.
#   ./publish.sh "what changed"
set -euo pipefail
cd "$(dirname "$0")"

rsync -a --delete \
  --exclude 'internal.html' --exclude 'BRIEF.md' --exclude '.DS_Store' \
  --exclude '.git' --exclude 'publish.sh' --exclude 'robots.txt' --exclude '.nojekyll' \
  --exclude 'LICENSE' --exclude 'README.md' \
  ../06-deck/ ./

git add -A
git commit -q -m "${1:-update deck}" || echo "nothing to commit"
git push -q origin main
echo "pushed — https://build-with-rasad.github.io/rafal-altaif/"
