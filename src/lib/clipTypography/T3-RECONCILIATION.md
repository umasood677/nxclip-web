# T3 frontend dependency reconciliation

Audited local master: `f50141ef79c21d15e737410230a4a2a407204b6c`. Corrective commit `0d0e33f` is preserved, together with the later `b0d9a8b` dangling-setter correction. **T3 release is not ready: editor integration remains removed.**

## Findings

`CanonicalCaptionPreview.tsx` exists as a named export, but is untracked. Every local typography dependency and packaged font asset below is also absent from the committed tree. The deployment failure came from committing the consumer without its dependency package. Restoring only its import would repeat the problem.

Runtime dependency closure (bundler-verified), plus its type-only source:

- `src/lib/clipTypography/FontLoaderService.ts` — not committed
- `src/lib/clipTypography/canonicalLayout.ts` — not committed
- `src/lib/clipTypography/font-source-lock.json` — not committed
- `src/lib/clipTypography/layoutContract.ts` — not committed
- `src/lib/clipTypography/packageTypes.ts` — not committed
- `src/lib/clipTypography/parity-font-lock.json` — not committed
- `src/lib/clipTypography/proposedMetadata.ts` — not committed
- `src/lib/clipTypography/registry.ts` — not committed
- `src/pages/ClipEditor/CanonicalCaptionPreview.tsx` — not committed

156 packaged asset/license files are required alongside the source closure. Exact relative paths and SHA-256 values are in [T3-RECONCILIATION.json](./T3-RECONCILIATION.json). Include both the existing registry package and same-outline parity package; do not replace production font files.

## Independent source snapshots

The audit exports the pinned committed tree with `git archive`; it does not create a branch/worktree, checkout, stage or install dependencies. Builds reuse installed root node_modules through normal ancestor resolution. No uncommitted source, local .env, or generated dist is copied into the committed snapshot. A second exported snapshot adds only the enumerated typography package and an isolated additional browser entry; ClipEditor stays at committed HEAD. This verifies dependency completeness, not restored editor behaviour.

| Check | Exit |
|---|---:|
| committed-vite | 0 |
| committed-server | 0 |
| candidate-vite | 0 |
| candidate-server | 0 |

Additional checks: component/transitive TypeScript compilation exit 0 with the repository DOM.Iterable library; 35/35 registry, asset, loader, layout and raster-comparator tests pass, exit 0. The earlier ad hoc compile omitted DOM.Iterable and reported FontFaceSet declarations; using the actual repository library set resolves those errors without a source change. The initial snapshot helper attempted a disallowed junction; its corrected implementation uses normal parent dependency resolution and creates no junctions.

Original T3 golden fixtures remain 105/105 passing against real browser/FFmpeg rasters, and seven legacy exports were pixel-identical. Those results certify the isolated component and recorded worker runtime, not a restored latest editor or authenticated reopening.

## Required coordinated reconciliation

1. Include the component, all nine source/type/manifest files in the dependency closure, complete T2 prerequisite tests/tools and licensed font assets in the same reviewed release scope. Include the matching backend layout/validation work; avoid any dangling import-only commit.
2. Recreate the editor integration against current master: state declaration/reset, validation, server metadata hydration, local autosave, blueprint persistence and both preview surfaces. Do not replay the old ClipEditor patch.
3. Keep the entire canonical branch behind the hard OFF flag. While OFF, leave legacy text overlays and Sound Design playback/mix behaviour intact; do not hide legacy overlays merely because canonical metadata exists. Preserve stored canonical data without activating it.
4. Review the new editor hunks with Cursor, then run integrated editor/Sound Design regressions, actual reopen testing and production builds from an exported exact proposed commit tree. The candidate dependency build here is not that integration approval.
5. Only after scope coordination and integrated verification may a complete scoped commit/push proceed. Verify CI/CD and deployed revisions separately. Production font activation remains separately gated.

## Preservation and patch safety

No import or editor integration was restored. Neither ClipEditor nor RenderLayerProgress nor Sound Design source was edited by this reconciliation. Existing master and unrelated dirty work remain in place. No staging, commits, pushes, deployments, migrations, downloads or dependency installs were performed.

The old generated frontend patch had captured current Sound Design edits because its generator exported the whole dirty editor diff. It has been cleared, and the generator now refuses to package a restored editor integration without fresh owner-hunk review. The backend patch is historical and also needs current ownership review. Do not apply either old patch as a release plan.

The shared canonical activation constant remains false. Build processes explicitly set Animated Ad Studio and template flags false.

Reproduce: `node src/lib/clipTypography/T3-reconcile.mjs`. Build logs are retained in `T3-reconciliation-evidence/` and hashed in the evidence manifest. The helper's own temporary exported source copies were removed after validation; unrelated temporary files were preserved.
