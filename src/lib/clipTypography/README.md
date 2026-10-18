# Smart Typography T2-A — isolated registry and asset audit

Historical T2-A discovery follows. Current packaged assets, source/license matrix, checksums, compatibility and T2-B1 validation are documented in [T2-B1-REPORT.md](./T2-B1-REPORT.md). The staged manifest remains available for validation fixtures; `FONT_MANIFEST` now describes the isolated packaged catalog. No production editor imports it.

Status: foundation implemented; asset packaging and runtime integration deferred.
Audit date: 2026-10-17. Both repositories remain on master. No existing source file was edited.

## Architecture

- `registry.ts`: manifest schema 1.0.0, registry revision 0.1.0, ten stable family IDs, 15 explicit faces, contextual legacy compatibility mappings, source/license evidence, coverage and editorial metadata slots.
- `validateManifest.ts`: structural validation and stricter asset/release validation with an injected filesystem/checksum/notice probe. No filesystem or Node dependency in runtime registry modules.
- `auditExistingFonts.mjs`: read-only inspection using the backend's already installed fontkit. No download, network, worker import or dependency installation.
- `existing-font-audit.json`: reproducible binary evidence, SHA-256, embedded names/version/weight/axes, exact cmap ranges, diagnostic script samples and existing notice checksums for seven files.
- `registry.spec.ts`, `auditExistingFonts.spec.mjs`: registry safety and actual binary/snapshot regression tests.

Nothing imports this foundation into the editor. The existing frontend font catalog, API client, DTOs, shared contracts and worker are unchanged. Export status is blocked for every canonical face, including existing families: current legacy render support does not certify the new canonical identities.

Canonical family IDs use kebab case; face identity adds weight and style (e.g. `playfair-display-400-italic`). Existing persisted IDs are not renamed. Unknown IDs, unavailable weights and unsupported styles return no match. There is no automatic fallback for new identities.

Each face reserves an asset version, separate browser/renderer logical paths and separate SHA-256 values. These remain null until actual assets are approved and packaged. Null is not a placeholder checksum or a usable URL. Paths are relative to their owning repo; the packaging adapter must resolve browser repo paths to public URLs. Registry revision, asset version and upstream font version are independent.

Structural validation accepts an explicitly staged catalog. `requireAssets: true` reports all 30 missing canonical asset endpoints. Export-ready declarations additionally require packaging approval, both actual assets and matching hashes, a packaged notice with the expected copyright/OFL header, verified coverage and renderer evidence, and no blockers. These are release gates, not proof that caller-supplied evidence is correct; T2-B must supply trusted inspection and rendering checks.

## Required versus existing faces

| Canonical ID | Required faces | Local evidence / remaining work |
|---|---|---|
| bebas-neue | normal 400 | Worker static TTF parses; no corresponding local browser face in audited assets |
| anton | normal 400 | Worker TTF and Image Studio WOFF2 parse; versions/subsets are not certified as a pair |
| archivo-black | normal 400 | Missing locally in audited application font packs |
| montserrat | normal 800, 900 | Worker static 900; Image Studio WOFF2 reports 400; 800 absent from worker pack |
| poppins | normal 700, 900 | Missing locally in audited application font packs |
| inter | normal 700, 900 | Worker variable normal font can represent both; Image Studio WOFF2 reports 400; instances and renderer selection unverified |
| playfair-display | normal 700, italic 400 | Brand catalog entry only; no audited local binary |
| plus-jakarta-sans | normal 700, 800 | Missing locally in audited application font packs |
| caveat | normal 700 | Missing locally in audited application font packs |
| jetbrains-mono | normal 700 | Missing locally in audited application font packs |

Backend installed Fontsource packages also provide Anton, Inter and Montserrat assets and full LICENSE files. Their existence does not approve them for canonical packaging or imply matching worker versions. Other installed families, such as Bodoni Moda and Cormorant Garamond, are outside the required catalog.

All requested weights/styles are available in the reviewed upstream metadata: Bebas Neue, Anton and Archivo Black are normal 400 display designs; Poppins has static 700/900 files; Montserrat and Inter variable ranges cover 800/900 and 700/900; Playfair Display has separate normal/italic variable sources; Plus Jakarta Sans reaches 800, Caveat reaches 700, JetBrains Mono reaches 800. Sources are linked per entry; these are source candidates, not approved downloads.

## Legacy compatibility

Clip mappings preserve existing intent:

| Persisted ID | Canonical family / face |
|---|---|
| montserrat_black | montserrat / 900 normal |
| anton | anton / 400 normal |
| bebas_neue | bebas-neue / 400 normal |
| inter_bold | inter / 700 normal |
| impact | anton / 400 normal (existing Clip alias) |
| arial_black | montserrat / 900 normal (existing Clip alias) |
| arial | inter / 700 normal (existing Clip alias) |

Ad and Brand family IDs map without inventing a weight. Brand `playfair` maps to `playfair-display`. System `impact` in Ad/Brand is explicitly unsupported; it is not relabeled Anton. Brand `raleway`, `roboto`, `oswald`, `lato` remain explicitly outside this ten-family catalog. Existing catalogs and their behavior are untouched. Human-readable family names live in `family`; callers should use canonical IDs rather than guessing family-name aliases.

## Binary discrepancies resolved at metadata level

**Inter-Bold.ttf** is Inter 4.001, a variable font: default weight 400, `wght` 100–900, `opsz` 14–32, named Bold 700 and Black 900. Its filename is misleading. Static-bold identity cannot be inferred from it, and ASS bold flags do not establish explicit 900/optical-size selection. No binary was renamed or replaced.

**Montserrat-Black.ttf** is static weight 900, version 9.000. Legacy name ID 1 is `Montserrat Black`; preferred family is `Montserrat`, preferred subfamily `Black`. The worker's `Montserrat` request can therefore be consistent with preferred family naming. Actual fontconfig/libass resolution still needs a renderer test; no claim of failed selection is made.

The Image Studio Montserrat WOFF2 reports legacy family `Montserrat Thin` and OS/2 weight 400. It is not approved as a browser counterpart for the worker's 900 face. Its full metadata remains in the audit.

## Licenses and notices

Individual Google Fonts `METADATA.pb` and `OFL.txt` files were reviewed for all ten families on the audit date. Each registry entry links both files, records the OFL-1.1 identifier, copyright from the reviewed license, required notices and applicable Reserved Font Names. Playfair Display explicitly reserves its family name.

These are mutable upstream review URLs. T2-B must pin a source revision, capture the exact source license and copyright from that revision, and hash the packaged artifacts. Upstream license headers can differ from older binary metadata: current Inter OFL says 2020 while the existing binary says 2016; current Montserrat OFL says 2024 while the existing binary says 2011; Bebas Neue's license and binary notices also differ. Never attach a newer notice to an older binary on family-name similarity alone.

All four worker TTFs contain an embedded OFL declaration and copyright. The worker asset directory has a README but no standalone complete license text. The three Image Studio WOFF2 files each have a neighboring full OFL notice; notice files and their checksums are audited. This corrects the earlier incomplete discovery of available local license evidence. Existing license declarations do not by themselves establish complete redistribution packaging for canonical assets.

Package the exact copyright and full OFL text with each approved family; preserve applicable reserved names and review renaming obligations before subsetting/format conversion/instancing. No source or license approval has been inferred from this audit.

## Coverage and language limits

Exact Unicode cmap ranges are recorded per existing binary; upstream subset declarations are separately recorded per family. Codepoint counts: Anton TTF 979, Bebas Neue TTF 462, Inter TTF 2849, Montserrat TTF 1313; browser WOFF2s 233/231/233 respectively. These include encoded codepoints and are not counts of languages.

Diagnostic glyph samples find Cyrillic/Greek in Inter and Cyrillic in Montserrat, but none of the worker faces contain the sampled Arabic alef or Devanagari ka. These samples are not exhaustive script coverage tests. Upstream Poppins advertises Devanagari, which is not local proof. No Arabic/Urdu, Hindi, emoji, shaping or language guarantee is made. `testedLanguages` stays empty until full language samples and browser/export shaping are tested. Unpackaged canonical coverage remains pending.

## Original styling metadata

The required family/face list is implemented in full. The original per-font AI tags, use cases and styling values were not supplied in this conversation or found in searched repository documentation. Their fields remain explicitly `awaiting-original-spec`, with null values. `originalMetadata` preserves the complete source block when supplied, including fields beyond normalized defaults. No inferred editorial values overwrite the specification. This blocks completion of that metadata population, not registry/asset validation work.

## Parallel development safety

Only this new Clip-scoped directory is changed. At recheck, frontend Phase 4B tracked modifications include App.tsx, AdStudioEditor.tsx, AdCanvas.tsx and apiClient.ts; untracked animation files include the editor, Motion components, version-history panel and motion helper/spec files. Backend changes remain existing documentation, including the untracked 4B-A/B/C reports and commercial directory. All remain untouched. No shared package integration is attempted. Later cross-studio reuse requires coordinated adapters and separate approval for protected integration points.

## Proposed T2-B (approval required)

1. Approve the ten per-family Google Fonts source directories/licenses linked in the registry, pinned revisions and required styles; reconcile differing notices against chosen binaries.
2. Decide static renderer faces versus explicitly controlled variable instances, including Inter optical size. Prefer static required weights where renderer selection is easier to verify.
3. Package approved browser WOFF2 and renderer TTF assets for all 15 faces with exact notices and content hashes. Reuse existing bytes only after version/name/coverage checks pass.
4. Populate asset versions, paths, checksums and actual cmap coverage. Preserve reviewed source revision and conversion/instance provenance with the asset manifest.
5. Test integrity, script coverage and actual renderer selection; keep export blocked until browser/export parity is demonstrated. Worker edits require separate explicit approval.
6. Import original editorial metadata verbatim when supplied. UI exposure and cross-studio integration remain later work.

## Validation commands

From D:/NxClip-Web, using installed dependencies only:

```text
node --import tsx --test src/lib/clipTypography/registry.spec.ts src/lib/clipTypography/auditExistingFonts.spec.mjs
node node_modules/typescript/bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/lib/clipTypography/registry.ts src/lib/clipTypography/validateManifest.ts src/lib/clipTypography/registry.spec.ts --allowSyntheticDefaultImports
node node_modules/eslint/bin/eslint.js src/lib/clipTypography/registry.ts src/lib/clipTypography/validateManifest.ts src/lib/clipTypography/registry.spec.ts src/lib/clipTypography/auditExistingFonts.mjs src/lib/clipTypography/auditExistingFonts.spec.mjs
node src/lib/clipTypography/auditExistingFonts.mjs D:/NxClip
```

Results: 17/17 tests pass (exit 0); isolated TypeScript check exit 0; targeted ESLint exit 0; corrected read-only binary audit exit 0. An initial audit attempt exited 1 because the new script resolved the frontend root one directory too high; that script path was corrected before the snapshot was generated. No assets were modified.

The binary audit suite requires the sibling backend and its existing fontkit installation; the registry unit suite has no backend dependency. No production build is required for these unintegrated modules. The AGENTS.md names `lint_applet`/`compile_applet`; those tools are unavailable in this session, so ESLint and isolated TypeScript checks are used.
