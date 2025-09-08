#!/usr/bin/env bash
set -euo pipefail
THRESHOLD_BYTES="${1:-15000000}" # 15MB default
missing=0
while read -r sha path; do
  [ -z "$sha" ] && continue
  size=$(git cat-file -s "$sha" 2>/dev/null || echo 0)
  if [ "$size" -ge "$THRESHOLD_BYTES" ]; then
    if [ -f "$path" ]; then
      if ! grep -q "oid sha256:" "$path" 2>/dev/null; then
        echo "MISSING LFS: $path ($size bytes)"
        missing=1
      fi
    fi
  fi
done < <(git rev-list --objects HEAD | awk '{print $1" "$2}')
exit $missing
