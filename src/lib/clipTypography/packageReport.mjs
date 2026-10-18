/** Regenerate documentation/inventory from the immutable asset lock; no network. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const directory=new URL("./",import.meta.url);
const bytes=readFileSync(new URL("font-source-lock.json",directory));
const lock=JSON.parse(bytes);
const checksum=createHash("sha256").update(bytes).digest("hex");
const matrix=lock.families.map((font)=>`| ${font.family} | [Project](${font.officialRepository}) | \`${font.officialRevision}\` | [OFL-1.1](../../../${font.licensePath}) | ${font.reservedFontNames.join(", ")||"None stated in license header"} |`).join("\n");
const faces=lock.families.flatMap((font)=>font.faces.map((face)=>`| ${face.id} | ${face.original.inspection.kind} | ${face.original.inspection.codepointCount} | ${face.browserAssets.length} / ${[...new Set(face.browserAssets.map((asset)=>asset.deliveryRelease))].join(", ")} | \`${face.original.sha256}\` |`)).join("\n");
const report=`# Smart Typography T2-B1 — verified asset packaging

Completed 2026-10-17. Scope: isolated assets, registry, validation, proposed editorial metadata. No UI, worker, API, DTO, shared contract, deployment or existing production font file was modified.

## Source and license matrix

Original binaries, metadata and licenses come from Google's authoritative Google Fonts distribution at commit **${lock.googleFontsRevision}**. The project revisions below are those recorded in that immutable distribution metadata; NxClip does not claim to have rebuilt the binaries from each project repository.

| Family | Official upstream | Upstream revision recorded by Google | Packaged license | Reserved Font Names |
|---|---|---|---|---|
${matrix}

All ten full OFL texts are retained unchanged. Each family additionally has NOTICE.txt with every embedded copyright encountered in its original and browser binaries. The package preserves differing historical copyright notices rather than replacing them with a newer header. OFL redistribution conditions include retaining notices/license, not selling font software by itself, and respecting applicable Reserved Font Names for modified versions. No binary conversion, subsetting, instancing or synthesis was performed locally. Google's already distributed static browser subsets are retained byte-for-byte.

## Exact face inventory and original checksums

All normal/italic labels below are checked against binary metadata. Variable originals retain their axes; they are not mislabeled static weight instances. Browser WOFF2 assets in this package are static, exact requested weights/styles.

| Canonical face | Original kind | Original cmap codepoints | Browser subsets / release | Original SHA-256 |
|---|---|---:|---|---|
${faces}

Every browser checksum, original URL, source revision, binary version, family/preferred-family name, axes, Unicode range and notice checksum is recorded in [font-source-lock.json](./font-source-lock.json). [asset-inventory.csv](./asset-inventory.csv) contains the complete flat file/checksum/URL inventory.

Lock SHA-256: '${checksum}'.

## Package inventory

Version: **${lock.assetVersion}**. Frontend asset root: 'public/fonts/clip-typography/${lock.assetVersion}/'.

- ${lock.files.filter((file)=>file.path.endsWith(".woff2")).length} WOFF2 subset files for 15 exact faces.
- ${lock.files.filter((file)=>file.path.endsWith(".ttf")).length} distinct untouched original TTFs (variable originals are referenced by multiple faces).
- 10 full OFL license files, 10 supplemental NOTICE files, 10 upstream METADATA.pb files.
- 15 captured upstream CSS responses and one opt-in self-hosted fonts.css.
- ${lock.files.length} package files total; ${lock.files.reduce((sum,file)=>sum+file.bytes,0)} bytes, excluding registry lock/report code.

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
`;
writeFileSync(fileURLToPath(new URL("T2-B1-REPORT.md",directory)),report);
const quote=(value)=>`"${String(value??"").replaceAll('"','""')}"`;
writeFileSync(fileURLToPath(new URL("asset-inventory.csv",directory)),`path,sha256,bytes,source_url\n${lock.files.map((file)=>[file.path,file.sha256,file.bytes,file.url].map(quote).join(",")).join("\n")}\n`);
console.log(`Wrote source/license report and ${lock.files.length}-file inventory`);
