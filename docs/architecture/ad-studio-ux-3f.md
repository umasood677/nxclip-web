# Static Ad Studio UX — Phase 3F

**Status:** 3F-A–**3F-E** complete (3F-D/E polish uncommitted on FE; BK/3F-B/C on master)  
**Frontend:** `D:/nxclip-web` · **Backend:** Phase 3 contracts + optional `CONTENT_SKIP_MIGRATIONS`  
**Scope stop:** After 3F-E. **No Phase 4B.**

## Milestone map

| ID | Deliverable | Status |
|----|-------------|--------|
| **3F-A** | Audit + architecture | Done |
| **3F-B** | Premium home + guided brief | Done |
| **3F-C** | Brand Kit cards + concept gallery | Done |
| **3F-D** | Editor / variations / export polish | Done |
| **3F-E** | Responsive hardening + acceptance + release readiness | Done |

## 3F-E additions

- Responsive overflow / mobile tab a11y / brand picker snap scroll  
- Export placeholder gate (no silent success for missing logo/product images)  
- Lightweight version History panel (existing list/restore APIs)  
- Release-scope + acceptance docs  
- Backend: `CONTENT_SKIP_MIGRATIONS` to exclude `016` for 3F-only deploys  

## Docs

| Doc | Path |
|-----|------|
| Release scope | `docs/architecture/ad-studio-release-scope-3fe.md` |
| Acceptance report | `docs/architecture/ad-studio-3fe-acceptance.md` |
| BK-D matrix | `docs/architecture/brand-kit-ad-studio-bkd.md` |

## Known limitations

- BrowserRouter: no `useBlocker` — Projects confirm + `beforeunload` only  
- SceneThumb ≠ export parity  
- Device-lab matrix still manual  
- Migration 016 must be skipped or approved separately  
