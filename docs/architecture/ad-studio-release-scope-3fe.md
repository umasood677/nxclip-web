# Static Ad Studio + Brand Kit Studio — Release scope (3F-E)

**Date:** 2026-10-16  
**Repos:** `D:/nxclip-web` · `D:/NxClip`  
**Branches:** `master` only (no commit/deploy in this phase)

## Intended for release

### Frontend (`nxclip-web`)
- Brand Kit Studio (BK-A–D) — already on `master` commit `dea9662` (+ prior)
- Ad Studio UX 3F-B/C — on `master`
- Ad Studio editor polish **3F-D + 3F-E hardening** — currently **uncommitted** under `src/pages/AdStudio/**`, `docs/architecture/**`
- API client: version list/restore + existing ad-studio/brand endpoints

### Backend (`NxClip`)
- Brand Kit APIs + migration **014**
- Static Ad Studio APIs + migration **015**
- BK-D brand context / role palette / AI prompt wiring — on `master` `4b253ec`
- **3F-E only BE change (uncommitted):** `CONTENT_SKIP_MIGRATIONS` support in `runSqlMigrations` + `database-init.service.ts`

### Required services
| Service | Role |
|---------|------|
| `api-gateway` | `/brands`, `/ad-studio` proxy + CORS |
| `content-service` | Brand kits, projects, creatives, export |
| `nxclip-web` | SPA |
| `identity-service` | JWT |
| `ai-service` | Concepts / generate-image (**optional** for brief-only smoke; required for Zoe concept acceptance) |

## Excluded from this release

| Item | Reason |
|------|--------|
| Migration **016** `016_ad_animated_studio.sql` | Phase 4A animated — exclude unless explicitly approved |
| Phase 4B animated UX | Out of scope |
| `dist/` build artifact churn in nxclip-web | Generated; deploy builds in CI |
| Unrelated Clip Studio / media-worker local dirt | Preserve; do not bundle into Ad Studio release notes unless intentional |
| Paid AI auto-calls in CI | Manual / approved credits only |

## Database migrations

| Migration | Required for 3F | Notes |
|-----------|:---------------:|-------|
| `014_brand_kits.sql` | **Yes** | Brand Kit tables |
| `015_ad_studio.sql` | **Yes** | Static Ad Studio tables |
| `016_ad_animated_studio.sql` | **No** | Set `CONTENT_SKIP_MIGRATIONS=016_ad_animated_studio.sql` on content-service until 4A approved |

**Do not assume prod already has 014/015.** Verify:

```sql
SELECT filename, applied_at
FROM content.schema_migrations
ORDER BY filename;
```

Expect `014_brand_kits.sql` and `015_ad_studio.sql`. `016` must be absent for a 3F-only schema.

## Environment configuration

| Variable | Service | Notes |
|----------|---------|-------|
| `GCP_DB_URL` / DB secrets | content | Required |
| `STORAGE_PROVIDER=gcs` | content | Brand + render assets |
| `GCS_BUCKET` | content | Private bucket; CORS for FE PUT |
| `FRONTEND_URL` | gateway | Must match SPA origin |
| `CONTENT_SERVICE_URL` | gateway | |
| `CONTENT_SKIP_MIGRATIONS` | content | **`016_ad_animated_studio.sql` for 3F-only** |
| `AI_MODEL_ROUTER_ENABLED` | ai | Optional; default false |

No dedicated Ad Studio feature flag — routes are JWT-gated.

## Rollback (high level)

1. Redeploy previous `content-service` / `nxclip-web` images.
2. Do **not** reverse 014/015 without a planned DROP (destructive). Prefer feature hide via FE route if needed.
3. If 016 was applied by mistake: stop traffic to animated APIs; schedule cleanup with DBA (DROP animated tables only after backup).
