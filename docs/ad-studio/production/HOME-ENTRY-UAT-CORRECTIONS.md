# Home entry and Brand Template UAT corrections — 2026-10-28

## Confirmed causes
1. Home requested creatives from four recent projects, combined them and rendered them with whichever Brand Kit was selected globally. This mixed project context and broke protected-image resolution.
2. Brand-specific gallery cards were curated overlays over the ten generic layouts, not records from the saved Brand Template API. Example Brief pictures were illustrative references, not generated templates.
3. Home Use template created a project and then called a separate creative endpoint. A rejected binding (for example a missing/unauthorized model) left the first write behind.
4. Example Briefs set a local compose view on `/create/ad`, entering the legacy details/composer experience rather than the current project route.

## Implemented
- Remove the global creative aggregation and Home Recent creatives section. Existing Project creatives remains the single project gallery. Recent projects are filtered by selected Brand Kit, including the Default Brand boundary.
- Resolve the selected kit through its owner API and hydrate private preview images through the existing authenticated asset hook. Image elements remount when their hydrated URL changes; an early image error cannot permanently hide a subsequently loaded source.
- Resolve legacy project thumbnail keys through authorized temporary URLs. Do not treat storage keys as browser URLs or guess missing assets.
- Home Create project, Example Brief and standard template actions now navigate to `/create/ad/new` with explicit selection parameters. This is a draft page; no project is written by navigation. It reuses the project creation form and existing API, preserves Example Brief/Campaign Idea context, and navigates to the current owned project workspace/Working Brief after an explicit save.
- Remove the old Home create-project-then-create-template path. Explicit project save makes one write and does not automatically create a creative. Invalid source/format checks block saves where applicable. Existing projects are not automatically deleted or changed.
- Branded galleries read actual saved Brand Template records using the existing API. The same records can be inspected from the Example Brief area. Approved/saved/freshness and matching brand/format requirements remain in place. An Example Brief provides strategy; a visual template is selected explicitly rather than inventing an association absent from the existing contract.
- Native reuse acts only on an existing compatible project, with a fresh template check and existing reuse endpoint. Frontend execution gates remain enforced; read-only listing does not enable mutation features.
- Default standard layouts remain available as explicitly unbranded starting points. Uploaded model photos do not imply commercial/likeness authorization. No identity or model gates were weakened.

## Verification
- 22 focused tests passed: Home rendering/scope, actual saved-scene rendering, approved/saved/blocker filtering, Example Brief persistence payload, validation before write, no automatic creative creation/retry, model authorization, project gallery and legacy authenticated URL contracts.
- Exact frontend TypeScript: established baseline 42 diagnostics, current 38, zero newly introduced. Scoped ESLint has zero errors and two pre-existing explicit-any warnings. All 34 approved prototype files are unchanged.
- Browser: Default Home showed no ZOE projects and no Recent creatives; selecting ZOE showed its owned projects. Example Brief opened `/create/ad/new?exampleId=...` in the new layout with seeded draft fields; Default Model Editorial Use template opened `/create/ad/new?templateId=model-editorial&format=portrait_1080x1350`. No form was submitted. Two creatives remained in the existing ZOE project; all four product/logo thumbnail images decoded successfully. Brand preview product/logo images also decoded.
- Remaining runtime blocker: the actual read-only saved Brand Template request returned HTTP 503. The current runtime cannot supply its template records. Source integration and synthetic tests do not establish live generation/list/reuse success. Local native-template activation requires the established approved runtime procedure; no flags or services were changed here.
- Example Brief-to-project submit/save/reopen and positive native-template generate/reuse remain owner UAT. No project/kit/creative writes, provider calls, schema changes or service restarts were performed for browser verification.
- Existing empty projects from earlier failed clicks were preserved. Owner UAT feedback entries were not marked passed automatically.

## Follow-up review
Use UAT-01, 02, 03, 04, 13, 33, 37, 38 and 42 for the corrected navigation, project isolation, thumbnails and native-template availability. Actual provider-backed generation/creative quality and overall M2B acceptance remain pending.
