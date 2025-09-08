#!/usr/bin/env bash
set -euo pipefail
THRESHOLD="${1:-50000000}"
base_ref="${2:-origin/main}"
viol=0
while read -r line; do
  sha=$(echo "$line" | cut -d' ' -f1)
  [ -z "$sha" ] && continue
  size=$(git cat-file -s "$sha" 2>/dev/null || echo 0)
  if [ "$size" -ge "$THRESHOLD" ]; then
    path=$(echo "$line" | cut -d' ' -f2-)
    echo "Large blob detected: $sha size $size path $path" >&2
    viol=1
  fi
done < <(git rev-list --objects "$base_ref"..HEAD)
if [ $viol -ne 0 ]; then
  echo "Blob size violations present" >&2
  exit 1
fi
