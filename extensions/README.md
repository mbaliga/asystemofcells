# Extensions

Installable extensions for the apps in this house, one folder per app. The catalog is static files in this repository: each app
downloads its own `index.json` only when the user opens its extension browser, and `asystemofcells.com` renders the same files as the
extension store.

```
extensions/
  <app>/                 one folder per app (today: clackpad/)
    catalog.json         what goes into the index: status and non-commercial flag per extension
    index.json           the catalog the app reads (generated)
    dist/                built packages, <id>-<version>.cpx, committed (the index points at them)
    <extension>/         extension.json, icon.png, README.md, LICENSE, NOTICE.md, CHANGELOG.md
  sdk/                   vendored validator and packer (copied from the Clackpad repo's clackpad/extensions-sdk)
  tools/build.mjs        validate, pack deterministically, regenerate an app's index
```

## Clackpad

Catalog URL the app uses by default:
`https://raw.githubusercontent.com/mbaliga/asystemofcells/main/extensions/clackpad/index.json`

| Extension | Id | Status |
|---|---|---|
| [Raised frets](clackpad/raised-frets/) | `dev.asystemofcells.frets.raised` | fan-made, non-commercial |
| [Send to Obsidian](clackpad/send-to-obsidian/) | `dev.asystemofcells.sendto.obsidian` | community, non-commercial |

Both are independent, unofficial projects (see each `NOTICE.md`). Code is MIT.

## Working on it

```
node extensions/tools/build.mjs clackpad            # validate, pack, rewrite dist/ and index.json
node extensions/tools/build.mjs clackpad --check    # change nothing; fail if anything is stale (CI runs this)
```

To release a new version: change the extension, bump `version` in its `extension.json` (never reuse a version number with different
bytes), add a line to its `CHANGELOG.md`, run the build, commit `dist/` and `index.json`. Keep older `.cpx` files in `dist/`.

Curation rules and the reviewer checklist live in the Clackpad repository (`docs/EXTENSIONS_CATALOG.md`, `docs/EXTENSIONS_REVIEW.md`);
they move to `asystemofcells.dev` with the developer documentation.
