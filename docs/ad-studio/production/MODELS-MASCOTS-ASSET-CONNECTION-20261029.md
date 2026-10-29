# Models & Mascots: shared asset connection

Date: 2026-10-29. Frontend-only usability correction.

## Purpose and persistence
Brand Kit Assets stores uploaded files. The shared Models & Mascots editor stores reusable identity, appearance, consistency, authorization and usage scopes in `voice.studio.characters[]`. `referenceAssetIds` links the profile to ready image assets in the same Brand Kit. Both guided and existing editor entry points reuse BrandCharactersSection. Uploading a file alone never creates an approved identity profile.

## Implemented
- Visible Models & Mascots section in Assets, with a shortcut from the model asset slot.
- Existing model references show authenticated thumbnails and Use uploaded model. This seeds an unsaved profile referencing the original asset ID, without another upload.
- Separate Add model profile and Add mascot / character controls.
- Upload reference image and Choose from Content Library inside the profile editor, alongside characteristics. Both reuse the existing signed upload/confirmation flow. Content Library selection copies an authorized original image into Brand Kit Assets using the existing picker; it does not mutate its source content.
- Human reference uploads use the existing brand_model role; fictional references use other. No schema or role enum changes.
- Up to eight ready reference images, explicit profile save, draft status, and existing authorization gates. Binding a new reference resets review status to draft; it never grants rights.
- Shared secure image upload helper is also used by the existing asset manager. It verifies returned Brand Kit and asset association, uploads original bytes, and does not automatically retry.
- Optimistic version handling preserves drafts on errors/concurrent profile edits. Wizard navigation warns about unsaved profile changes; Close profile editor can discard only the local draft.

## Verification
- 15 focused tests passed: upload protocol, original bytes, no automatic retries, invalid/foreign responses, character permissions, reference binding, version rebasing, existing native-template contract regressions.
- Scoped ESLint passed. Exact TypeScript diagnostic comparison: baseline 42, current 38, added 0. Full frontend compilation remains subject to the documented existing diagnostics.
- All 34 approved M2B prototype files unchanged; backend source unchanged.
- Browser: Zoe model thumbnail loaded; Use uploaded model selected its existing reference in an unsaved human-model profile; upload and library controls visible; library dialog opened and cancelled; rights remained unchecked and profile remained draft. Test draft then discarded. At 384px no document horizontal overflow.
- Real upload, profile persistence/reopen, desktop visual review and downstream provider generation were not exercised. No private binaries uploaded, no user records saved, no approval changes, no paid calls.

## Owner UAT
Open the existing Brand Kit, Assets, Models & Mascots. Choose Use uploaded model for the existing Zoe model (no need to re-upload). Alternatively add a profile and upload/select a reference. Enter characteristics, save the draft, reopen it, and verify the same reference. Review authorization separately before explicit approval for intended scopes. Uploading an image does not prove likeness rights or guarantee identity preservation by providers.

No backend rebuild, service restart, feature-flag change or PowerShell command is required. The current frontend serves the updated source. Preserve existing provider and consent gates.
