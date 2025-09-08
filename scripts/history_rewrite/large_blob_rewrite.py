#!/usr/bin/env python3
import sys
try:
    import git_filter_repo as gfr
except ImportError:
    print("git-filter-repo not installed", file=sys.stderr)
    sys.exit(2)
# Dynamic list: read from large_blob_shas.txt produced earlier
try:
    with open('large_blob_shas.txt','r') as f:
        TARGETS={l.strip() for l in f if l.strip()}
except FileNotFoundError:
    print('large_blob_shas.txt missing', file=sys.stderr)
    TARGETS=set()
print(f'Rewriting {len(TARGETS)} blobs (emptying)')

def blob_callback(blob, metadata):
    if blob.oid in TARGETS:
        blob.data=b''

gfr.FilterRepo(blob_callback=blob_callback).run()
