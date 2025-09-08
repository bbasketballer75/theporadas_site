"""History rewrite helper to blank out known oversized blobs.

Primary role now: single source of TARGET blob IDs for the workflow to
parse. Still supports direct execution using git-filter-repo's Python
API across versions (older exported FilterRepo; newer exposes RepoFilter
and FilteringOptions). The GitHub Actions workflow prefers the CLI
`git filter-repo --strip-blobs-with-ids` path, but retaining API support
helps local experimentation.
"""

try:  # Newer versions dropped FilterRepo export; keep backwards compat
    from git_filter_repo import FilterRepo  # type: ignore
    _USE_FILTER_REPO = True
except Exception:  # pragma: no cover
    from git_filter_repo import RepoFilter, FilteringOptions  # type: ignore
    _USE_FILTER_REPO = False

# Candidate large transient blobs (trace artifacts, lock/search index, etc.)
# These are chosen because they appear to be generated outputs or test traces
# and should not be required for repository history going forward.
TARGET = {
    b"4ad31a946c26c0375004d2e5bbbd4b397369357d",
    b"fc6517564050311a87eab389139b375173036c56",
    b"6f056d2b008c8ff8f6f2af44d2840b9f0824ffab",
    b"a703c0fa51a24fb974dc70bf4879ff30c3680df1",
    b"73d129b168ae4d48354e8a70ef715fad0e1cdf09",
    b"7e1fcf7b40dec0a4ac01bd3f7438ad75d7ec7028",
    b"167e274dac2c44a40cfee7b7893805909cc9a188",
    b"4a3cb4ab22f87aab4feb4b4de9c4e237d9dd00b0",
    b"dd50fa161a12985eaf049eb7fb7422f2def1416a",
    b"e5dadabedeea518d5fd1afef2ea0d78566cc1091",
    b"181094291d63f3592c82bd4625cb9e4e5b7ffe73",
    b"fd9329f2bc51fa18733e8c6b891c1df23679a6af",
    b"a308f7bb2d61fd026b24475e53d210a242937740",
    b"5fe597bea995867306df53e3783084d2d0c9027e",
    b"bdf702c89580e1e5336cea61e2be369035333d2e",
    b"889d217c23cd64214f8f1c9d220fe74b7c76fb82",
    b"b00b203a809594cf8dca36c5ea09faee61aa992b",
    b"4062b7ff677b98ec6d842088f356008e7110b3af",
    b"a630cb60b3616e70ecd46fafe908a8b1113be99d",
    b"6742b52512f99c71c85f76c61e00d85cf711408d",
    b"742b5ed8acc93aa5c6ea18881630b5829c549d46",
    b"0d4e1f9d4b429ac453f5eb7dc670355aa393cb30",
    b"6d09732949d4d0296a351545ceeb6dfc12c5645e",
    b"9a44880b9b915bdecf62b92819728ae898a6f222",
    b"183dd5441e194b92aa81d1b71c27a1b483d67e00",
}


def blob_callback(blob, metadata):  # type: ignore[unused-argument]
    # git-filter-repo passes a Blob object; original_id is the 40-hex (bytes)
    if getattr(blob, "original_id", None) in TARGET:
        blob.data = b""  # blank out content


def main():
    if _USE_FILTER_REPO:
        FilterRepo(blob_callback=blob_callback, force=True).run()  # type: ignore
    else:
        # Emulate basic FilterRepo(force=True) invocation
        args = FilteringOptions.parse_args(["--force"])  # type: ignore
        RepoFilter(args, blob_callback=blob_callback).run()  # type: ignore


if __name__ == "__main__":
    main()
