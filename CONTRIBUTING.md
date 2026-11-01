# Contributing

Open an issue before making a large change. Include a small example and the result you expect.

## Tests

Use Node.js 24 or later.

```sh
npm ci
npm test
npm run build
npm run check:release
npm audit --audit-level=moderate
```

Add a test for a bug before fixing it. Keep the command list tied to the MathJax system supplied by Obsidian. Use the native suggestion list for the interface.

Test editor changes in a separate vault. Do not use working notes as test data.

## Release

Keep the versions in `package.json`, `manifest.json`, and `versions.json` in agreement. Build and commit `main.js` with the source. Push a tag that exactly matches the manifest version, without a leading `v`.

The release workflow checks the source, builds the plugin, records build provenance, and uploads only `main.js`, `manifest.json`, and `styles.css`.
