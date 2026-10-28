# M2B project integration checkpoint

The existing project load/save/generation controller is shared between legacy and gated M2B presentations. Existing Project Creative persistence, SceneStage, template engine, asset authorization and production Canvas remain the integration points. No second editor or persistence engine was introduced.

## Connected presentation

Thirteen project views: workspace, campaign manager, Working Brief, templates, template detail, assets, concepts, comparison, concept detail, creative preview, composition inspection, export and preflight. The exact forty approved screen identifiers are registered, but unimplemented routes show explicit unavailable states rather than simulated production results.

`VITE_AD_STUDIO_M2B_PRODUCTION_ENABLED` defaults off. The legacy view remains available. Navigation retains the owned project and selected concept/creative/template identifiers. Unsaved changes remain guarded. Explicit Campaign Idea edits use the existing persistence endpoint with an opt-in save option; legacy callers preserve the previous behavior.

## Verification

Consolidated frontend regression: 100 tests passed, including existing project behavior, explicit Campaign Idea persistence, route contracts, Brand Kit models, analysis proposals, templates and prototype interactions. Scoped lint passed. TypeScript: 42 existing baseline diagnostics, zero new diagnostics. No browser acceptance is claimed for the gated view. Production responsive screenshots and visual comparison remain pending.

## Remaining work

The complete forty-screen experience is not finished. Brand manager/category integration, reviewed live AI creation and variation execution, campaign Director intelligence, performance attribution and multi-scene animation still require functional implementation and verification. The approved prototype is preserved as the visual baseline. Native catalog previews are not generated advertisements; strategy text is not rendered artwork.

Next: controlled existing runtime verification, then connect the next campaign creation slice to shared quoted execution and existing provider/Canvas paths. Paid execution requires specific authorization. No service or feature flag was changed by this checkpoint.

## Placement and variation increment — 2026-10-27

Four additional screen identifiers (formats/adaptation and variations/variation-lab) now connect to real existing workflows. This is partial coverage, not four newly complete AI products. The approved split layout, presentation classes and scene renderer are reused. Native VariationsPanel calls the existing deterministic child-creative API; meaningful generative variation execution remains separate work.

Placement review uses existing proportional adaptation, owner/project validation, explicit review and the existing createCreative endpoint to save a separate draft. Original records and asset identifiers are preserved. Private storage keys are stripped before client submission. Failed or unexpected responses cannot produce verified-save success. Current proportional adaptation may distort product proportions across aspect ratios; this is explicitly disclosed and blocks any claim of professional adaptation quality until visually corrected/reviewed. Existing export warnings remain visible and export is handled by the existing Canvas/Export controls.

Verification: 39 project/route/placement tests passed (including six new placement cases); scoped lint passed; TypeScript remains exactly 42 baseline diagnostics with zero added. New gated views have not been activated or browser accepted. No real user record was created by these tests.

Golden Ad blockers remain: verified running build, owned approved source/mask and clean logo roles, typography/reference approvals, paid-execution quote/consent, real generated visual quality, saved editable Canvas, preview/export parity and owner review. Existing source-preserving ZOE Mask V3 remains rejected. Healthy existing services do not prove the fresh build is active.
