# Brand Kit UAT corrections — 2026-10-28

## Delivered
- `/brands` retains the existing owned-kit listing and management APIs, with a premium responsive library layout, search, export/import and one Create Brand Kit action.
- `/brands/new`, `/brands/:brandId` and compatible `/guided` links use the same new workspace. Existing IDs, versions, uploads, characters and permissions remain attached to their original records. No migration or duplicate kit is required.
- Ad Studio's in-place create/edit dialog reuses that workspace, retaining the current unsaved advertisement brief. Voice and detailed creative-guideline sections reuse the existing components and persistence.
- Import/export JSON is available within the workspace. The existing safe parser, canonical mapper and exporter are reused. A downloadable compatible sample and preparation instructions are included. Import updates only the unsaved draft; Save is explicit, uses the same kit ID/version and never imports image URLs or asset permissions. Identity/guideline approvals reset for review.
- Asset thumbnails use authenticated media hydration with the configured gateway header. Same-role candidates are selectable individually; unrecognized legacy roles remain visible. ZoeArtisan's six existing assets were observed in the live editor.
- Upload and Content Library choices use the existing secure upload/confirmation APIs. Library discovery uses `/content/mine`; attachment requires explicit selection and permission acknowledgment. PNG/JPEG/WebP originals are copied through authenticated media reads without altering the source content. Lazy previews use temporary object URLs and never put credentials in image URLs.
- Missing production Ad Studio Create icons now use Plus. Approved prototype source/assets are unchanged.

## Verification
- Focused automated suite: 34 passed, zero failed. Covers canonical/legacy JSON, draft merging, asset/font/permission preservation, unsafe input, protected media, owner-library reads, unchanged bytes, multiple asset candidates, existing preview contracts and creative gallery.
- Exact frontend TypeScript comparison: baseline 42 diagnostics, current 38, zero added. Existing touched-component compatibility errors were removed; project-wide TypeScript is not clean.
- Scoped ESLint: zero errors; four existing explicit-any warnings in AdStudio.tsx remain.
- Approved M2B preservation manifest: 34 files, zero changed.
- Actual authenticated browser checks: listing and same-record editor navigation; six uploaded assets; existing primary-logo preview; owner Content Library list and thumbnails; synthetic JSON validation and cancellation; Ad Studio home and Brand Kit selector load. Current narrow browser viewport was inspected; full desktop/tablet visual acceptance remains owner UAT.
- No service restart, environment/flag change, paid call, schema change or real record mutation performed.

## Owner review
Open http://localhost:3000/brands and choose Open Brand Kit on ZoeArtisan. In Assets, review the six existing uploads, upload or select from Content Library, and save only deliberate changes. In Import / export JSON, download the sample, validate an edited copy and Apply to draft before explicitly saving.

Real upload/attachment, JSON save/reopen and embedded-editor save/reopen were not exercised against owner data. Content Library currently supports PNG/JPEG/WebP candidates up to 25 MB, loads 100 content records per step up to 1,000, and leaves original content unchanged. Direct upload retains existing SVG support. This correction does not resolve the separately documented provider-runtime activation blocker or grant overall Ad Studio/Golden Ad acceptance.
