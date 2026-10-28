# Coordinated production integration

Approved owner M2B UX is frozen. 40 screens /120 responsive screenshot references preserved before production code changes. Default/reference states were captured by route; progress is transient and template detail without selection is an empty state. Prior M2B end-to-end screenshots supplement those references. Source/assets/docs are preserved under .tmp/production-integration-20261026/approved-m2b. No prototype edits permitted.

## Reuse and dependencies

Brand Kit: BrandService/BrandRepository, owner_user_id authorization, existing JSONB voice, colors/type/assets and brand_versions; extend DTOs compatibly. Existing CRUD/editor/import/export remain. Guided UI uses approved seven-step layout inside authenticated application shell.

Taxonomy: existing creatorNiches plus exact source-traceable coach seed snapshot; no replacement category IDs.

Templates/Canvas: existing templateCatalog, composeTemplateScene, AdSceneGraph1.0, SceneStage, AdStudioEditor/Inspector/LayerList. Persist recipes and snapshots, never flattened imagery as editable layers.

AI: existing model router/provider registry, AdCreativeDirectorService, Image Studio generation/editing and billing infrastructure. Real calls require explicit action and budget/capability validation. Heuristic/mock fallback must remain labeled and cannot count as real output.

Projects: existing AdProject/ProjectCreative model and campaignIdea/Working Brief. Create Project → Create Ad remains the entry relationship.

Rendering: Content render jobs and media-worker; existing static renderer and AdMotionSceneGraph2.0. Current generic video-provider interface accepts ONE sourceUrl, not multiple references. Storyboard must orchestrate scene-level jobs then assembly; provider support cannot be inferred.

Sound: existing Sound Design/P0.2 services/audio EDL retained; no duplicate audio engine.

Publishing/analytics: existing content publishing and analytics services require authenticated project/creative attribution; prototype metrics/schedules must never enter live UI.

## Dependency sequence and acceptance

1 Guided Brand Kit persistence/versioning → 2 permissioned character profiles → 3 approved UX routes → 4 editable brand recipes → 5 model-routed Director proposals → 6 image/concept/variation jobs → 7 existing Project/Canvas snapshots → 8 export/recommendations → 9 storyboard scene orchestration/assembly. Verify each slice before enabling the next.

Feature flags keep unfinished integrations off. No service restarts, paid calls, migrations or live-record mutations are part of source verification. Runtime acceptance must use approved local configuration and authorized data.

Current work: first Brand Kit slice. Other reports/acceptance entries remain pending until implemented and exercised; this architecture document is not production completion evidence.

## Current source checkpoint — 2026-10-27

Guided identity, scoped character profiles and native editable Brand Templates are source-integrated behind default-off frontend/backend gates. Existing binder/engine, SceneStage, asset resolver, TemplateGallery and project/Canvas creation are reused. The prototype is unchanged. See backend `D:/NxClip-W8-Integration/docs/ad-studio/production/BRAND-KIT-INTEGRATION.md`, `TEMPLATE-GENERATION-IMPLEMENTATION.md`, `AI-PROVIDER-CAPABILITY-MATRIX.md`, `VERIFICATION-EVIDENCE.md` and `REMAINING-GAPS-AND-ACCEPTANCE.md`.

No real AI generation, schema application, runtime persistence or production browser UX acceptance is claimed. Existing Gemini image references and Vertex/Veo video integration must be reused. The inspected generic I2V adapter currently sends a single source image; this is an adapter-level limitation, not a statement about all vendor capabilities. Multi-image storyboard orchestration remains pending.
