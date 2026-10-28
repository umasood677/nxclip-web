# UAT feedback corrections — 2026-10-28

Scope: owner JSON feedback plus Home/header follow-ups. Existing projects, Brand Kit IDs, asset ownership, permissions and prototype files retained. No project/creative writes, migrations, paid calls, service restarts or environment/feature-flag edits performed by this correction pass.

| Feedback | Correction | Verification / remaining gate |
|---|---|---|
| Home / UAT-01 | Removed extra navigation, flashing loader text and awkward Recent projects sentence. Hero order is heading, single-line tagline, Brand Kit + Create project. Unboxed actions, spacing, clearer imagery. | Browser verified at 384x668. Keyboard focus outline remains. |
| Brand selector clipping | Align menu within viewport, flip above near mobile bottom navigation, bound height, reposition on scroll/resize. Default Brand label replaces Neutral. | Browser: menu left 32, right 272, top 301.8, bottom 451.5 in 384x668 viewport; clears bottom navigation. Placement tests. |
| Catalog / UAT-01,03,04 | Home shows up to six templates/briefs; All Templates / All Example Briefs open complete libraries. Branded Home reads actual saved native recipes. Professional setup/service states replace raw error as primary UI. | Live template API is still gated until owner activation below; no fake templates substituted. |
| Project entry / UAT-02 | Brand Kit can be explicitly changed, owned detail refreshed and readiness rechecked without losing typed name/idea. Required authorized product/model sources block template project creation before a write. | Synthetic tests; no owner project created. Persisted project Brand Kit locks unchanged. |
| Working Brief / UAT-02 | Cohesive campaign navigation, current Brand Kit context, visual Example Brief cards, CTA suggestions with custom text. | Browser/source verification; user saves not executed. |
| Assets/readiness / UAT-05 | Authenticated thumbnails, uploaded vs approved source explanation, separate human-likeness permissions, readable readiness cards. Removed legacy generation escape. | Six existing ZoeArtisan assets decoded in browser. Presence does not verify product variants or model rights. |
| Concepts / UAT-07,08,09 | Modern workspace invokes existing save-then-generate controller. Failed save prevents request; failure retains brief; only success navigates. Compare requires two selected directions and explains the interaction. | Existing mocked workspace regression tests; no provider call or real concept generation performed. |
| Brand review/export / UAT-35,38 | One saved-version brochure with profile, palette, type, complete voice/guidelines and asset previews. Explicit PDF/PNG/JSON exports disabled for dirty drafts. Collapsed dated version history; Save Brand Kit clearly means persistent save. | Brochure browser-rendered. PDF action exercised, but downloaded file/visual PDF QA not verified. PNG download remains owner UAT. PDF uses a portable font fallback. No advertisement or asset approval inferred. |
| Voice/guidelines / UAT-38,40 | Styled detailed forms, label associations, category/niche-specific deterministic starter replaces hardcoded luxury beauty sample. One freeform guidelines editor. | Round-trip, starter and approval tests. Category remains the owner's saved choice; never silently inferred or rewritten. |
| JSON / UAT-41 | Wider responsive dialog, readable colored sample, copy/download sample, explicit import/validation/draft/save steps. | Existing portable contract tests; no private import/save executed. |
| Default Brand / UAT-42 | Expanded reproducible isolation instructions in on-screen checklist. | Scope tests; owner feedback is preserved and not marked accepted automatically. |

## Tests and preservation

- Focused frontend suite: 76 tests passed.
- Launcher safety suite: 21 synthetic tests.
- Exact TypeScript comparison: known baseline 42; current 38; zero added diagnostics in verified comparison. Baseline errors are not fixed or hidden.
- Scoped ESLint checks; approved 34-file prototype hash check unchanged.
- Browser verification is read-only apart from local UI selection/navigation and explicit local brochure export action. No live image/video generation or production acceptance claimed.

## Activation needed for native templates

Prepared Content release: `2026-10-28T18-26-44-754Z-5bfb3c`, profile `NativeTemplates`. Builds, JWT, local database identity, existing table and startup safety probes passed. Active runtime is unchanged. This profile enables editable native templates without enabling Google generation; it does not restart heuristic AI.

In the owner's verified PowerShell session:

```powershell
$launcher = 'D:\NxClip-W8-Integration\tools\ad-studio-local.ps1'
& $launcher -Action Verify -Profile NativeTemplates -Service content
& $launcher -Action Preflight -Profile NativeTemplates -Service content -AcceptSafetyFallback
# Owner-authorized Content-only activation:
& $launcher -Action Restart -Profile NativeTemplates -Service content -OwnerApproved -AcceptSafetyFallback
```

Stop on any guard failure. Do not delete receipts, change permissions or manually terminate unknown processes. If preparation is stale, run Prepare with the same profile/service before Verify. See the backend local-development runbook for guarded rollback.

In the original frontend terminal, after choosing to activate native template UI, Ctrl+C only that frontend, then:

```powershell
Set-Location 'D:\NxClip-Web-W8-Integration'
$env:VITE_AD_STUDIO_BRAND_TEMPLATES_ENABLED='true'
npm run dev
```

This is the existing `tsx server.ts` frontend, not raw Vite. Do not restart Gateway, Identity, heuristic/regular AI or Media Worker. No database migration is needed for this profile.

## Owner retest order

1. Refresh http://localhost:3000/create/ad; check heading, tagline, actions and full picker visibility.
2. Open the existing ZoeArtisan Brand Kit. Review its saved profile/category, six assets, voice, guidelines and brochure. Use only genuine product descriptions; written shade names are not verified inventory.
3. Review source permissions; human model use still needs its own approved consent profile. Save only intended edits.
4. After template activation, open Template Studio from Ready. Prepare native candidates. Review blockers, customize, explicitly approve then save selected recipes. Do not approve a blocked model recipe.
5. Return Home with ZoeArtisan selected. Only its approved saved recipes should appear; Default Brand must show no ZoeArtisan templates or projects.
6. Create a disposable campaign through a template or Example Brief. Save/reopen Working Brief; check its Brand Kit, asset thumbnails and readiness. Generate concepts only when intentionally testing the configured provider.
7. Select two actual concepts for comparison, create an editable creative, save/reopen Canvas and export. Those mutation/creative-quality checks remain owner UAT, not a claim from unit tests.
8. Record feedback at http://localhost:3000/create/ad/uat using stable UAT IDs; export the feedback JSON.

Remaining gates: guarded runtime activation, real template persistence/reuse and owner save/reopen/export testing; live Google creative quality and Golden Ad acceptance remain unverified. No full-commercial-readiness claim.
