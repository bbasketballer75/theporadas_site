"""History rewrite helper to blank out known oversized transient blobs.

Only targets ephemeral Playwright trace archives (trace.zip) that should not be part of long-term history.
This preserves required site media assets (photos, webp images) while reclaiming space.
"""
from git_filter_repo import FilterRepo  # type: ignore
# Ephemeral Playwright trace zip blob SHAs (byte strings)
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
}

def blob_callback(blob, metadata):  # type: ignore[unused-argument]
    if blob.hexsha in TARGET:
        blob.data = b""

def main():
    FilterRepo(blob_callback=blob_callback, force=True).run()

if __name__ == "__main__":
    main()
