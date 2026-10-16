# Static Ad Studio UX — Phase 3F

**Status:** 3F-A documented · 3F-B + **3F-C** implemented (uncommitted)  
**Frontend:** `D:/nxclip-web` · **Backend:** unchanged Phase 3 contracts  
**Scope stop:** After 3F-C. 3F-D–E deferred.

## Milestone map

| ID | Deliverable | Status |
|----|-------------|--------|
| **3F-A** | Audit + architecture | Done |
| **3F-B** | Premium home + guided brief + live sample preview | Done |
| **3F-C** | Brand Kit cards + visual concept gallery | Done |
| 3F-D | Editor / variations / export polish | Deferred |
| 3F-E | Responsive hardening + acceptance | Deferred |

## 3F-C behavior

### Brand Kit
- Visual picker cards: Neutral, logo/initials, palette dots, edit affordance
- Create / edit via existing `CreateBrandKitDialog` + `brandApi` (no duplicate system)
- Auto-select after create/update; live brief preview updates from selected kit
- Loading / error / empty states retained

### Concept gallery
- Visual cards with aspect-aware **preview mockups** derived from concept composition + colors + brand
- Distinct layouts (`centered-hero`, `bottom-stack`, `left-editorial`, `top-banner`, `diagonal-luxury`)
- Actions: select, details dialog, create editable creative, regenerate (explicit), optional AI background
- Real image shown when `imageBase64` returns from existing generate-image path; otherwise labeled mockup (**Not AI image**)
- No auto-regenerate on brief visual tweaks

### ZoeArtisan scenario
- Template **ZoeArtisan Lipstick** seeds portrait 4:5 luxury brief
- Mockups use concept `colorRecommendations` / Brand Kit reds & darks when present
- Does not invent Zoe photography; product images only via authorized generate-image / brand assets

## Files (3F-C)

| Path | Role |
|------|------|
| `components/BrandKitPicker.tsx` | Visual Brand Kit selection |
| `components/ConceptMockup.tsx` | Aspect-aware concept preview |
| `components/ConceptGallery.tsx` | Gallery + details + actions |
| `lib/conceptVisual.ts` (+ `.spec.ts`) | Layout/palette resolution |
| `lib/exampleCreatives.ts` | + ZoeArtisan template |
| `CreateBrandKitDialog.tsx` | Edit mode via `initialKit` |
| `AdStudio.tsx` / `GuidedBriefComposer` / `AdStudioHome` | Wiring |

## Known limitations

- Concept mockups are deterministic CSS compositions — not provider renders
- Signed logo `readUrl` depends on backend returning asset URLs
- Editor / variations / export polish still 3F-D
