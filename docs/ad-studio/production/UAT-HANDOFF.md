# Ad Studio UAT handoff — BLOCKED, not ready

Date: 2026-10-28. The owner approved bounded local activation; authorization remains valid. Activation stopped at the mandatory read-only process-ownership gate. This is a blocker handoff, not final product delivery or an invitation to initiate generation.

## Exact blocker

`content (port 5102): Executable/command metadata unavailable; no process stopped. Run the launcher from the owning Windows session with process visibility.`

The guard ran in the Codex execution context. It did not establish a mismatch or prove an administrator-elevation requirement. Do not weaken it, manually delete tracking records, terminate a PID, or repeatedly retry from this context. Use the existing owner PowerShell session with proven CIM visibility.

## Current runtime and prepared build

| Component | Observation | Activation status |
|---|---|---|
| Frontend localhost:3000 | HTTP 200; observed PID 25980 | Existing process unchanged; new provider frontend gates not applied |
| Gateway 5100 | HTTP 200; observed PID 29556 | Unchanged |
| Identity 5101 | Observed PID 15440 | Unchanged; no identity implementation/configuration changes |
| Content 5102 | HTTP 200; observed PID 29384 | Existing process unchanged; live provenance gate BLOCKED |
| Heuristic AI 5104 | HTTP 200; observed PID 7792 | Unchanged; deliberately not the real provider target |
| Existing AI 5004 | HTTP 200; observed PID 21884; entry D:/NxClip/dist/apps/ai-service/src/main.js | Protected older-tree runtime unchanged |
| W8 provider AI 5114 | Prepared only | NOT STARTED |
| Media Worker 5007 | Protected | Not restarted or newly version-verified |

Last recorded managed running release: `2026-10-27T17-57-31-660Z-1f1359`; health does not prove latest source activation.

New provider-UAT release: `2026-10-28T12-28-18-369Z-e1c52d` under backend `.tmp/ad-studio-local/releases/`. All four shared libraries, AI and Content built with existing Nx targets into isolated release outputs. Compiled configuration/JWT/worker probes passed. RS256, issuer nxclip-identity, audience nxclip-api and public-key fingerprint match the established local configuration. PostgreSQL localhost:5433/nxclip_dev was checked READ ONLY; the approved Brand Templates table exists. No migrations, synchronization or schema changes.

## Storage gate

Existing ADC passed a live read-only bucket IAM permission test: storage.objects.create=true and storage.objects.get=true on nxclip-media-prod. Objects listed/read/written/deleted: zero. No Google model request. This proves bucket-scope permissions, not a successful future upload or model prediction.

Generated backgrounds and UAT exports now use `ad-studio/<owner UUID>/uat/<creative UUID>/<SHA256>.<extension>`. GCS writes require `ifGenerationMatch:0`, private/no-store caching and matching content hashes. Existing collisions are never overwritten; recovery accepts only matching existing metadata. Missing create-only capability blocks provider work. Old source photographs and other existing objects remain untouched. SDK storage behavior is mocked-tested; no upload canary was used.

## Approved activation commands — owner Windows session

The existing launcher now supports the explicit ProviderUat profile. Its default Legacy profile still manages only Content5102/heuristic5104. Do not use legacy Restart-all to activate this build. The Preflight action is read-only; it must pass before either runtime action.

~~~powershell
$launcher = 'D:\NxClip-W8-Integration\tools\ad-studio-local.ps1'
& $launcher -Action Preflight -Profile ProviderUat -Service all -AcceptSafetyFallback
if ($LASTEXITCODE -ne 0) { throw 'UAT preflight failed; stop and return the exact error.' }

& $launcher -Action Restart -Profile ProviderUat -Service providerAi -OwnerApproved
if ($LASTEXITCODE -ne 0) { throw 'Provider AI startup failed; stop and return the exact error.' }

& $launcher -Action Restart -Profile ProviderUat -Service content -OwnerApproved -AcceptSafetyFallback
if ($LASTEXITCODE -ne 0) { throw 'Content activation failed; stop and return the exact error.' }

& $launcher -Action Status
~~~

These runtime operations are covered by the owner's bounded activation approval. No renewed authorization is needed for the same scope, but a safety failure must stop it. The provider starts first; Content is replaced only through its existing identity/receipt/timestamp/release checks. AI5004/5104, Gateway, Identity, Media Worker and frontend processes are protected. No paid generation command is included.

Prospective Content gates: AD_STUDIO_REAL_CONCEPTS_ENABLED=true, AD_STUDIO_REAL_IMAGES_ENABLED=true, AD_STUDIO_TEMPLATES_V1_ENABLED=true, AD_STUDIO_BRAND_TEMPLATES_ENABLED=true, AI_AD_STUDIO_EXECUTION_URL=http://127.0.0.1:5114. Ordinary AI_SERVICE_URL remains5004; legacy concepts remain5104. The Vertex-only provider profile uses existing ADC/project configuration, automatic concept mode, routing enabled, fallbacks disabled and queue workers off. Brand Analysis's separate backend gate remains off. No private .env file was changed.

Matching frontend flags are still PENDING runtime verification: VITE_AD_STUDIO_REAL_CONCEPTS_ENABLED, VITE_AD_STUDIO_REAL_IMAGES_ENABLED, VITE_AD_STUDIO_TEMPLATES_V1, VITE_AD_STUDIO_BRAND_TEMPLATES_ENABLED. Existing M2B production/guided-brand presentation flags remain as previously approved. No frontend process restart or local config edit occurred in this activation attempt.

## URLs

- Existing real Ad Studio: http://localhost:3000/create/ad
- Existing project workspace: http://localhost:3000/create/ad/projects/01a17248-86aa-77c4-8f23-f7435d75ee3b?view=workspace (requires its authorized account)
- Guided Brand Kit: http://localhost:3000/brands/01a14a35-4fb4-7288-8ae9-bd7c91e683f5/guided?step=brand (requires ownership)
- Approved prototype: http://localhost:3000/create/ad/ux-preview — isolated demonstration, not the production generation path

The frontend was reachable; authenticated app functionality and new provider routing have NOT been browser-verified in this attempt.

## Google readiness

Gemini image generation through Vertex is configured in the prepared profile using gemini-2.5-flash-image. Veo is configured there as veo-3.1-fast-generate-001. Neither service is running on5114 yet. Model availability, prediction permission, actual output and quality remain unverified until owner UAT; no live image/video generation occurred. Direct Gemini API credentials were not found in the inspected environment files; this plan uses the already authorized Vertex/ADC path instead. Do not claim direct Gemini API readiness or live Veo acceptance.

## Complete forty-screen register

State below is implementation evidence, not owner acceptance. All 34 approved prototype source/assets remain unchanged. The canonical detailed register is frontend docs/ad-studio/production/UX-PARITY-MATRIX.json. Zero screens have full production acceptance.

| Screen | State | Intended production route |
|---|---|---|
| home | not-integrated — Not yet production-integrated | /create/ad |
| brief | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId?view=brief |
| templates | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad?view=templates |
| template | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad?templateId=:templateId |
| assets | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId?view=assets |
| progress | partial — Partial: actual concept/image request progress and retained status; no simulated production percentage; live execution unverified. | /create/ad/projects/:projectId?view=jobs |
| concepts | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId?view=concepts |
| detail | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId?conceptId=:conceptId |
| compare | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId?view=compare |
| preview | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/:creativeId?view=preview |
| edit | partial — Existing production Canvas reused with private generated-asset loading; new background save/reopen tested with mocks; generated runtime/export not verified. | /create/ad/:creativeId |
| variations | partial — Partial source integration: existing deterministic workflow connected; AI and visual acceptance pending | /create/ad/:creativeId?view=variations |
| workspace | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId |
| formats | partial — Partial source integration: existing deterministic workflow connected; AI and visual acceptance pending | /create/ad/:creativeId?view=formats |
| export | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/:creativeId?view=export |
| performance | not-integrated — Not yet production-integrated | /create/ad/projects/:projectId?view=intelligence |
| director | partial — Partial source: existing Gemini/Vertex concept execution supports beta UAT without price metadata; campaign-level review/improvement/comparison remains incomplete. | /create/ad/projects/:projectId?view=director |
| brand-intelligence | not-integrated — Not yet production-integrated | /brands/:brandId/guided?step=identity |
| product-lab | not-integrated — Not yet production-integrated | /create/ad/projects/:projectId?view=products |
| visual-lab | partial — Partial source: owned original-photo hash/geometry binding, protected product/logo/copy zones and shared provider background execution; beta uses source/model preflight without mandatory pricing. No live generation or visual acceptance. | /create/ad/projects/:projectId?view=visuals |
| composition | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/:creativeId?view=composition |
| advanced-canvas | partial — Existing Canvas reused; approved advanced tool parity incomplete; no duplicate editor. | /create/ad/:creativeId |
| variation-lab | partial — Partial: provider-backed owned-background variations wired to the shared image engine; full product/marketing variation planning remains incomplete. | /create/ad/:creativeId?view=variations |
| adaptation | partial — Partial source integration: existing deterministic workflow connected; AI and visual acceptance pending | /create/ad/:creativeId?view=formats |
| campaign-manager | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId |
| motion-studio | not-integrated — Not yet production-integrated | /create/ad/animated/:animatedId |
| delivery | not-integrated — Not yet production-integrated | /create/ad/:creativeId?view=delivery |
| dna-quality | not-integrated — Not yet production-integrated | /create/ad/:creativeId?view=quality |
| preflight | partial — Source-connected to existing project controller; source integration; local M2B frontend gate enabled, end-to-end and visual acceptance pending | /create/ad/projects/:projectId?view=preflight |
| brand-info | partial — Gated source integration; runtime persistence and responsive UX acceptance pending | /brands/new/guided?step=brand |
| brand-category | partial — Gated source integration; runtime persistence and responsive UX acceptance pending | /brands/new/guided?step=category |
| brand-goals | partial — Gated source integration; runtime persistence and responsive UX acceptance pending | /brands/new/guided?step=goals |
| brand-assets | partial — Gated source integration; runtime persistence and responsive UX acceptance pending | /brands/:brandId/guided?step=assets |
| brand-analysis | partial — Partial source: text-only analysis supports beta source/model preflight and owner review without pricing prerequisite; no live provider or image/website acceptance. | /brands/:brandId/guided?step=identity |
| brand-guidelines | partial — Gated source integration; runtime persistence and responsive UX acceptance pending | /brands/:brandId/guided?step=guidelines |
| brand-overview | partial — Gated source integration; runtime persistence and responsive UX acceptance pending | /brands/:brandId/guided?step=ready |
| brand-templates | partial — Partial: native deterministic lifecycle implemented; approved local table present; HTTP gate off and visual/runtime acceptance pending. | /brands/:brandId/templates |
| brand-template-detail | partial — Partial: native lifecycle/customization/reuse implemented; provider-generated template art and runtime UI acceptance pending. | /brands/:brandId/templates/:templateId |
| category-studio | not-integrated — Not yet production-integrated | /create/ad?view=categories |
| brand-manager | not-integrated — Not yet production-integrated | /brands |

## Golden Ad acceptance workflow — not yet a verified working walkthrough

After runtime/routing and the critical workflow gaps below are closed: authenticate as the account owning the ZOE Brand Kit; review its original product and clean logo approvals without mixing accounts; create/select a brand project; save the creative brief; obtain real Director concepts; select a direction and create a product-bound editable creative; initiate real image generation yourself; review original product fidelity and brand consistency; request variations/refinement; open the existing Canvas; edit/save/reopen; export PNG/JPEG and compare against preview. Verify video/storyboard/export separately when implemented. No developer should perform these paid steps on the owner's behalf.

## Remaining delivery blockers

- Resolve current Content process visibility in the owner session and finish guarded activation; then verify release receipts/hashes, health, normal authentication, ownership and actual Ad Studio-only routing with non-generation requests. Enable only approved matching frontend gates after that proof.
- Single-action brief-to-finished-ad orchestration is still incomplete. Existing concepts -> native creative -> protected-photo/background generation are separate source-connected steps. Activation alone does not finish that user journey.
- Current AI image refinement/variation changes backgrounds while preserving the original product photograph. Complete-ad copy/layout planning, campaign Director review/improvement/comparison and complete forty-screen production UX remain incomplete.
- Original product association, clean logo roles, typography and reference approvals need confirmation through the authorized ZOE account. Original-photo treatment is not accepted segmentation; Mask V3 remains rejected. No visual quality PASS.
- Multi-scene Veo motion-studio wiring and video export parity are unfinished. Configuring a Veo provider is not a completed cinematic-ad workflow.
- Browser/visual, Canvas persistence, PNG/JPEG parity and the first owner-triggered Google generation are outstanding. Existing frontend TypeScript baseline has42 diagnostics; no new diagnostics were introduced in the preceding source slice.

## Reproduction and evidence

Backend complete source: 21e19a44e50dc0670ad7b564c50f05c711b0637a. Frontend complete source: ff8b146db072eb0600b1c5228b7d4fdffe2d9114. Both branches: codex/w8-feature-completeness-rc1. Documentation-only commits may follow these source checkpoints; use the final branch tip for the handoff. Source commits are not a claim that the active runtime uses them.

This activation preparation passed 18 guarded-launcher tests, seven scoped/default routing cases, 23 GCS/image-lifecycle cases and eight export/security cases (all mocked except the explicitly read-only IAM check). Fresh provider-profile Nx builds and compiled startup probes passed. No paid transport, upload, schema modification or shared-service restart. Private releases, runtime state, receipts, environment files and original assets stay out of Git. Unknown exit/.bak files remain excluded and undisturbed.

Rollback is not automatic. After separate rollback approval, restore Content's verified prior release with the existing Rollback action; the new provider has no previous release, so its Stop action is limited to a verified providerAi process and requires OwnerApproved. Never stop a PID manually or alter receipt/registry files to bypass a guard.
