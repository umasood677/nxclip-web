# T3 integrated compatibility — local implementation

**Release HOLD. No commits, pushes, deployments or activation. Cursor owns media-worker deployment readiness.**

## Integration

Recreated ClipEditor integration against current master without replaying the old editor diff. The new shared ClipTypographyOverlay wraps the verified CanonicalCaptionPreview at both preview stages. The pure editorTypography helper applies the hard OFF flag before interpreting saved metadata. OFF projects keep legacy overlays, legacy font IDs and normal Sound Design behaviour. Canonical metadata is retained during server hydration, local drafts and blueprint saves; legacy projects omit the additional property. Invalid enabled metadata shows an explicit error rather than silent font substitution. Locked/final-render stages suppress canonical preview.

The original component and nine-file dependency closure remain intact. Two new runtime files (helper and overlay) make eleven dependency files, plus the scoped editor change. All original 165 reconciliation entries—including 156 browser font/license assets—match their recorded checksums. Existing asset/registry tests validate font identity, required weights/styles, notices, licenses and corruption cases. No binaries were downloaded or replaced.

## Builds / regressions

| Check | Result / exit |
|---|---|
| Exact frontend candidate vite at 8fde9722 | 0 |
| Exact frontend candidate server at 8fde9722 | 0 |
| clean source TypeScript emit: media-worker, content-service and imported packages at 846180d5 | 0 |
| Integrated editor/Sound Design tests | 6/6; exit 0 |
| Registry/assets/loader/layout/raster tests | 35/35; exit 0 |
| Worker typography, legacy, audio mixing and ducking | 43/43 across 8 suites; exit 0 |
| Overlay/helper/integration-test TypeScript | exit 0 |
| Scoped diff whitespace check | exit 0 |

Frontend build inputs were exported committed files plus only the hash-enumerated typography dependencies/assets and isolated editor patch. No live untracked-source lookup was used. The package manager dependencies are the existing installed dependencies; this is not a fresh dependency install certification. Candidate builds exclude unrelated dirty Sound Design work while preserving committed fixes. Actual dirty-workspace audio callbacks were separately executed by the compatibility tests and their four AST hashes match the pre-integration snapshot. RenderLayerProgress and Ad Studio source were not edited.

The clean backend candidate similarly exports committed files plus only typography source/assets and filtered shared hunks. Direct TypeScript emission checks both applications and imported package source, without relying on prebuilt contract declarations. Initial Nx execution failed because an exported pnpm tree lacks node_modules/.modules.yaml; network bootstrap was disabled, nothing installed. Initial Jest execution failed writing its sandbox temporary cache and included one mistyped suite path; retry used a workspace cache and correct paths, passing all 43 tests.

## Browser / worker evidence

Fresh local Docker FFmpeg/libass output: 105/105 frames rendered with exact canonical font selection and no missing-glyph fallback. Comparison against the retained real Chromium references: 105/105 pass, exit 0. Maximum edge deviation 2px; maximum unmatched foreground 0.071521%. Engineering limits remain 2px / 2%.

These are retained browser references captured through CanonicalCaptionPreview before this reintegration, not fresh captures of the new shared overlay. The fixture now uses the actual shared editor overlay, but fresh browser execution is blocked: the in-app browser reports a tab attachment timeout and no accessible tabs. No new integrated browser capture is claimed. Existing warm/cold/HTTP404/OFF captures remain historical evidence; current OFF/lock/final/invalid gates are covered by the new component tests.

Wrapping, line metrics, spacing, position, outline/shadow and exact face selection retain the earlier deterministic v1 implementation. The twelve supported Ω faces match; Poppins 700/900 and Caveat 700 lack Ω and reject the request. No silent canonical substitution is allowed. Legacy fallback mappings and original production files remain unchanged. Unicode coverage does not certify language shaping. Other browsers, complex scripts, bidi/emoji, blurred shadows and other aspect ratios remain uncertified.

[Golden comparison](./T3-GOLDEN-RESULTS.md) · [Visual pairs](./T3-GOLDEN-RESULTS.html) · [Coverage](./T3-FONT-COVERAGE.csv) · [Complete proposed dependency/commit inventory](./T3-INTEGRATION-MANIFEST.json)

## Ownership and release gate

Verified candidate bases: frontend 8fde97222738360b55ba2d17e107f3914ab2c7ba; backend 846180d5e760148a702e007e277f358e61ebe1de. Current heads when writing report: frontend 8fde97222738360b55ba2d17e107f3914ab2c7ba; backend 846180d5e760148a702e007e277f358e61ebe1de. If Cursor advances either base, recheck relevant diffs before release.

The proposed scoped commit includes the existing T2/T3 foundation, the eleven frontend runtime dependencies, all 156 browser assets/notices, canonical worker assets and the enumerated typography source/tests. Apply only the isolated typography editor patch. Backend internal/index.ts and queue DTO need partial hunks; exclude Ad routes/classes. Do not stage the full dirty ClipEditor or shared files. Dockerfile/font packaging must be coordinated with Cursor’s deployment work. The old release patches are superseded by the integration patches and this manifest.

Remaining gates: fresh integrated browser capture; authenticated full saved-project reopen and live audio playback checks; Cursor confirmation of mixed-owner release hunks and deployment scope; explicit user release approval. The clean candidate builds and callback tests do not replace those checks. No CI/CD or deployed revision claim is made.

Recommendation: keep canonical typography and all production activation OFF. STOP before staging/committing/pushing. Request approval for the coordinated scoped release only after remaining integration gates are resolved.
