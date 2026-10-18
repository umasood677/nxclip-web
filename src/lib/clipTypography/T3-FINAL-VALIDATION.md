# T3 final local validation — incomplete

**Production activation OFF. No commit, push, deployment, Docker build or migration. Cursor retains deployment ownership.**

## Fresh browser-to-worker comparison

Fresh browser execution used the current shared editor overlay and verified font loader, not the retained references. All 105 new PNG captures compare successfully with the actual worker frames: maximum ink-edge difference 2px; maximum unmatched foreground 0.071521%. Engineering acceptance remains at most 2px per edge and 2% unmatched foreground within a 2px neighbourhood. These are engineering tolerances, not user visual acceptance.

Fixtures exercise all fifteen faces, wrapping, explicit baselines/line height, left/center/right alignment, letter spacing, stroke, hard shadow, Latin accents and supported Ω. Fresh browser tests also verify three unsupported Ω faces reject rather than substitute; Inter loads; an actual font HTTP404 is contained; cold loading succeeds; default OFF produces no canvas and zero font requests. Seven legacy IDs and JSON storage round trips are checked by the fixture. These fixture storage tests are not a real server project save/reopen.

[Fresh image pairs](./T3-GOLDEN-RESULTS.html) · [Per-case measurements](./T3-GOLDEN-RESULTS.md) · [Detailed final results](./T3-FINAL-VALIDATION.json)

## Existing-project workflow — BLOCKED

No non-production backend, authenticated session or existing project identified. Frontend rejects loopback API overrides and defaults to production; separate local frontend blocks API calls and remains at startup screen.

A genuine existing legacy project was not opened, edited, saved or reopened, and no such pass is claimed. A local or non-production backend URL, authenticated session and project identifier are required. Shared API client / production configuration were not changed. No production save was attempted. Canonical fixtures use an explicit isolated test override; the actual app remains OFF and retains legacy caption controls/overlays.

## Repeated regressions and builds

| Check | Result | Exit |
|---|---|---:|
| Clip editor/Sound Design + typography combined | 41/41 | 0 |
| Worker caption/font/render/audio/ducking suites | 43/43, 8 suites | 0 |
| Exported frontend candidate vite | 8fde9722 | 0 |
| Exported frontend candidate server | 8fde9722 | 0 |
| Exported backend clean source TypeScript emit: media-worker, content-service and imported packages | 846180d5 | 0 |

Builds use exported committed source plus the explicitly enumerated typography files and partial patches, reusing installed dependencies without installing packages. Backend validation directly emits TypeScript for media-worker, content-service and imported package source; this is not a Docker image certification. Candidate helpers remove their own temporary exported trees after retaining logs.

## Proposed scope and remaining gates

[Exact proposed commit manifest](./T3-PROPOSED-COMMIT.json) enumerates frontend typography source/tests/evidence/assets and backend prerequisites. All eleven runtime dependency files and all 156 browser font/license files are included. All original 165 reconciliation entries remain checksum-verified by the candidate build. Mixed-owner editor/internal/queue files require typography-only hunks; the Dockerfile is explicitly blocked pending Cursor deployment coordination. No unrelated file may be staged.

Observed heads: frontend 8fde97222738360b55ba2d17e107f3914ab2c7ba; backend 846180d5e760148a702e007e277f358e61ebe1de. Cursor’s current release completion is not established. After Cursor confirms completion, reconcile against its resulting master revisions before requesting release approval.

Remaining blockers: actual non-production existing-project save/reopen; confirmation and reconciliation after Cursor’s release; explicit approval before any commit/push/deployment. Other browser engines, complex-script shaping, blur shadows and other aspect ratios remain uncertified. Poppins 700/900 and Caveat 700 still lack Ω, by actual font coverage.

Validation is not complete and release approval is not being requested prematurely. Keep all T3 production flags OFF.
