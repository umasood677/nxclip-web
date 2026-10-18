# Smart Typography T2-B1 — verified asset packaging

Completed 2026-10-17. Scope: isolated assets, registry, validation, proposed editorial metadata. No UI, worker, API, DTO, shared contract, deployment or existing production font file was modified.

## Source and license matrix

Original binaries, metadata and licenses come from Google's authoritative Google Fonts distribution at commit **47d54ca1ebb14fd864695f1d39dc734f39017c33**. The project revisions below are those recorded in that immutable distribution metadata; NxClip does not claim to have rebuilt the binaries from each project repository.

| Family | Official upstream | Upstream revision recorded by Google | Packaged license | Reserved Font Names |
|---|---|---|---|---|
| Bebas Neue | [Project](https://github.com/dharmatype/Bebas-Neue) | `686d14af640c17af3691c597778f121d840d9051` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/bebas-neue/OFL.txt) | None stated in license header |
| Anton | [Project](https://github.com/googlefonts/AntonFont) | `beb92fcad87808357123bb66881b4032dc96efe7` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/anton/OFL.txt) | None stated in license header |
| Archivo Black | [Project](https://github.com/Omnibus-Type/ArchivoBlack) | `95df3c54d818473a3e362f30ae3059bd85b80036` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/archivo-black/OFL.txt) | None stated in license header |
| Montserrat | [Project](https://github.com/JulietaUla/Montserrat) | `cc8daf2e7085006b9c112542fc82b58afc13521d` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/montserrat/OFL.txt) | None stated in license header |
| Poppins | [Project](https://github.com/itfoundry/Poppins) | `738d9d691b66f1ad917123c58df104d16c74e1a7` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/poppins/OFL.txt) | None stated in license header |
| Inter | [Project](https://www.github.com/rsms/inter) | `66647c0bbbe41a850d79d9c76fb13add3378940f` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/inter/OFL.txt) | None stated in license header |
| Playfair Display | [Project](https://github.com/clauseggers/Playfair) | `80a334101928546b04fa9e709ad4b2f11f8a9e10` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/playfair-display/OFL.txt) | Playfair Display |
| Plus Jakarta Sans | [Project](https://github.com/tokotype/PlusJakartaSans) | `18d1cd2f7ea10481919d2f05c1f7064b7307fc26` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/plus-jakarta-sans/OFL.txt) | None stated in license header |
| Caveat | [Project](https://github.com/googlefonts/caveat) | `59745e818ef7973e11e70cb1358d0e902b56c5fc` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/caveat/OFL.txt) | None stated in license header |
| JetBrains Mono | [Project](https://github.com/JetBrains/JetBrainsMono) | `19371302b95d218af43299bce79ddbddd0bc364d` | [OFL-1.1](../../../public/fonts/clip-typography/1.0.0/jetbrains-mono/OFL.txt) | None stated in license header |

All ten full OFL texts are retained unchanged. Each family additionally has NOTICE.txt with every embedded copyright encountered in its original and browser binaries. The package preserves differing historical copyright notices rather than replacing them with a newer header. OFL redistribution conditions include retaining notices/license, not selling font software by itself, and respecting applicable Reserved Font Names for modified versions. No binary conversion, subsetting, instancing or synthesis was performed locally. Google's already distributed static browser subsets are retained byte-for-byte.

## Exact face inventory and original checksums

All normal/italic labels below are checked against binary metadata. Variable originals retain their axes; they are not mislabeled static weight instances. Browser WOFF2 assets in this package are static, exact requested weights/styles.

| Canonical face | Original kind | Original cmap codepoints | Browser subsets / release | Original SHA-256 |
|---|---|---:|---|---|
| bebas-neue-400-normal | static | 462 | 2 / v16 | `08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73` |
| anton-400-normal | static | 979 | 3 / v27 | `a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab` |
| archivo-black-400-normal | static | 424 | 2 / v23 | `dd9a89a019b4849f66ab75455fe7bdf931311042cbb0f0f97acc061539703180` |
| montserrat-800-normal | variable | 1313 | 5 / v31 | `0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7` |
| montserrat-900-normal | variable | 1313 | 5 / v31 | `0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7` |
| poppins-700-normal | static | 472 | 3 / v24 | `983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c` |
| poppins-900-normal | static | 472 | 3 / v24 | `d82aaaf98a9283f9a8edd24e51173337d8eaf09e25cd3d98831f8ec8461748a1` |
| inter-700-normal | variable | 2849 | 7 / v20 | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| inter-900-normal | variable | 2849 | 7 / v20 | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| playfair-display-700-normal | variable | 660 | 4 / v40 | `c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6` |
| playfair-display-400-italic | variable | 660 | 4 / v40 | `a5e26dc5e2e77fb2803a0bf02fd4f81ee136ec8dea863ccdb0c59a263b21378b` |
| plus-jakarta-sans-700-normal | variable | 722 | 4 / v12 | `89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8` |
| plus-jakarta-sans-800-normal | variable | 722 | 4 / v12 | `89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8` |
| caveat-700-normal | variable | 754 | 4 / v23 | `0bdb6b660482d31531b3945849fba5916b3ef8695da7024a9e6b9ee3c4157988` |
| jetbrains-mono-700-normal | variable | 977 | 6 / v24 | `48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda` |

Every browser checksum, original URL, source revision, binary version, family/preferred-family name, axes, Unicode range and notice checksum is recorded in [font-source-lock.json](./font-source-lock.json). [asset-inventory.csv](./asset-inventory.csv) contains the complete flat file/checksum/URL inventory.

Lock SHA-256: '478638ada678e0114ae176a3f4522b2a303fe3300cf9b0f18d0228dfea208615'.

## Package inventory

Version: **1.0.0**. Frontend asset root: 'public/fonts/clip-typography/1.0.0/'.

- 63 WOFF2 subset files for 15 exact faces.
- 12 distinct untouched original TTFs (variable originals are referenced by multiple faces).
- 10 full OFL license files, 10 supplemental NOTICE files, 10 upstream METADATA.pb files.
- 15 captured upstream CSS responses and one opt-in self-hosted fonts.css.
- 121 package files total; 4647761 bytes, excluding registry lock/report code.

The CSS uses names prefixed 'NxClip T2' to avoid collisions with existing production font families. No source file imports this stylesheet. Its font URLs are local; loading it would not make runtime requests to Google.

## Reproducibility and separate sources

Browser WOFF2s are obtained from Google's first-party fonts.googleapis.com / fonts.gstatic.com delivery, not a third-party mirror. Each final asset URL has a recorded delivery release and a full SHA-256. These delivery versions are independent of the pinned repository distribution. Equality of family names is not used as proof of identical browser/original builds or layout parity.

Mutable CSS API requests are used only during initial discovery. Exact CSS bytes are retained in the package and embedded in the lock for replay. Generated notices and local CSS are also embedded for replay. Replay downloads only the locked raw GitHub and version-specific gstatic asset URLs, checking hashes before writing; it never queries the CSS API. Existing different bytes are not overwritten. Bootstrap refuses to refresh an existing lock/version.

Commands from D:/NxClip-Web:


node src/lib/clipTypography/packageFonts.mjs --verify
node src/lib/clipTypography/packageFonts.mjs --replay
node src/lib/clipTypography/packageReport.mjs


Replay needs network access; verification and report generation are offline. The verifier uses the sibling backend's existing fontkit package and installs nothing.

## Browser and renderer compatibility

Browser availability is **packaged**: WOFF2 containers parse, binary names/weight/style and cmap ranges are inspected, and local CSS declarations are supplied. Browser runtime loading and cross-browser appearance have not been tested. No full language or shaping support is inferred from cmap coverage.

Renderer availability is **retained-candidate**. Originals stay in the frontend package, outside media-worker. Variable coordinate intent is explicit per face: requested wght, plus upstream defaults for other axes (Inter opsz 14). All faces remain **export blocked** and selectionVerified=false. Actual FFmpeg/libass family, weight, italic and variable-axis selection must be verified before export-ready status.

Original cmap coverage and browser subset cmap coverage are separately recorded. CSS unicode-range filters are retained independently of actual cmap ranges. The package does not promise identical coverage or shaping between them. testedLanguages remains empty.

## Existing discrepancies and saved projects

The previous Inter-Bold.ttf is a variable font with default 400, wght 100–900 and opsz 14–32. The new browser 700/900 files are verified static faces; the new retained Inter original remains variable with explicit target coordinates. No old font was replaced.

The previous Montserrat-Black.ttf has legacy family Montserrat Black, preferred family Montserrat and preferred subfamily Black. New package metadata is independent, and worker selection is still unverified.

All seven existing Clip IDs and compatibility aliases remain unchanged: impact→Anton 400, arial→Inter 700, arial_black→Montserrat 900; existing direct IDs keep their intended face. Existing production catalog, saved project values, API validation and worker mappings are untouched. Canonical IDs are not written into saved projects by this phase. Unknown new IDs never silently substitute.

## Typography metadata

Category values are verified from pinned upstream metadata. AI intent tags, use cases, capitalization and default styling are populated as **Codex proposals, not user-approved original specification values**. originalMetadata remains null, editorial.status=proposed and provenance=codex-proposal-not-user-approved. Required families/weights/styles come from the user's approved list. All proposed default faces exist in the package.

## Verification

- Registry, existing-font and packaged-asset suites: **24/24 pass, exit 0**.
- Isolated TypeScript compile with resolveJsonModule: **exit 0**.
- Targeted ESLint: **exit 0**.
- Offline package verification: **exit 0**.
- Locked network replay: **exit 0**, all 121 files match the lock after replay.

Tests inspect actual binaries/notices/checksums and inject missing/corrupt bytes in memory. They cover identity, exact weight/style or variable-axis availability, duplicate IDs, aliases, cmap metadata, version consistency, source URLs and release evidence. No production rendering jobs or language/shaping certification were performed. No full-app build was run because these modules are unintegrated and it would rewrite unrelated dist output.

## Changed files and parallel work

Changes are confined to 'src/lib/clipTypography/' and the new versioned font directory. The source lock, packaging/verifier/report scripts, package types, proposed metadata and package tests are new. Existing registry/validator, registry tests and README are updated. T2-A existing-font binaries/audit snapshots are unchanged.

Both repos remain on master. Existing uncommitted Ad Studio/route/API-client changes and backend documentation changes are preserved. Cursor's Phase 4B-D files remain protected. No branch/worktree, dependency installation, migration, paid AI call, render job, commit, push or deployment was performed.

## Remaining worker integration blockers

1. Explicit approval to touch worker/shared contracts or production UI.
2. Choose and verify renderer static/variable strategy; no assumption that ASS bold means exact 900.
3. Install approved font bytes/notices into the worker image and test actual fontconfig/libass selection.
4. Reconcile browser/original build differences, axes and glyph coverage; test representative scripts, line breaks, outlines, sizing and placement across aspect ratios.
5. Add backwards-compatible API/persistence adapters without changing legacy IDs, then invalidate render caches when font assets/styles change.
6. Review/approve proposed editorial metadata before treating it as original requirements.

Stopped after T2-B1. No new font is exposed in Clip Studio.
