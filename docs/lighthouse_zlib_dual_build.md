# Lighthouse Dual Zlib Bundle Strategy

This project vendors Lighthouse and produces two DevTools browser bundles to
measure the cost of including real zlib (pako) compression logic.

## Modes

| Mode           | Env Toggle                      | Description                                                                   |
| -------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Shim (default) | (unset) `LH_DISABLE_ZLIB_SHIMS` | Replaces `zlib` and internal `__zlib-lib/*` modules with lightweight stubs    |
|                |                                 | exporting no-op inflate/deflate functions.                                    |
| Full           | `LH_DISABLE_ZLIB_SHIMS=1`       | Bundles real pako inflate/deflate by overriding `zlib` + polyfill specifiers. |

A global sentinel `__LH_ZLIB_MODE` is set to `"shim"` or `"full"` at runtime
for diagnostics and regression checks.

## Build Scripts

- `npm run lh:build` – Build shim (default) bundle.
- `npm run lh:build:full` – Build full bundle with real zlib.
- `npm run lh:compare` – Builds both variants sequentially, captures raw + gzip
  sizes, enforces regression thresholds, and writes
  `lighthouse_bundle_sizes.json`.

## Regression Guard

`scripts/compare_lighthouse_bundles.mjs` asserts:

1. Gzip & raw size deltas are positive.

1. Gzip delta meets minimum thresholds:

- Bytes: `LH_MIN_GZIP_DELTA_BYTES` (default `1`)
- Percent: `LH_MIN_GZIP_DELTA_PCT` (default `0.05`%)

1. Raw (uncompressed) delta meets minimum thresholds:

- Bytes: `LH_MIN_RAW_DELTA_BYTES` (default `1`)
- Percent: `LH_MIN_RAW_DELTA_PCT` (default `0.05`%)

1. Sentinel marker appears in each bundle (warns if absent).

If any assertion fails, the script exits with a non‑zero status (CI failure).

### Adjusting Thresholds

Example tightening to require at least 10KB gzip delta and 1% increase (and
similarly for raw delta):

```bash
LH_MIN_GZIP_DELTA_BYTES=10240 \
LH_MIN_GZIP_DELTA_PCT=1 \
LH_MIN_RAW_DELTA_BYTES=10240 \
LH_MIN_RAW_DELTA_PCT=1 \
npm run lh:compare
```

## Implementation Notes

- Replacement logic lives in `lighthouse/build/build-bundle.js`.
- Full mode resolves pako location dynamically (`require.resolve('pako/package.json')`).
- We override the _bare_ `zlib` import early instead of emulating every
  internal binding step, avoiding esbuild polyfill resolver panics previously
  encountered.
- Internal null-char (`\0polyfill-node.__zlib-lib/*`) specifiers are also
  mapped in full mode for resilience.
- In shim mode, we explicitly ignore pako's heavy inflate module to guarantee
  the size difference.

## Artifact

`lighthouse_bundle_sizes.json` example structure:

```json
{
  "timestamp": "2025-08-24T18:25:43.511Z",
  "shimmed": { "raw": 2277552, "gzip": 647784 },
  "full": { "raw": 2326361, "gzip": 664177 },
  "delta": { "raw": 48809, "gzip": 16393 }
}
```

## CI Usage

Add an npm script alias (see below) and run during CI pipeline:

```bash
npm run lh:verify-bundles
```

Optionally set stricter thresholds via environment variables.

## Future Enhancements

- Add explicit check that known inflate symbols (e.g. `inflate_table`) appear only in full bundle.
- Surface bundle diff stats (module counts) for deeper analysis.
- Integrate with Lighthouse performance scoring thresholds.
