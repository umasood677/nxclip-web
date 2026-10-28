# NxClip-native visuals and owner UAT — 2026-10-28

## Visual corrections
The live `/create/ad` reference uses Geist Variable at weight 600 for UI headings. Prototype-derived production shells were inheriting Inter/Georgia. `styles/production-theme.css` now scopes NxClip Geist typography and reference graphite/champagne colors to the production project workspace, new Brand Kit editor and native Brand Template library. Actual creative typography and uploaded logos are preserved. All 34 approved prototype files remain unchanged.

Brand Kit listing cards now display their actual palette, original product photograph (or uploaded logo), name and existing tagline. Empty kits receive a labeled palette study rather than an invented product image. Owned-kit counts and asset counts use existing API data. Record IDs, asset permissions and persistence are unchanged.

## On-screen UAT
Local development URL: http://localhost:3000/create/ad/uat
Entry links are available from Ad Studio navigation, the project workspace and Brand Kits. UAT controls are development-only.

48 stable checks cover every registered M2B screen plus JSON import/export, default-brand isolation, save failure, project/shared-field persistence, ownership, responsive/accessibility review, the Golden Ad and legacy records. Each has steps, expected results, implementation limitations, outcome, actual result/evidence, issue, enhancement and requested-fix fields.

Feedback is saved to this browser only. Use Download feedback for JSON or Copy feedback for a text report, then share it with the agent. No automatic upload occurs. Notes survive reload; browser-data clearing removes local notes. Optional record IDs build navigation links only and are not sent to a new service. The checklist starts with no passing checks and does not change the acceptance register.

Recommended order: Setup & brands → Campaign & concepts → Creative & Canvas → Campaign delivery → Roadmap & review. Use a disposable owned project for save/edit tests. Explicitly mark a missing capability Blocked and describe it; do not infer functionality from navigation. Existing base pages may be available while complete M2B parity remains pending in the register.

## Verification and limits
- 22 focused tests passed: five new checklist tests plus existing Brand Kit/Canvas tests. The final five checklist tests also passed after stable-ID refinement.
- Scoped ESLint passed with no errors.
- Exact TypeScript comparison: established baseline 42, current 38, zero added diagnostics. The repository still has baseline errors.
- Actual browser: reference typography inspected; matching Geist/600 confirmed on Brand Kits, the existing kit editor and the existing project workspace. Brand-specific product cover and existing assets rendered. Checklist search and expandable feedback form worked; a temporary local note survived reload and was removed afterward. No owner acceptance outcome was fabricated.
- No backend code, service restart, feature-flag change, migration, paid generation or real project/kit mutation performed.
- Full desktop/tablet visual review, owner flow execution, actual downloaded-report inspection, provider-backed generation and creative quality remain UAT. This slice does not resolve the separate provider-runtime activation gate or establish overall production acceptance.
