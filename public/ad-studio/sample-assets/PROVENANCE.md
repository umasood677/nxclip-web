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

## Original Example Brief additions

- `creator-night-reset.jpg`, `street-in-focus.jpg`, `space-to-breathe.jpg`, `built-for-the-pace.jpg`, `signature-carry.jpg` and `after-dark-heels.jpg` are original AI-generated illustrations created for the public Example Brief Library. They use fictional campaigns and serve as visual inspiration.

## Superseded pack (not for public ship)

Prior Cursor GenerateImage JPEGs used only for W0A owner design approval are **replaced** by the original pack above. Do not restore GenerateImage bytes to public paths without a separate rights review.

## Private user assets

Public sample map (`samplePreviewAssets.ts`) references only `/ad-studio/sample-assets/w0a-*.jpg`.  
No `brands/` storage keys.

- `project-workspace-office.jpg` — generated with built-in ImageGen for the Project workspace Default Template. Bright office portrait with a laptop, violet architectural accent and copy-safe space. The photo contains no headline, logo or CTA.
  - ImageGen prompt: Photoreal wide 16:9 hero background for a premium fictional project management software ad. Reference the supplied example's photographic art direction, not its lettering or logo. A stylish professional woman with dark brown loose hair and a black blazer sits thoughtfully behind a silver laptop at a bright modern office desk, framed on the right third, face centered around 77% x, 40% y. Natural daylight, pale cool whites, lavender and rich electric violet architectural curved accent behind her, airy clean commercial photography. The left 48% from the top to about 73% down must be very pale, uncluttered, even-toned, soft focus negative space for dark editable headline and CTA. Laptop and desk across the bottom.The rightmost quarter can contain a soft violet arc but keep the woman's face clear. Crop friendly, no text, no lettering, no logo, no mockup UI, no buttons. This is the clean background plate only. Premium natural photographic finish.
- `default-skincare-story.jpg` — user-supplied NxClip skincare visual used as the Social story gallery sample. The depicted product and copy are illustrative.
- `default-food-product-hero.jpg` — built-in ImageGen artwork for the Product Hero gallery sample.
  - ImageGen prompt: Create a finished 4:5 portrait advertising example for a reusable food Product Hero template. Photoreal studio culinary photography: a striking golden crispy chicken sandwich with red cabbage slaw, pickles and a glossy brioche bun, centered low-mid against a warm paprika-red seamless backdrop with a matching matte red tray; strong appetizing side lighting and natural shadows. Crisp commercial art direction, premium independent restaurant feel. Large warm cream headline exactly 'CRUNCH TIME' centered above the sandwich, on one line if it fits or two balanced lines. One compact warm-cream call to action exactly 'ORDER NOW' centered beneath the product. Only those words, no logos, trademarks, price, other labels, frames, borders or margins outside the artwork. Full-bleed edge-to-edge art. Keep all text and critical food details inside the central 76% of image height so a center crop to 4:5 retains both labels and sandwich. Strong, readable visual hierarchy at gallery-thumbnail size.
