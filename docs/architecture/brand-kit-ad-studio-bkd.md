# Brand Kit ↔ Ad Studio integration (BK-D)

**Status:** BK-D complete (uncommitted)  
**Acceptance scenario:** ZoeArtisan Signature Red Matte Lipstick

## Field matrix

| Property | Store | Retr | Pass (AI) | Visual | Creative snapshot | Export |
|----------|:-----:|:----:|:---------:|:------:|:-----------------:|:------:|
| name | Y | Y | Y | Y | Y | P (baked) |
| industry | Y | Y | Y | N | Y (voice) | N |
| description | Y | Y | Y | N | Y | N |
| tagline | Y | Y | Y | P (brief seed) | Y (voice) | N |
| signatureProduct | Y | Y | Y | P (brief seed) | Y (voice) | N |
| targetAudience | Y | Y | Y | P (brief seed) | Y (voice) | N |
| colors (roles) | Y | Y | Y | Y (role-aware) | Y | P (scene) |
| typography (roles) | Y | Y | Y | Y (role-aware) | Y | P (scene) |
| voice tone / doSay / dontSay | Y | Y | Y | N | Y | N |
| preferredCta | Y | Y | Y | P (brief seed) | Y | P (scene CTA) |
| guidelines | Y | Y | Y | N | Y | N |
| creative guidelines | Y | Y | Y | N | Y (voice) | N |
| logo assets | Y | Y | P (metadata) | Y | metadata + layer | P |
| product / brand_model | Y | Y | P (prompt hint) | P (preview URL) | metadata | N |

Legend: Y = yes · P = partial · N = not applied as a dedicated export field (baked into scene when relevant).

## Data flow (10 steps)

1. **Selection** — Shared `BrandKitPicker` (Neutral / kits / search / create / import / manage)
2. **Project create** — `brandKitId` (+ version) persisted on `ad_projects`
3. **Snapshot / reference** — Project keeps live kit id/version; creatives get immutable `brandSnapshot`
4. **Guided brief** — `seedBriefFromBrand` fills empty fields only; no AI on kit change
5. **Concept request** — content-service loads kit → `toBrandContext` → AI service
6. **AI Creative Director** — voice, creative guidelines, palette, fonts, assets, products in prompt; heuristics role-aware
7. **Concept → creative** — `buildSceneGraphFromConcept` + `resolveScenePalette` / `resolveSceneFonts`
8. **Scene graph** — headline/body/CTA fonts + role-ordered colors + optional logo layer
9. **Variations** — inherit `brandSnapshot`; palette from snapshot roles
10. **Render / export** — scene graph layers (brand baked in); snapshot preserved on versions

## Shared contracts

- Frontend: `normalizeBrandContext` / `seedBriefFromBrand` (`brandContext.ts`)
- Backend: `AdStudioBrandContextDto` (`@nxclip/contracts`) via `toBrandContext`
- Scene: `brand-role-palette.ts`

## Explicit non-goals

- No auto paid AI on Brand Kit select
- No signed URLs in prompts or snapshots
- No competing brand schemas
