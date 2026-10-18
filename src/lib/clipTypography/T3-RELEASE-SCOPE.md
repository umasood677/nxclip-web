# Proposed T2/T3 release scope — not staged

**Latest status:** Local integration is restored behind OFF gates. Use `T3-INTEGRATION-REPORT.md`, `T3-INTEGRATION-MANIFEST.json` and `T3-integration-editor.patch` / `T3-integration-backend.patch` for current scope. The reconciliation note below is historical. Cursor owns media-worker deployment readiness; this work does not authorize Docker/deployment changes or release. Fresh integrated browser capture and explicit release approval are still required.

**Current reconciliation hold:** Cursor removed the incomplete editor integration in `0d0e33f` and the dangling setter in `b0d9a8b`. Do not restore the old patch. The current ClipEditor dirty hunks belong to Sound Design; the generated frontend patch has been cleared. The backend patch is also a historical review artifact, not a currently cleared staging plan. See `T3-RECONCILIATION.md` and its dependency/checksum inventory. Restore integration only as one complete coordinated change after independently building the candidate source tree.

The T3 implementation depends on the existing uncommitted T2 font registry/assets/worker integration. A viable release must include those prerequisites together with T3, rather than committing the restored contracts export alone.

Typography-owned scope: frontend `src/lib/clipTypography`, `public/fonts/clip-typography`, `src/pages/ClipEditor/CanonicalCaptionPreview.tsx`, and the reviewed ClipEditor changes; backend canonical font assets/modules/tests/tools, typography ASS/FFmpeg/Docker hunks from T2/T3, the new content canonical helper and reviewed content-service/fingerprint changes, plus the new shared layout contract/test and its approved export.

Mixed-owner files require partial staging:

- `libs/contracts/src/lib/internal/index.ts`: include only the canonical layout type import and optional caption property. Exclude Ad callback/queue routes.
- `apps/media-worker/src/queue/dto/render-clip-queue.dto.ts`: include only the optional canonical caption layout property. Exclude Ad DTO/import changes.
- Recheck the tracked patches against current working trees before staging; Cursor may continue editing.

Exclude Ad Studio/Phase 4C-B code, Sound Design changes, deployment configuration, root dependency manifests/lockfiles, unrelated docs, `server.ts`, existing `dist` changes and local build output. Do not use `git add .`.

`T3-release-backend.patch` and `T3-release-frontend.patch` are review artifacts for tracked typography hunks. New files/assets are enumerated in `T3-CHANGED-FILES.json`; the pre-existing T2 prerequisite package is documented in `T2-B2-REPORT.md`. No patch has been staged/applied to the index by this preparation.

Activation remains OFF. Local visual tests do not authorize production font activation. Full authenticated reopen testing and post-push CI/CD/deployed revision checks remain separately identified in the report. Coordinate this exact scope with Cursor before committing/pushing.
