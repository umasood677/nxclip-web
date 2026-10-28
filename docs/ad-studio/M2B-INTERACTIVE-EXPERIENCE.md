# M2B consolidated interactive experience

2026-10-26. Frontend prototype delivery for BOTH owner documents. Review URL: http://localhost:3000/create/ad/ux-preview . Development-only route; production Ad Studio, Brand Kits and Canvas remain separate.

## Outcome and limits

40 connected views preserve the original 16 M2A screens and extend them with 24 roadmap/Brand Kit views. Mandatory P0 assisted Brand Kit creation, automatic brand-scoped template suggestions and five category systems are represented as editable local UX. This is ready for owner UX review, not owner acceptance or production rollout. The 146-row matrix records 110 fully represented prototype interactions, 28 partial representations with explicit deferred remainders, and eight intentional live-capability deferrals. It is NOT a claim that the complete live roadmap is implemented.

No backend application, endpoint, database, environment file or running service was changed/restarted. No project/creative/Brand Kit API writes, uploads, paid calls, private product processing or publishing. No commits/pushes. Existing production dirty work was preserved. M2B writes are confined to uxPreview modules, original preview assets and documentation/evidence. App.tsx and AdStudioHome.tsx retain the pre-existing M2A DEV entry; M2B did not replace their production workflows.

## Consolidated discovery and reuse

M2B-CONSOLIDATED-PLAN.md was prepared before implementation. M2B-ROADMAP-INVENTORY.json retains exact source references and per-capability purpose, existing implementation assessment, missing interaction, expected outcome, priority and milestone. Recovered Phase 3/3F/BK-D/4A/4B/4C, rendering, W8 composition plans, Sprint 1 and intelligent contracts. No single approved consolidated master was found. Historical proposed milestone numbering is not treated as deployment evidence.

Production BrandKitEditor, CreateBrandKitDialog and asset management already provide identity CRUD, voice, guidelines, asset organization and versions. They remain unchanged. API-bound production components are deliberately not mounted in the sandbox. Reuse: BrandKitSummary types, existing font catalog, template IDs, canonical creator taxonomy plus source-traceable coach seed niche records, AdSceneGraph and unchanged SceneStage renderer. No second production Canvas or service.

## Complete screen inventory

Preserved M2A: home, brief, templates, template, assets, progress, concepts, detail, compare, preview, edit, variations, workspace, formats, export, performance.

Brand extension: brand-info, brand-category, brand-goals, brand-assets, brand-analysis, brand-guidelines, brand-overview, brand-templates, brand-template-detail, category-studio, brand-manager.

Roadmap extension: director, brand-intelligence, product-lab, visual-lab, composition, advanced-canvas, variation-lab, adaptation, campaign-manager, motion-studio, delivery, dna-quality, preflight.

Every new view is reachable through contextual actions and the expandable roadmap navigator. Back navigation retains session context. Invalid screen IDs fall back safely. No production editor is replaced.

## User-flow map

~~~mermaid
flowchart TD
 H[Preview home] --> P[Prompt / brand / assets]
 H --> E[Example Brief]
 H --> T[Visual Template]
 P --> G[Simulated progress]
 E --> B[Editable campaign brief] --> G
 G --> C[Concept gallery and comparison]
 C --> D[Concept detail] --> F[Finished preview]
 G --> F
 T --> TP[Template preview] --> P
 H --> BK[Seven-step assisted Brand Kit]
 BK --> O[Reviewed identity and guidelines]
 O --> BT[Automatic candidate recipes]
 BT --> R[Customize / approve / save]
 R --> AC[Advanced prototype Canvas]
 F --> AC
 AC --> V[Versions / undo / redo / local save]
 V --> CW[Campaign gallery and collections]
 AC --> VL[Variations / DNA locks]
 AC --> A[Format adaptation]
 AC --> M[Silent motion / timeline / audio options]
 A --> X[Delivery simulation]
 M --> X
 CW --> X
 X --> I[Fixture performance / improvements]
 I --> VL
 BK --> CAT[Five category campaign systems]
 CAT --> P
~~~

## Mandatory Brand Kit and category experience

Seven steps: business context; searchable category/dependent niche; goals/personality cards; simulated category-specific asset selection/classification and usage approval; editable identity suggestions; editable guideline summary approval; completed kit with automatic candidate recipes. Website is recorded only, never fetched/analyzed. Suggestions are keyword/fixture-based, never presented as model reasoning. All frontend categories remain selectable. Corporate and Products are journey labels mapped to existing finance-business / beauty-skincare taxonomy. Gaming uses canonical game-launches-trailers. Live taxonomy freshness remains unverified.

Completed kits can be edited, assets managed, templates regenerated or opened in Ad Studio. Separate Default / My Brand Templates collections. Recipes preserve category/niche/goal/palette/type/asset context, four different compositions and formats. Approve/reject, customize, save, duplicate, archive/show archived, regenerate and use are local operations. Unapproved use is blocked. Existing approved recipes survive regeneration.

Five original systems: ZOE luxury physical-product illustration; NOVA ARENA neon gaming arena; NORTHLINE architectural corporate services; FORME garment/editorial fashion; AZURE STAYS coastal hospitality. Each supplies three relevant campaign types, category-specific asset roles, audience, direction, type/palette and CTA. No new global taxonomy was invented. Other categories use clearly generic art pending bespoke studies.

## Architecture and state

model.ts preserves version-1 session compatibility with optional brandLibrary, brandContext, brandTemplate and experience. roadmapModel.ts provides reversible editor snapshots, bounded versions, review proposals, variations, motion and delivery state. brandPrototypeModel.ts owns only demonstration kits/recipes and canonical taxonomy mapping. syncPreviewPatch distinguishes an explicit experience reset from simple headline/CTA edits, preventing cross-brand editor text leakage. Saved snapshots retain their brand and editor. Existing v1 saves reopen; malformed optional state falls back safely.

All persistence is sessionStorage under nxclip.ad-studio.ux-preview.v1, not account storage. A separate tab has an independent demonstration session. Reload restores creative/brand state but intentionally clears in-flight jobs, scheduled confirmation and pending approvals; it never resumes publishing. Browser storage limits display a warning. History is bounded, not a durable collaboration/audit ledger.

SceneStage displays existing AdSceneGraph text and asset layers. Advanced controls edit deterministic foreground/background, type, CTA, brand text, semantic layer order/visibility/locks and placement. This isolated inspector demonstrates future controls without modifying production Canvas.

## Demonstration assets

19 original local SVGs are enumerated with SHA256 in public/ad-studio/ux-preview/ASSET-MANIFEST.json. PROVENANCE.md distinguishes vectors from authentic assets. No W0A artwork/private ZoeArtisan source was copied. Product alpha is already transparent vector art, not segmentation. Collection repeats one product; zero verified variants. Fashion uses a garment illustration, no model.

## Intentional limitations and remaining gaps

- These are polished vector UX studies, not photographic advertisement-quality proof. Authentic logo, labels, model/pose, SKU bindings and approved reference fidelity remain unverified.
- Product lab offers trim/notes/review, not a segmentation brush engine. Real Mask V3 remains rejected; no real product processing.
- Director/DNA/quality proposals are deterministic. Full selective application across every DNA axis, automatic logo-clearspace checking and synchronized visual diff remain partial.
- Motion is silent CSS illustration playback with seek/loop/easing and editable marker/options. Per-property keyframes, decoded audio, lip sync, music/SFX playback and binary export are deferred.
- Provider video/image/inpainting, cost quotes/credit reservations, live storage ownership, connected publishing, real analytics and MP4/PNG/JPEG rendering are blocked/planned, not mocked as successful live operations.
- Ten default template family IDs are discoverable; exact approved-reference implementations for every family are deferred. Shared production templates remain unchanged.
- Prototype heading choices are limited to Inter, Playfair Display and Montserrat, matching the isolated inspector; the full production font catalog remains unchanged.
- No production acceptance or browser regression certification for account-backed Ad Studio is claimed. Owner visual review remains required.

## Review instructions

Open the URL above. Start with Create a guided Brand Kit; complete seven steps, review automatic templates, approve a recipe, use it, edit/save/version in Advanced Canvas, then Finished preview → Export & publish → Review delivery and recovery options. Simulate a failure/retry and schedule; no files or posts result. Use Category studies to compare all five systems. Explore the roadmap navigator for Director, product review, DNA/quality, adaptation and motion.

Evidence and repeatable checks: M2B-INTERACTION-COVERAGE.md. Full coverage: AD-STUDIO-COMPLETE-UX-COVERAGE.md. Do not infer production capability from a Prototype badge or simulation completion.
