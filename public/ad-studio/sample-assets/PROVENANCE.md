# Sample asset provenance inventory (R1 / Package F)

**Path:** `public/ad-studio/sample-assets/`  
**Rule:** Never use private user Brand Kit or customer media in public galleries.

## Current pack — NxClip original compositions (2026-10-21)

| File | Role | Ownership / source | License / permitted use | Public DEV gallery? |
|------|------|--------------------|-------------------------|---------------------|
| `w0a-product-hero.jpg` | Product hero | **Original NxClip composition** authored for Package F closure (HTML/CSS → JPEG via Playwright, 2026-10-21). No third-party photography. | NxClip project deliverable; public Ad Studio gallery preview OK | **YES** |
| `w0a-model-editorial.jpg` | Model editorial | Original composition; **stylized silhouette only** (no photoreal person / no model release required) | same | **YES** |
| `w0a-product-launch.jpg` | Product launch | Original composition | same | **YES** |
| `w0a-multi-shade.jpg` | Multi-shade | Original composition; four distinct shade panels | same | **YES** |
| `w0a-texture-showcase.jpg` | Texture showcase | Original composition | same | **YES** |
| `w0a-lifestyle.jpg` | Lifestyle | Original composition; silhouette / abstract scene only | same | **YES** |
| `w0a-seasonal.jpg` | Seasonal | Original composition | same | **YES** |
| `w0a-promo.jpg` | Promo | Original composition; fictional offer copy | same | **YES** |
| `w0a-minimal.jpg` | Minimal editorial | Original composition | same | **YES** |
| `w0a-social-story.jpg` | Social story 9:16 | Original composition | same | **YES** |

**Generator:** `.tmp/consolidated-release/package-f-harness/gen-owned-samples.mjs`  
**Design reference:** W0A visual baseline under `.tmp/consolidated-release/w0a-visual/` (design-approval comps; not shipped as public bytes).

## Superseded pack (not for public ship)

Prior Cursor GenerateImage JPEGs used only for W0A owner design approval are **replaced** by the original pack above. Do not restore GenerateImage bytes to public paths without a separate rights review.

## Private user assets

Public sample map (`samplePreviewAssets.ts`) references only `/ad-studio/sample-assets/w0a-*.jpg`.  
No `brands/` storage keys.
