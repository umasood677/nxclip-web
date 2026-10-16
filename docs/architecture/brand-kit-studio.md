# Brand Kit Studio — Architecture (BK-A)

**Status:** BK-D complete (uncommitted)  
**Frontend:** `D:/nxclip-web` · **Backend:** extend existing `/brands` only (no new microservice)

## Architecture findings (audit)

| Area | Status |
|------|--------|
| Migration `014_brand_kits.sql` | Colors, typography, assets, voice JSONB, soft delete — sufficient for BK-A |
| JWT `/brands` CRUD + colors/typography/guidelines/assets | Reused; `DELETE` + `status=archived` wired on dashboard |
| `CreateBrandKitDialog` + `brandApi` | Kept for Ad Studio quick create; Studio uses full editor |
| Font catalog | Expanded as `brandFontCatalog` (export-faithfulness warnings) |
| Ad Studio Phase 3F | Links retargeted to `/brands`; BK-D shared picker + brand context |
| JSON import / assets editor / shared picker | Delivered BK-B–D |

## BK-A delivered

| Path | Screen |
|------|--------|
| `/brands` | Premium dashboard (search, cards, create, duplicate, archive, delete; import/export stubs) |
| `/brands/:brandId` | Sectioned editor: Identity · Colors · Typography · Review + live preview |
| `/create/brands` | Redirect → `/brands` |

**Components created:** `BrandKitDashboard`, `BrandKitEditor`, `BrandKitCard`, `BrandIdentityPreview`, `brandFontCatalog`, `colorContrast`, `duplicateBrandKit`, `brandKitTypes`  
**Reused:** `brandApi`, `CreateBrandKitDialog`, glass/tokens, Ad Studio fonts base  

**API/DB:** optional voice fields (`industry`, `website`, `targetAudience`, `signatureProduct`); typography role `cta`. No migration.

## BK-B delivered

- Editor sections: Logos & Assets, Brand Voice, Creative Guidelines
- Asset roles: `logo_primary`, `logo_light`, `logo_dark`, `logo_mark`, `product_image`, `brand_model`, `campaign_reference`
- Asset metadata (`description`, `usageGuidance`) in existing JSONB — no migration
- `PATCH /brands/:id/assets/:assetId` for label/guidance without re-upload
- Voice merge on PATCH preserves unknown JSONB keys; nested `creative` guidelines
- Live preview modes: identity, type, palette, IG feed/story, product, logo light/dark
- Import/Export UI explicitly labeled “(soon)” — not functional

## BK-C delivered

- Canonical portable schema `schemaVersion: "1.0"` / `nxclip.brand-kit` (+ bundle)
- Legacy seed adapter (`format: nxclip-brand-seed`) + fixture `fixtures/four-brand-kits.seed.json`
- Import dialog: file/paste/drag-drop, preview, create vs explicit update, partial bulk success
- Export one / selected / all + copy JSON (no signed URLs or asset binaries)
- Templates: Luxury Cosmetics, Gaming, Skincare, Fintech (static → owned kits)
- Duplicate remains client-side create+replace; assets not copied

## BK-D delivered

- Shared `BrandKitPicker` (Neutral, search, palette, create/import/manage, loading/empty/error)
- Guided brief + home consume picker; `seedBriefFromBrand` without AI; project brand sync/`clearBrandKit`
- `normalizeBrandContext` mapping layer; `toBrandContext` + AI Creative Director voice/creative/assets
- Role-aware scene palette/fonts; variations inherit brand snapshot
- Audit matrix: `docs/architecture/brand-kit-ad-studio-bkd.md`
