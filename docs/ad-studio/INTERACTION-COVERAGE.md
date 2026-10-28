# Interaction coverage — 2026-10-26

| Area | Actual browser result |
|---|---|
| Prompt | Home → brief edit → assets → progress → finished preview: PASS |
| Example | Home Example → brief → assets → concepts → Editorial detail → preview: PASS |
| Template | Templates → Product Spotlight → assets → assembly → preview: PASS |
| Inspector | Headline edited to “A signature worth keeping.”: PASS |
| Save/reload | Workspace showed edited demo-creative-1 after refresh: PASS |
| Brief continuity | Edited direction visible in later Example detail: PASS |
| Variations | Empty → simulate → four cards: PASS |
| Comparison | Collection selection → matching preview: PASS |
| Format | Story selection carried to export: PASS |
| Export/scheduling | Explicit simulated completion, no file/publishing claim: PASS |
| Intelligence | Fixture metrics, zero live connections, prewritten suggestion: PASS |
| Error/retry | Deliberate error → retained template/assets → retry → preview: PASS |
| Back | Format/export/scheduling completion retained: PASS |
| Responsive | Actual1440/768/390 captures; measured tablet/mobile no page overflow |
| Isolation | Source/tests reject API/network transports in new modules; no full app network trace |
| Routes | Existing route declarations preserved; DEV-only exact preview route added |
| Production Home entry | Source verified; live authenticated click not exercised |
| Real AI/export/persistence | Intentionally absent; no production PASS claim |

Shared inspector/export actions exercised once across the common pipeline, not repeated for every entry. Every primary CTA has navigation or explicit local simulation. This is assisted browser evidence, not a committed browser-test suite.

Automated command:
node --import tsx --test src/pages/AdStudio/uxPreview/model.spec.ts src/pages/AdStudio/lib/projectWorkspace.spec.ts src/pages/AdStudio/lib/sceneGraph.spec.ts src/pages/AdStudio/lib/conceptVisual.spec.ts

48 passed. Targeted lint passed. Full TypeScript retains42 baseline diagnostics, zero new normalized identities. No unrelated fixes.

Actual screenshots: .tmp/ad-studio-ux-preview/screenshots/ad-studio-preview-{home-desktop,desktop,tablet,mobile}.png.
