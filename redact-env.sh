#!/bin/sh
# Helper script placed at repository root so git filter-branch can execute it
if git ls-files -s .env >/dev/null 2>&1; then
  oid=$(git ls-files -s .env | awk '{print $2}')
  git cat-file -p "$oid" | sed -E 's/github_pat_[A-Za-z0-9_\-]+/REDACTED_GITHUB_PAT/g; s/NOTION_TOKEN=[^\n]+/NOTION_TOKEN=REDACTED/g; s/CANVA_MCP_ACCESS_TOKEN=[^\n]+/CANVA_MCP_ACCESS_TOKEN=REDACTED/g' > /tmp/.env.redacted
  newblob=$(git hash-object -w /tmp/.env.redacted)
  git update-index --cacheinfo 100644 $newblob .env
fi
