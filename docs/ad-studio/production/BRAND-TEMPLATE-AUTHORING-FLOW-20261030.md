# Brand Template authoring and campaign separation — 2026-10-30

## Owner-approved workflow

Reference: unchanged M2B prototype brand-overview → brand-templates → brand-template-detail.

Brand Kit Ready → Default Templates / My Brand Templates → AI proposal or native preview → Customize in the existing Canvas → Review → Approve or Reject → Save → explicit **Use Template in Ad Studio** → choose/create a matching campaign → create its advertisement.

Template authoring no longer asks for a campaign or calls campaign creative-creation endpoints. Native default Preview creates a template draft; it does not create an ad. AI generation still requires the existing explicit request review and user action. No provider request was executed during this change.

## Persistence and boundaries

Reuse the existing Canvas, asset authorization, version history, renderer and tables. A deterministic per-owner/Brand Kit/format internal storage container uses project metadata purpose=brand-template-authoring; documents use conceptSnapshot purpose=brand-template-source. This is an internal storage reuse, not a campaign or a new editor/persistence service. Normal project listings exclude these containers and campaign APIs reject them. Canvas saves cannot change purpose/provenance; campaign variation actions reject template drafts. Response DTOs expose documentPurpose and templateContext for navigation.

GET /brands/:brandId/templates/drafts and /drafts/:draftId resolve owner-scoped documents. POST /ai-source and /native-source take format, templateId, expectedBrandVersion and optional creativeDirection, never projectId. POST /:id/editor-draft opens an existing native template in Canvas; POST /from-draft validates source/brand versions, assets, graph/export compatibility and enters suggested/unsaved review. Editing a saved native template resets its approval and preserves optimistic concurrency. Existing AI /from-creative publishing and /:id/reuse retain ownership and review gates.

Only approved, saved, compatible templates enable Use Template in Ad Studio. Campaign creation is an explicit action after that gate. Actual ads reused from saved templates remain campaign ads even if their parent document was a template draft.

## Existing data

No old records were deleted, moved, rewritten or reclassified in the database. The authoritative legacy brand-template-source marker is filtered at read time and exposed in Brand Template Studio under Template drafts & proposals, including earlier generated attempts. No classification by filename, project title or parent ID. Existing real projects and genuinely saved ads remain accessible. Old project shells are deliberately preserved; any requested cleanup is separate. Older background-only attempts can be inspected and replaced with a new finished-template proposal without automatic generation.

## Verification

- Content strict Nx build passed; no runtime activation.
- 119 backend tests passed across eight suites: Ad Studio service/security, template controller/service/art direction/lifecycle/publishing, owned image execution. Includes no-campaign draft creation, scope rejection, save/reopen, immutable purpose, old-draft filtering, genuine reused-ad visibility, native review/approval/save and version failures. All provider effects mocked.
- 59 focused frontend tests passed across six suites: Brand Template workspace/model, project workspace, image execution/component, experience routes. Includes template-only entry/navigation, brand/version checks, back-to-review, unsaved guard and existing campaign save/reopen.
- Scoped frontend ESLint: zero errors (90 existing warnings).
- Frontend strict TypeScript: 38 current baseline diagnostics; exact file/location/code/full-message comparison adds zero. Evidence: frontend .tmp/template-authoring-diagnostics.json.
- All 34 approved prototype files match preserved CHECKPOINT-MANIFEST.json Git blob IDs. No prototype edits.
- Browser, live provider image quality and live SQL execution of the new draft-list query are not verified in this task.

## Activation and owner UAT

Source changes require a newly prepared Content release. Do not claim the currently running service contains this fix. Existing BrandTemplatesUat launcher/profile remains unchanged. After separate owner approval, use its fail-fast Prepare → Preflight → Restart sequence in the verified owner PowerShell session. Only Content 5102/provider AI 5114 are within that established activation profile; Gateway, Identity, frontend, regular AI, heuristic AI and Media Worker are untouched. No migrations, flags or environment changes are required. No runtime command has been executed in this task.

After activation: open Brand Kit Ready, enter Brand Templates, preview a native default, customize/save in Canvas, return to template review, approve/save, then explicitly use it in a campaign. During all steps before Use, verify campaign/creative counts do not increase. Inspect prior template attempts in the draft drawer. For AI, owner initiates the paid finished-proposal request; agent has not verified generated quality. Review the depiction before publishing, then follow the same review/save/use flow.

Local rollback: revert only this scoped source commit pair and prepare the prior reviewed release through the guarded launcher after owner approval. Never reset/clean the working trees. No schema rollback or deletion is required. Draft rows remain recoverable and must not be deleted as rollback.
