# M2B interaction and verification evidence

2026-10-26. Real browser interactions against the existing localhost frontend; no service activation/restart. All data below is demonstration/session data.

## Automated verification

65 tests passed, zero failed/skipped: model.spec.ts, m2b.spec.ts, projectWorkspace.spec.ts, sceneGraph.spec.ts and conceptVisual.spec.ts. This includes preserved M2A contracts, canonical taxonomy, all five category kit→recipe→editor→version→save/reopen pure-state flows, approval gates/lifecycle, niche/goal/palette/type propagation, bounded version IDs, undo/redo, fitted foreground bounds, variation locks and visible style changes, legacy restore, distinct SVGs, all40 routes and static transport isolation. The cross-brand reset regression and simple copy synchronization have dedicated tests. These are not backend or account-backed production acceptance tests.

Targeted ESLint: PASS (empty lint-final.txt). Full TypeScript:42 final diagnostics exactly match the42 baseline file/location/code/message lines; zero added or removed. tsc exits1 because of those existing errors. Exact comparison is recorded in verification-summary.json. Do not describe the repository as globally type-clean.

Commands from frontend root:
~~~powershell
node --import tsx --test src/pages/AdStudio/uxPreview/model.spec.ts src/pages/AdStudio/uxPreview/m2b.spec.ts src/pages/AdStudio/lib/projectWorkspace.spec.ts src/pages/AdStudio/lib/sceneGraph.spec.ts src/pages/AdStudio/lib/conceptVisual.spec.ts
node node_modules/eslint/bin/eslint.js src/pages/AdStudio/uxPreview
node node_modules/typescript/bin/tsc --noEmit
~~~

Raw evidence: .tmp/ad-studio-m2b/tests-final.txt, lint-final.txt, tsc-before.txt, tsc-final.txt. Source patches were reviewed against existing interfaces, not replaced wholesale.

## Executed browser journeys

| Scenario | Observed result | Scope |
|---|---|---|
| Seven-step new Brand Kit | NOVA Launch Studio created locally; canonical Gaming / Game Launches & Trailers confirmed; goals/personality chosen; two fixture assets classified/approved; identity heading font changed to Inter; guidelines approved | PASS, prototype |
| Automatic brand templates | Four recipes prepared on completion; selected kit/niche/goal carried into library; unapproved use blocked; recipe customized, approved and saved | PASS, prototype |
| Template → Canvas → campaign → export | Approved recipe opened editable layers with Inter/name; headline edited; undo/redo and version capture exercised; save; motion and export/recovery controls reached | PASS, prototype |
| Persistence | Created kit, approved/saved recipe and edited creative available after reload; saved fashion reopened; final brand-switch regression rerun for all five with rendered brand text checked | PASS, local session |
| Five categories | Gaming, Corporate, Products, Fashion and Travel each traversed brief→category assets→simulated generation→finished preview→local save; correct names NOVA ARENA / NORTHLINE / ZOE / FORME / AZURE STAYS checked in rendered layers | PASS, prototype |
| Original prompt journey | Brief→assets→simulated generation→preview→save→gallery | PASS, clean session |
| Original Example Brief journey | Brief→assets→concept progress→gallery→Editorial Beauty detail→use→save | PASS, clean session |
| Original visual-template journey | Product Spotlight preview→apply assets→assemble→preview→save; three saved entries visible with prompt/example journeys | PASS, clean session |
| Director | Editable suggestion reviewed and accepted; creative/brief context carried forward | PASS, deterministic |
| External reference | Missing-external selection blocked candidate preparation with explicit rights/artwork message | PASS, blocker UX |
| Visual planning | Original-text restored; local candidate preparation; second background selected; composition opened | PASS, fixture |
| Product/isolation | Variant gate blocked (zero verified); transparent-vector preparation; illustrative alpha approval action; real Mask V3 rejection label retained | PASS, representation only |
| DNA/quality | Preset captured; geometry findings shown; reviewed fix rejected without automatic creative approval | PASS, limited axes |
| Variations | Configured default axes, generated, saved candidate; performance improvement action returned to variations and generated visible style/headline treatments | PASS, prototype |
| Adaptation | Reframe applied; all four formats selected; safe-zone guides enabled | PASS, deterministic |
| Motion | Silent playback advanced timeline; pause, music-option and voiceover-track controls; MP4 handoff | PASS, silent UX only |
| Delivery recovery | Forced failed job, cleared fixture failure, retried to complete; final clean-session export complete; date persisted and local schedule confirmation shown | PASS, simulated |
| Browser console | Final clean session completed original journeys without error logs | PASS for observed session |

During editing an incorrect temporary helper import caused Vite HMR errors; it was corrected before clean-session verification. Earlier development-session logs retain those historical errors. No claim of uninterrupted HMR is made. A brand-context reset defect and date input event mismatch were found and corrected during browser verification. Final source has regression coverage for brand resets. Job/schedule confirmation intentionally resets on reload; settings/creative snapshots remain.

## Responsive and visual evidence

Actual browser screenshots, not mockups: .tmp/ad-studio-m2b/screenshots/ . Category gallery tested at1440,768,390px; document scrollWidth equaled viewport width in all three. Advanced Canvas tested at768 and390px with the same result; desktop screenshot captured. Mobile navigation scrolls horizontally within its own rail. Original vectors are visually distinct but photographic quality is intentionally unverified. Screenshots taken before a defect fix are preliminary; final category files were recaptured after corrected rendered-brand assertions.

Key evidence: m2b-categories-desktop/tablet/mobile.png; m2b-canvas-desktop/tablet/mobile.png; m2b-brand-ready.png; m2b-brand-templates.png; m2b-gaming/corporate/products/fashion/travel.png; m2b-adaptation-desktop.png; m2b-delivery-complete.png. m2b-gallery-desktop.png is an earlier development-session inventory, not final visual-identity acceptance evidence.

## Isolation and remaining unexecuted checks

New modules contain no API transport or backend mutation client. Production API-bound Brand Kit/Canvas components are not mounted. All assets are same-origin original SVGs and all mutations are reducer/session state. This is supported by code/test inspection; a full network interception/trace was not recorded. No authenticated owner session or account-backed production record was used. No paid provider, audio synthesis/listening, real segmentation, publishing, file rendering or backend smoke test occurred.

Not every secondary lifecycle CTA received individual browser coverage; approve/use/save was exercised in browser and reject/duplicate/archive/regenerate contracts are covered by unit tests. The coverage matrix explicitly marks partial capabilities and deferred live execution. Owner visual approval, keyboard/screen-reader audit beyond semantic labels, full browser-engine compatibility and production integration remain outstanding.
