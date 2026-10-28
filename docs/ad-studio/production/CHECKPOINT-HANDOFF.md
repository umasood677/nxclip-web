# Ad Studio checkpoint handoff — 2026-10-28

## Current continuation

The owner has resumed the combined production initiative and deferred UI-only UAT. See [AI image workflow slice](AI-IMAGE-WORKFLOW-SLICE.md) for the next verified source increment and current gates. The preservation/runtime details below are historical checkpoint evidence; local frontend M2B/guided-brand presentation flags were subsequently owner-approved and enabled. Paid generation and the new image gates remain off.

## Resume here

Feature work is paused for preservation. Overall production acceptance and the first Golden Ad are NOT granted. Do not begin AI Story Engine work in these repositories.

Both branches: `codex/w8-feature-completeness-rc1`.

| Repository | GitHub origin | Complete code checkpoint |
|---|---|---|
| Backend | git@github.com:umasood677/nxclip.git | 1b26c2113332f217ad000252c12573b352d6f9c8 |
| Frontend | git@github.com:umasood677/nxclip-web.git | 86bee0b4c8655bc83535792d83e46fa60f8f2a59 |

These are complete code heads. A subsequent documentation-only commit records this handoff/manifest; use `git rev-parse HEAD` and `git log --oneline` for that final branch tip. Do not amend or rewrite history to insert a self-referencing hash. CHECKPOINT-MANIFEST.json records all incremental commits, reviewed file origins and exclusions. Intermediate incremental commits may depend on later groups; resume from the complete checkpoint/branch tip, not a partial group.

## Implemented versus accepted

- Guided Brand Kit identity, nested version-safe persistence, portable import/export and existing editor/assets/live-preview integration: implemented/tested; new gated UI acceptance pending.
- Models & Mascots permissions/expiry/scoped context and existing brand selection: implemented/tested. Runtime context reads pass in three scopes; no eligible character profiles currently returned. Uploaded assets do not imply usage approval.
- Native editable Brand Templates lifecycle and reuse of existing project/Canvas: implemented/tested. Deterministic native templates, not AI-generated artwork. HTTP lifecycle is gated off; prior PostgreSQL rollback-only persistence checks passed.
- Brand Analysis quote/consent/execute/status using existing Gemini/Vertex routing and durable AI jobs: implemented/mocked-tested; text only, no live provider acceptance. Suggestions require review and explicit saving. No image/website analysis claim.
- Existing Project → Create Ad → Concept Gallery → existing Canvas remains. Gated production presentation connects project views, placement/variation views and Director planning controls. Forty screen IDs are registered; full forty-screen functionality and visual parity are NOT complete. Native variations and proportional format adaptation are deterministic; adaptation can distort product proportions and needs visual correction/review.
- New quoted real-concept execution extends the existing Director, prompt/validator, regular-AI client, jobs and pricing. Fresh input/instruction/model/pricing quote + consent + unique request ID; one transport attempt; no silent heuristic substitution or provider switch; retained status recovery; existing metadata persistence with owner/snapshot checks and older-result replay protection. New source was added AFTER the currently running release and is not activated.
- Full campaign-level AI evaluation/improvement, meaningful AI visual variations, complete character use in image/animation, attributed performance recommendations and multi-scene Veo/media/Sound Design orchestration remain incomplete.

## Approved UX baseline

Frontend `src/pages/AdStudio/uxPreview/` and `public/ad-studio/ux-preview/`; review URL `/create/ad/ux-preview`. All 34 approved prototype source/asset files remain unchanged from the preserved approved baseline; their committed blob IDs are in the manifest. Preserve its luxury layout, navigation, interactions and existing production Canvas. Prototype artwork is explicitly illustrative, not verified product/variant/branding evidence. Existing W0A/Clip Studio/Sound Design work is preserved in separately labeled baseline/dependency commits, not claimed newly implemented by this initiative.

## Tests and diagnostics

Reuse committed test sources and the normal Nx/npm toolchain. Prior run evidence is summarized here because private/temporary staging configs and logs are intentionally excluded from Git.

- Backend: 37 AI tests, 45 Content regressions, final nine-case quoted-Content rerun, four routing tests; strict AI/Content TypeScript passed.
- Frontend: 42 focused Director/project/placement/route tests; prior 99-test broader suite passed. Focused new production-module lint passed.
- Launcher: 14 tests passed again immediately before checkpointing.
- Frontend has 42 existing TypeScript diagnostics; not a clean compile. Forty-one exact comparisons match. The remaining ClipEditor.tsx:3796:17 TS2322 has the identical unsupported categoryLabel cause; only the truncated captionFontId union representative differs (arial/impact). The entire source file matches preserved SHA256 063b26c6d456127cc32023cb92455a77e005d8f0d8262d5c113ca53605128b5e. No diagnostics occur in the new Director modules. Do not fix unrelated baseline errors during resume.
- New concept atomic SQL update is unit-tested, not live database-write tested. No paid providers were called. Browser, responsive visual, Canvas and export acceptance are still required.

## Database and runtime

Only the previously owner-approved local additive `content.brand_templates` table/index SQL was applied to localhost:5433/nxclip_dev, transactionally. Eight columns, fourteen constraints and three indexes; nine existing-table fingerprints unchanged. Subsequent repository tests rolled back, leaving no test rows. See SCHEMA-APPLICATION-REPORT.md and schema/brand-templates-review.sql (SHA256 571a8c0823fbd6e4ac7c95670555544a1f42c177839aca45d3a8aed3825186cf). The SQL is outside startup migrations. Do NOT rerun it blindly or apply other schema changes. No database change was made for this checkpoint.

Last prepared and verified running release: `2026-10-27T17-57-31-660Z-1f1359`.
Content5102 PID29384; dedicated heuristicAI5104 PID7792. Both matched release/receipt/listener/creation identities and release file hashes. Gateway5100 and frontend3000 remained HTTP200 and retained their PIDs; unrelated services were unchanged. The owner executed the guarded restart in the verified PowerShell session. Codex's session still lacks full live command/executable visibility; do not bypass checks or assume elevation fixes it. See RUNTIME-POST-RESTART-VERIFICATION.md and the local runbook. Runtime files/receipts remain local, Git-ignored and not portable evidence of a fresh checkout's running state.

Feature flags remain disabled: guided Brand Kit, Brand Templates, Brand Analysis, M2B production presentation and real concept execution (frontend/backend gates where applicable). Dedicated5104 remains heuristic, model router off, paid keys excluded. Migrations, schema synchronization, queue/background workers and outbox processing remain disabled. New real-concept source requires a FUTURE reviewed Content + regular-AI5004 build/activation; restarting heuristic5104 does not activate paid-capable execution. No restart approval carries over from the completed single attempt.

## Exact next steps

1. Fetch the checkpoint branches and inspect this handoff/manifest. Preserve all local work. Confirm the current branch tip and production acceptance gaps; do not restart the audit from scratch.
2. Restore/install normal repository dependencies as needed. Local .env and the existing private heuristic launcher/configuration are intentionally not in Git: retain existing authorized configuration on this machine, or obtain authorized values for another machine. Never copy production credentials, private keys, signed URLs or user assets into Git.
3. Reuse existing unit tests. For targeted new cases use ad-creative-director.quoted.spec.ts, brand-analysis.service.spec.ts, quoted-ad-concepts.spec.ts, ai.client.concepts-routing.spec.ts, conceptExecutionModel.spec.ts, projectWorkspace.spec.ts and tools/ad-studio-local.spec.cjs. Existing Nx/Jest configs may require rebuilding shared contracts through the standard build toolchain. Temporary staged test harness configs under .tmp were not committed.
4. Complete provider-free HTTP and disposable-scope SQL acceptance of new quote/status/persistence routes only after scope approval; no real records are approved for mutation by this handoff.
5. Prepare builds with the existing `tools/ad-studio-local.ps1 -Action Prepare` / documented runbook when configuration is verified. Request separate approval for runtime changes or flag activation. No automatic migrations or unrelated restarts.
6. Complete approved production UX parity at desktop1440/tablet768/mobile390, save/reopen, concept selection, existing Canvas and export. Do not replace the Canvas or redesign the approved prototype.
7. Continue campaign Director review/comparison and reviewed image-generation bindings, then permissions-aware characters and multi-scene animation. Reuse existing Gemini/Veo/media/Sound Design services; no duplicate AI stack.

## First Golden Ad gates

Approved owned original product photograph, usable source-preserving isolation (ZOE Mask V3 remains rejected), clean logo roles, font/reference rights and product associations; explicit provider cost authorization; real visual evidence; editable deterministic text/logo/product layers; Canvas save/reopen; preview/export parity; human creative-quality approval. Numerical/source RGB checks and passing unit tests do not establish professional ad quality.

## Excluded / local-only

Backend: exit (unknown artifact), audio-edl.builder.ts.bak, commentary-scheduler.ts.bak. Frontend: useAuthenticatedBrandAssetUrls.ts.bak. These files were not deleted. .tmp snapshots, screenshots, prepared releases, runtime receipts/logs, private environment files, credentials, database state/dumps and private assets are not committed or pushed. Relevant source functionality and tests are committed; raw private evidence remains on this machine.

Push target is origin / codex/w8-feature-completeness-rc1 only. No force push, main merge, deployment, workflow dispatch, service restart, flag activation, schema mutation or paid call is authorized by this checkpoint. CI push triggers exclude this branch; deployment workflows are manual-only.
