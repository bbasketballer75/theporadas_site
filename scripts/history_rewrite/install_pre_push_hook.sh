#!/usr/bin/env bash
set -euo pipefail
THRESHOLD="${1:-50000000}"
HOOK=.git/hooks/pre-push
cat > "$HOOK" <<EOF
#!/usr/bin/env bash
max=$THRESHOLD
viol=0
while read local remote; do
  range="$remote..$local"
  [ -z "$remote" ] && range="$local"
  for obj in $(git rev-list --objects $range); do
    sha=$(echo $obj | cut -d' ' -f1)
    size=$(git cat-file -s $sha 2>/dev/null || echo 0)
    if [ "$size" -ge "$max" ]; then
      path=$(echo $obj | cut -d' ' -f2-)
      echo "ERROR: Blob $sha size $size path $path exceeds threshold $max" >&2
      viol=1
    fi
  done
done
if [ $viol -ne 0 ]; then
  echo "Push blocked due to large blobs." >&2
  exit 1
fi
exit 0
EOF
chmod +x "$HOOK"
echo "Installed pre-push hook with threshold $THRESHOLD bytes"
