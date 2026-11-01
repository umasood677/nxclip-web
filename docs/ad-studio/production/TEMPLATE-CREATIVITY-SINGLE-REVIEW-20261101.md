# Template creativity and single review — 2026-11-01

## Delivered flow
Brand Kit → Templates → Describe / format / starting layout → readiness and explicit Google approval → Generate preview → ONE review page → optional Canvas → return to review → Approve / Reject / Save / Duplicate. Campaign/ad creation remains a separate explicit action after template approval/save.

Generated previews create suggested, unsaved review records. They are never automatically approved or saved for reuse. Product confirmation moved to Approve on the canonical review page. Editing clears prior confirmation and approval. Ownership, version and source-asset safeguards remain. A newly created review record is fetched when absent from the library cache. Canvas return opens review without generation.

## Creativity
The prior wrapper forced cinematic photography, lower-middle placement and quiet top/bottom regions for every direction. The new wrapper prioritizes the current brief for medium, setting, placement and lighting. Product-reference surroundings/pedestal are explicitly not the required composition. Content puts current instructions first, followed by bounded earlier concept/guideline context. Identity and no-invented-shade constraints remain. Provider prompt version: ad-template-direction-v2.

Mock tests prove instruction forwarding and policy differences, not model obedience or professional creative quality. One approved product reference is the supported proposal scope; no new model usage or invented verified inventory is enabled. Existing generated assets are unchanged.

## Concise UX and existing Canvas
Duplicate authoring headers/navigation and the intermediate review-confirmation form are removed. Technical request details are collapsed; paid consent remains explicit. Retained-request recovery controls appear only outside active execution. The review page opens Canvas directly.

Template drafts use a prototype-aligned advanced shell: Layers / stage / properties, a clear heading, gold accents and compact panels. Original AdStudioEditor, AdCanvas, LayerList, transforms, typography, undo/redo, versioning, save and export remain. Empty campaign-intelligence docks and campaign variations are hidden for drafts. Ordinary campaign Canvas presentation is preserved. No duplicate editor or approved prototype edits.

Canvas-to-AI instruction-driven generation of three/four new concepts remains incomplete. AI raster details are not automatically decomposed into independent semantic layers. Existing separate text/logo/source-photo layers remain editable.

## Compatibility and safety
Content proposal quotes add templateReviewMode=approval-page-v1. Compact template generation checks it before offering paid execution, preventing an old backend from accepting generation and then failing the new review transition. This is additive response metadata, not schema or flag activation. Request retention, explicit paid consent and no automatic provider retries remain intact.

## Verification
Content and AI strict builds passed; no runtime activation.
Content: 56 unique focused tests passed across controller, lifecycle/publishing and owned-image suites after fixing a trailing-whitespace assertion to match intentional input trimming. The affected 23-test owned-image suite passed in full; three proposal cases passed again after adding compatibility metadata.
AI: 17 prompt/execution tests passed with mocks.
Frontend: 63 focused workflow tests plus six existing Canvas authority/sanitization/mutation tests passed. Scoped ESLint passed. Exact baseline/prototype comparison is recorded in completion evidence. No unrelated baseline fixes.
Browser layout acceptance, actual owner save/reopen/export and live provider quality remain unverified. No paid calls, database changes, flags, credentials or service restarts.

## Activation pending owner approval
Use the existing ad-studio-local.ps1 BrandTemplatesUat Prepare → Preflight → Restart procedure in the verified owner PowerShell session; fail immediately on any nonzero exit. It affects only Content5102 and providerAI5114. The exact command template is already in docs/ad-studio/production/BRAND-TEMPLATE-AUTHORING-FLOW-20261030.md and the owner's approved runbook. Do not activate without renewed approval for these changes.
Gateway, Identity, ordinary/heuristic AI, Media Worker and frontend must not be restarted by that procedure. The older Gateway media-rate correction requires its own separate activation; this launcher does not manage Gateway. No schema changes or new feature flags are required.

## Owner acceptance
After activation, reopen the existing template draft. Verify readiness, then owner initiates a single generation. A successful image should open the single review page. Check product identity, customize/save in the advanced Canvas shell, return to review, approve/save, and verify campaign counts stay unchanged until Use Template in Ad Studio. Test export. Reject wrong products or poor creative results; passing tests do not establish visual quality.

Rollback: scoped source revert followed by guarded prior-release activation after approval. Do not delete drafts, reset/clean worktrees or manually remove locks. Other dirty/line-ending-only files and backups are excluded from this checkpoint.
