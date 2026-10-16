# Phase 3F-E — Acceptance & release readiness report

**Status:** 3F-E complete (uncommitted hardening) · **STOP** — no commit/push/deploy without approval  
**Primary scenario:** ZoeArtisan Signature Red Matte Lipstick  
**Paid AI:** Not executed in this phase (manual/approved credits required)

## Recommended release decision

**CONDITIONAL GO** for Static Ad Studio + Brand Kit Studio after:

1. Commit/review uncommitted 3F-D/E FE + `CONTENT_SKIP_MIGRATIONS` BE change  
2. Confirm prod/staging `schema_migrations` has **014 + 015**, not **016** (or skip 016 via env)  
3. Manual ZoeArtisan E2E with approved AI credits  
4. GCS CORS smoke (brand asset PUT)  

**Do not ship** Animated Ad Studio (4A/4B) in this train.

---

## Pass / fail matrix

Legend: **A** = automated · **M** = manual · **B** = blocked · **N** = not tested this phase

| Area | Result | How |
|------|--------|-----|
| Brand Kit CRUD | **A pass** (prior BK) + **N** live UI | Unit/portable specs historically green; live CRUD needs staging |
| JSON import/export | **A pass** (portable specs) | `brandKitPortable` / FE portable tests |
| Asset upload | **N** | Requires GCS + auth session |
| Brand Kit selection (Ad Studio) | **A pass** (code) / **N** visual | Shared picker + seedBrief |
| Guided brief | **A pass** (brandContext) / **N** UI | |
| Concept generation | **N** (paid) | Explicit user action only; do not auto-run |
| Concept → creative | **A pass** | BE `concept-to-scene` + service specs |
| Canvas editing | **A pass** | align / brandSnapshot / sceneGraph specs |
| Autosave / reopen | **A pass** (code paths) / **N** live 409 | Conflict toast + reload wired |
| Variations | **A pass** | BE create-variations; FE thumbnails/compare |
| Export | **A pass** (preflight) / **N** binary decode | Placeholder gate + polling; file inspect needs staging |
| Responsive | **M code review** / **N** device lab | Breakpoints hardened; no browser matrix run here |
| Security ownership | **A pass** | `ad-studio.security.spec` + brand ownership unit tests |
| Version history UI | **A wired** / **N** live | Lightweight History panel → existing APIs |
| Clip Studio regression | **N** this phase | Preserve unrelated changes; no Clip edits in 3F-E |

---

## Responsive acceptance (code-level)

| Width | Layout intent | Status |
|-------|---------------|--------|
| 1440 / 1280 | 3-column editor (layers · canvas · tabs) | Implemented (`lg:`) |
| 768 / 390 | Mobile tab strip (canvas/layers/props/brand/vars/export/history) | Implemented; **device lab N** |
| Home / Brand Kits | Full-width CTAs on xs; horizontal kit snap scroll | Overflow guards added |

**Deferred:** full device-lab screenshots; data-router `useBlocker` for browser Back (BrowserRouter limitation — in-app Projects confirm + `beforeunload` only).

---

## ZoeArtisan E2E (manual checklist)

Use staging + approved provider credits. Do **not** automate paid calls.

1. [ ] Import Brand Kit JSON / ZoeArtisan template  
2. [ ] Upload logo, model, lipstick assets  
3. [ ] Save + reopen Brand Kit  
4. [ ] Ad Studio project · select ZoeArtisan · Signature Red brief · 4:5  
5. [ ] Explicitly generate concepts  
6. [ ] Convert → edit headline “A RED THAT SPEAKS.” · CTA “Discover Signature Red.”  
7. [ ] Save + reopen creative · verify brand snapshot  
8. [ ] Generate variations · compare · edit one  
9. [ ] Export PNG/JPEG · verify dimensions/aspect · inspect files  
10. [ ] Confirm missing-asset export is **blocked** unless “Allow placeholders”  

**Additional brands (manual):** Vortex Play · Aurelia Skin · FlowPay · Neutral — palette/typography/snapshot.

---

## Export quality gates

| Gate | Behavior |
|------|----------|
| GROUP layers | Blocking |
| Missing logo / non-bg image | **Blocking** unless Allow placeholders |
| Empty Background image layer | Soft note (color fill OK) |
| Unknown fonts / shadows | Soft notes |
| Preview vs render | Explicit non-parity disclaimer (SceneThumb ≠ PNG) |

Server still draws slate placeholders if placeholders are allowed — documented limitation.

---

## Known limitations

- Browser **Back** without confirm (needs data router for `useBlocker`)  
- Server export does not hard-fail missing assets (FE gate required)  
- Brand Kit display fonts may not match server allowlist  
- SceneThumb / editor canvas are CSS approximations  
- 016 present in repo — must skip or approve before content deploy  
- No automated paid concept/image tests  

## Remaining defects / post-release

- Device-lab responsive sign-off  
- Optional BE hard-fail on missing logo assets  
- Full version timeline UX (diffing)  
- Router migration for `useBlocker`  
- Phase 4A/B gated separately  

---

## Automated commands (exact exit codes)

| Command | Exit |
|---------|------|
| `npx tsx --test` Ad Studio + brandContext specs (14 tests) | **0** |
| `nx test content-service --testPathPattern=ad-studio.security\|create-variations\|brand.service.spec\|brand-role-palette` (17 tests) | **0** |
| `npm run build` (nxclip-web) | **0** |
| `nx build content-service` | **0** |

Screenshots: not captured (no browser E2E this phase).
