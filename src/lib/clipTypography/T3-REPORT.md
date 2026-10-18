# Smart Typography T3 — implementation and release report

**Latest validation:** Local integration remains OFF. See [final local validation](./T3-FINAL-VALIDATION.md) and [exact proposed commit scope](./T3-PROPOSED-COMMIT.json). Fresh shared-overlay browser fixtures now pass; genuine non-production project save/reopen and post-Cursor-release reconciliation remain blocked. Earlier reconciliation and integration reports are historical checkpoints.

Local canonical parity: **105/105 passing fixtures**. Production activation remains OFF. Release status: INCOMPLETE — real non-production project workflow and Cursor release completion not verified.

## Implementation

The approved canonical-only version-1 layout is stored in existing Clip project `extras.canonicalTypography`; no migration or shared API-client change is needed. It carries exact face/version/checksum, bounded timed layers, CSS-em size, explicit lines/baselines, line height, alignment, tracking, fill, outline and hard shadow. The content service validates/preserves it; rendering receives a typed optional caption layout. Invalid geometry, text overrides, hashes, coverage, aspect or timing fail explicitly. Render fingerprints include the plan only when present, preserving legacy fingerprints.

Clip Studio has a Canvas preview path using the same verified source and geometry. New fonts are not exposed in the selector. Missing/corrupt fonts show a contained error; no successful system fallback is reported. Public content exports and worker jobs reject canonical layouts while the shared flag is false. Test fixtures explicitly enable only the isolated preview/generator.

The browser 1.1.0 package contains the exact 15 approved worker static TTFs and 20 OFL/NOTICE files (3,066,631 bytes). Original production binaries are unchanged. Full TTF rather than independently sourced WOFF2 subsets removes the nine Ω asset discrepancies without downloading/installing anything. WOFF2 compression can be added later from the same outlines; other browser engines are not certified. Original upstream revision, original checksum, derivative checksum, notices, full cmap ranges and Windows metrics are in parity-font-lock.json. Editorial metadata remains explicitly proposed where original metadata was not supplied.

ASS em conversion uses verified Windows ascent/descent divided by unitsPerEm. Automatic ASS wrapping and synthetic bold/italic are disabled. Explicit kerning and the tracking rule match the Canvas engine. Every canonical font selection is checked by fontconfig/libass and FFmpeg stderr.

## Results and compatibility

[Golden results](./T3-GOLDEN-RESULTS.md), [visual comparison](./T3-GOLDEN-RESULTS.html), [coverage matrix](./T3-FONT-COVERAGE.csv), [evidence hashes](./T3-EVIDENCE-MANIFEST.json), [changed files](./T3-CHANGED-FILES.json), [exact test commands/exits](./T3-test-results.json).

The 105 pairs are actual browser and worker rasters, not unit-test substitutes. The final source is checked against rendered ASS. Historical nominal-size mismatch and failed intermediate trials remain in separate evidence files. Engineering acceptance is ≤2px per ink-box edge and ≤2% unmatched foreground within a 2px neighbourhood; pixel equality is not claimed.

All seven saved legacy IDs and the default retain byte-identical ASS across 64 tested combinations; seven real legacy exports are pixel-identical to committed master in the recorded runtime. Existing Impact→Anton, Arial→Inter and Arial Black→Montserrat mappings and original font assets remain unchanged. Canonical metadata survives JSON/local storage round trips and is preserved while disabled. The real preview component survives an actual font HTTP 404 and reports failure. Full authenticated project reopening against a live backend/database is not claimed.

Ω is present in twelve identical browser/renderer faces. Poppins 700/900 and Caveat genuinely lack it and reject it. Full cmap ranges are not language/shaping certification. Chromium 155 / recorded Linux FFmpeg are tested; bidi, emoji, Arabic/Urdu/Indic shaping, other browser engines, blur shadows, mobile/device rasterizers and full production workflow remain outside this certification.

## Tests / builds

| Check | Result | Exit |
|---|---|---:|
| Frontend registry/assets/loader/layout/comparator combined | 39/39 pass | 0 |
| Final PNG comparator tests | 3/3 pass | 0 |
| Worker typography combined six suites | 36/36 pass | 0 |
| Frozen legacy baseline regression | 8/8 pass; 64 ASS combinations unchanged | 0 |
| Shared layout and Ad contract suites | 38/38 pass | 0 |
| contracts:build --skip-nx-cache | pass | 0 |
| media-worker:build --skip-nx-cache and dependencies | pass | 0 |
| Worker TypeScript emit and content-service typecheck | pass after rebuilding current contracts | 0 |
| Scoped frontend TypeScript and ESLint | pass | 0 |
| Vite integrated lazy-loading production build | pass; 4124 modules; ClipEditor approximately 237 KB | 0 |
| Latest final-source Vite build | Output artifacts exist; terminal exit record unavailable after session expiry; not counted as an independently confirmed pass | browser result |
| Whole frontend TypeScript | Existing unrelated media prop/React namespace errors; no typography path errors | 1 |
| Actual FFmpeg/libass golden rendering | 105 frames rendered | 0 |
| Offline real-PNG golden comparison | 105/105 pass; maximum edge difference 2px; maximum unmatched foreground 0.071521% | 0 |
| Current generator versus rendered ASS | 105/105 byte-identical | 0 |
| Actual legacy FFmpeg frames | 7/7 pixel-identical | 0 |
| Real browser cold loading | Pass; captured PNG hash equals warm reference | browser result |
| Real browser HTTP 404 handling | Pass; contained failure; no successful fallback | browser result |
| Real browser default OFF | Pass; zero font requests and no canvas | browser result |
| Offline asset packaging | 15 faces; 35 files; 3066631 bytes | 0 |
| Scoped git diff --check | pass | 0 |
| Reconciliation: committed-vite | pass (exported source snapshot) | 0 |
| Reconciliation: committed-server | pass (exported source snapshot) | 0 |
| Reconciliation: candidate-vite | pass (exported source snapshot) | 0 |
| Reconciliation: candidate-server | pass (exported source snapshot) | 0 |
| Reconciliation: component/transitive TypeScript | pass with repository library set | 0 |
| Reconciliation: typography combined regression | 35/35 pass | 0 |
| Integrated: vite | exported scoped source candidate | 0 |
| Integrated: server | exported scoped source candidate | 0 |
| Integrated: clean source TypeScript emit: media-worker, content-service and imported packages | exported scoped source candidate | 0 |
| Integrated: editor and Sound Design callbacks | 6/6 pass | 0 |
| Integrated: typography regression | 35/35 pass | 0 |
| Integrated: worker typography/audio/ducking | 43/43 pass | 0 |
| Integrated: fresh Docker worker frames against retained browser references | 105/105 pass; fresh integrated browser capture blocked | 0 |
| Final validation: fresh shared-overlay browser/worker comparison | 105/105; actual new browser captures | 0 |
| Final validation: frontend/editor/Sound Design/typography | 41/41 | 0 |
| Final validation: worker/audio/ducking | 43/43 | 0 |
| Final validation: frontend vite | exported scoped candidate | 0 |
| Final validation: frontend server | exported scoped candidate | 0 |
| Final validation: backend clean source TypeScript emit: media-worker, content-service and imported packages | exported scoped candidate | 0 |

## Parallel ownership and safety

Both repositories remain on master. Cursor advanced UX-1/UX-2 contracts while T3 ran. The user approved restoring exactly one export in libs/contracts/src/index.ts; every Ad Studio scene-graph/template/typography-adapter export and its order is preserved. Contracts build and relevant contract tests validate the reconciliation. No Ad Studio component or 4C-B animated renderer was edited.

Mixed-owner staging surfaces: libs/contracts/src/lib/internal/index.ts (T3 import/property versus Ad callback routes), apps/media-worker/src/queue/dto/render-clip-queue.dto.ts (T3 property versus Ad DTO classes), plus pre-existing T2 renderer/Docker changes. Never stage these wholesale without reviewing owner hunks. Clip typography modules/assets, ClipEditor edits and new canonical helper files are the typography scope. Root dependencies/lockfiles, deployment configuration and production flags were not changed.

The shared flag CANONICAL_TYPOGRAPHY_ENABLED is hard OFF. Animated Ad Studio was explicitly disabled in frontend builds. Template/animation activation settings were not enabled by this work. No migrations, paid calls, production jobs, branches, worktrees, resets, stashes, commits, pushes or deployments were performed by T3.

## Remaining release work

- Actual existing-project save/reopen needs a non-production API, authenticated session and project. No production write was attempted.
- Cursor current release completion and resulting master reconciliation are not confirmed. Explicit release approval is still required.
- Other engines, complex scripts and aspect ratios remain uncertified.

Recommendation: keep production fonts OFF. Coordinate the exact mixed-owner commit hunks with Cursor, complete any remaining integrated checks, then commit/push the approved T2/T3 scope and verify CI/CD/deployed revisions. Local visual results alone do not authorize production activation.

## Reproduce

Use packageParityFonts.mjs for offline same-outline packaging. Start T3-golden-server.mjs on loopback 4319 and run the actual component fixtures in the browser. Run tools/typography/t3-golden.cjs in the existing local worker image with network disabled, canonical assets and bundled current generator read-only, and evidence writable. T3-compare.mjs compares saved real PNGs; T3-finalize.mjs regenerates the deliverables. Browser/reference captures require actual browser execution; never replace them with mocked rendering.
