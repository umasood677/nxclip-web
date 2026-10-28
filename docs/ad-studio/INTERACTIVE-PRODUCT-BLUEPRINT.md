# Interactive Ad Studio Product Blueprint

2026-10-26. Frontend-only milestone. Review at **http://localhost:3000/create/ad/ux-preview**. No login is required for public synthetic fixtures. An authenticated owner can also choose **Ad Studio → Explore Future Experience** above the existing Home hero.

Route and entry are DEV-only. Existing private routes remain authenticated; no production guard is bypassed. Real projects, Canvas and Brand Kit APIs are not mounted by the prototype.

## Complete screen inventory

| Screen | Query value | Interaction |
|---|---|---|
| Experience Home | home | Prompt / Example / Template entry |
| Campaign brief | brief | Idea, objective, audience, direction, brand, format |
| Visual templates | templates | Four visual directions |
| Template preview | template | Inspect and apply brand/assets |
| Brand and assets | assets | Demo/default brand, product selection, failure fixture |
| Progress | progress | Timed simulation, cancel, error/retry |
| Concept Gallery | concepts | Inspect concepts or compare |
| Concept detail | detail | Rationale, retained brief, use concept |
| Comparison | compare | Compare and select direction |
| Finished ad | preview | Edit/save/variations/formats/export/workspace |
| Local inspector | edit | Headline, CTA, format and layer inventory |
| Variations | variations | Empty state, simulation, gallery |
| Campaign workspace | workspace | Session gallery, saved creative reopen |
| Adapt formats | formats | Portrait4:5, square1:1, story9:16 |
| Export/publishing | export | PNG/JPEG simulation, scheduling |
| Intelligence | performance | Illustrative metrics and prewritten next step |

## Flow map

~~~mermaid
flowchart TD
 Home --> PromptBrief
 Home --> ExampleBrief
 Home --> Templates
 Templates --> TemplatePreview
 PromptBrief --> Assets
 ExampleBrief --> Assets
 TemplatePreview --> Assets
 Assets --> SimulatedProgress
 SimulatedProgress -->|Prompt or Template| FinishedAd
 SimulatedProgress -->|Example| Concepts
 SimulatedProgress -->|Fixture error| Retry
 Retry --> Assets
 Concepts --> Detail
 Concepts --> Compare
 Detail --> Compare
 Compare --> FinishedAd
 Detail --> FinishedAd
 FinishedAd --> Inspector
 Inspector --> FinishedAd
 FinishedAd --> Variations
 Variations --> Detail
 FinishedAd --> Formats
 Formats --> FinishedAd
 Formats --> Export
 FinishedAd --> Export
 FinishedAd --> SessionSave
 SessionSave --> Workspace
 Workspace --> FinishedAd
 Workspace --> PromptBrief
 Export --> Intelligence
 Intelligence --> Detail
~~~

## Reuse, state and isolation

Reused unchanged: SceneStage, AdSceneGraph/layer contracts, sanitization, asset URL resolution, font catalog/styles, router/loading fallback, Lucide and Ad Studio graphite/border/serif design patterns.

Prototype-only gallery, brief and inspector controls use a single reducer and versioned sessionStorage namespace: nxclip.ad-studio.ux-preview.v1. Back/Forward use query navigation without resetting brand, brief, concept, format or creative. Session saves restore on reload. Export/scheduling notices are transient. Invalid state is rejected; unavailable storage has visible feedback. Reset affects only this namespace.

No persistence/Brand Kit/AI clients, fetch, Axios, Firebase, WebSocket or beacon transport in the prototype modules. Original artwork is local. Existing app bootstrap retains its behavior; a full app-wide network trace was not captured. No backend changes, services restarted, migrations, paid calls, private asset processing or real campaign writes.

The inspector is a local text-editing prototype using the existing renderer, not a second production Canvas. The production editor and API-bound components remain unchanged.

## Assets and quality limitations

Four new hand-authored SVGs: Cinematic Luxury (garnet/sculptural), Editorial Beauty (paper/architecture), Product Spotlight (gold/charcoal), Collection Campaign (same product repeated). Manifest and rights/provenance: public/ad-studio/ux-preview/ASSET-MANIFEST.json and PROVENANCE.md.

No private photo, logo, model, W7-only artwork or verified variant was used. ZOE / ATELIER is editable demonstration typography, not an authenticated logo. Colors/fonts are illustrative choices. Existing local font declarations/catalog/licenses are reused. Older W0A assets remain untouched.

Vector art is not product photography or reference-fidelity evidence. Format reframing is not production-safe adaptation. Export produces no image file; scheduling publishes nothing. Metrics/insights are fixtures. Live generation, isolation, export parity and platform connections remain future implementation.

## Source changes and preservation

New: src/pages/AdStudio/uxPreview/{AdStudioUXPreview.tsx,model.ts,model.spec.ts,preview.css}; public/ad-studio/ux-preview/{cinematic.svg,editorial.svg,spotlight.svg,collection.svg,ASSET-MANIFEST.json,PROVENANCE.md}; this report and INTERACTION-COVERAGE.md.

Existing changes are limited to a lazy import/DEV route in src/App.tsx and Link import/DEV entry in AdStudioHome.tsx. Both files were already dirty. Pre-task bytes are in .tmp/ad-studio-ux-preview/before; their full Git diffs include earlier work. No commit/push.

## Verification and owner review

48 tests passed (11 new plus existing workspace, sceneGraph and conceptVisual tests). New-directory ESLint passed. Full TypeScript retains42 baseline diagnostics, final42, zero new normalized identities and zero preview diagnostics. Exact before/final outputs retained; baseline failures not fixed.

Assisted browser tests cover all three entries to finished preview and shared inspector/save/reload/comparison/variation/format/export/scheduling/intelligence/Back/error-retry interactions. Actual screenshot widths1440/768/390; tablet/mobile page scroll width equaled viewport width. No console errors observed. Production Home entry verified in source, not clicked through an owner login. Existing route declarations tested; production browser acceptance not re-certified.

Evidence: .tmp/ad-studio-ux-preview/{tests.txt,tsc-before.txt,tsc-final.txt,verification.json,screenshots/}. Screenshots are actual browser captures.

Owner: explore each Home journey, edit the brief, compare/select concepts, edit headline/CTA, save/reopen, adapt formats and inspect simulated export/intelligence. Assets has a recoverable-error checkbox. Reset demo starts clean without touching projects. This is a design review, not live AI/publishing/export acceptance.
