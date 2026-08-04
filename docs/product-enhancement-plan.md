# nxClip Product & Marketing Enhancement Plan

**Status:** Cycle 1 implemented — review Home v2 at `/home-2` (live `/` unchanged until swap)  
**Last updated:** 2026-07-30  
**Scope:** `nxclip-web` (FE) with existing BE where noted  

---

## 0. Delivery cycles (product journey)

### Cycle 1 — Core creator loop (this plan)

Close one complete journey:

**Onboarding → Image Studio (create) → Publish (Feed) → Social (go Live / follow) → Analytics (measure)**

Supporting surfaces in Cycle 1: **Creator Hub**, **Content Library**, **Dashboard** (ops snapshot), **Analytics** (measure), **Home v2** (marketing), **Feed** signatures/follow.

### Cycle 2 — Growth & engagement (next plan; out of Cycle 1 build)

- **Creator Coach (AI Coach)** — deepen strategy, week plans, guided growth (beyond Hub/Dashboard hooks).  
- **Battles** — competitive/community feature (nav label exists; full product later).

Cycle 2 starts only after Cycle 1 journey is reviewable end-to-end.

---

## 1. Goals (Cycle 1)

1. Stop showing the **same “recent content” story** on Creator Hub, Image Studio, Feed, and Content Library.  
2. Complete **follow / creator signatures** so social posts clearly belong to users.  
3. Ship a meaningful **Dashboard** (ops snapshot) and a wired **Analytics** page (measure after publish)—not mock KPIs.  
4. Make **Home v2** the marketing/CTA front door (Pexels photos + **videos** for clips), Create → Moderate → Publish story.  
5. Keep current `/` live; review on **`/home-2`** until swap approval.  
6. Deliver a **complete Cycle 1 journey** creators can walk without dead ends.

---

## 2. Principles

| Principle | Meaning |
|-----------|---------|
| One job per page | Each surface answers a different question |
| Same data, different view models | Prefer shared fetch + adapters over copy-paste grids |
| Social identity on social surfaces only | Library / Studio stay “my tools”; Feed / public profiles show creators |
| Marketing proof via visuals | Home sells outcomes you can *see*, not blue text boxes |
| Interim media → CMS later | Pexels **photos + videos** now; Admin-owned assets later via the same media interface |
| Parallel, then replace | Home v2 at `/home-2`; `/` unchanged until approval |
| Measure what you ship | After Publish/Social, Analytics must show **real** metrics (or honest zeros)—never fake i18n numbers |
| Cycle discipline | Coach deep-work + Battles wait for Cycle 2 |

---

## 3. Content surfaces — roles & changes

### 3.1 Role matrix (Cycle 1)

| Surface | Job | Shows | Does not show |
|---------|-----|--------|----------------|
| **Content Library** | System of record | All mine assets (drafts, refs, published, failed) | Discovery / social feed |
| **Image Studio → Recent Generations** | Workflow history | Last N studio generations for reuse / open | Full library |
| **Creator Hub** | Launchpad / next actions | Continue drafts, Ready to publish, week hooks, tool CTAs | Duplicate mini-Library |
| **Feed** | Social home | Published posts (self + following) + creator identity | Drafts / references |
| **Dashboard** | Ops snapshot *this week* | KPIs strip, pipeline, week plan, attention, link to Analytics | Full deep analytics tabs |
| **Analytics** | Performance deep-dive | Real summary metrics, trends, content/platform breakdowns as APIs allow | Fake placeholder KPIs |

### 3.2 Dashboard vs Analytics (clear split)

| | **Dashboard** | **Analytics** |
|--|---------------|---------------|
| Question | “What should I do / watch this week?” | “How did my content perform?” |
| Depth | Snapshot + pipeline + plan | Charts, ranges, breakdowns |
| CTA | Create, publish, fix attention, **Open Analytics** | Filter, export (later), drill into posts |

Dashboard must **not** duplicate the full Analytics tab suite; Analytics must **not** be empty fake numbers once the user has published content.

### 3.2 Creator Hub redesign (when approved)

Replace “Recent creations” grid that mirrors Library with:

1. **Continue** — unfinished drafts / processing (max ~4), CTA Resume  
2. **Ready to publish / go Live** — published on feed but not Live on social  
3. **This week** — 1–2 Coach/Dashboard plan hooks  
4. Link: **View all in Library**

Keep compact colored tool options (Image Studio / Clip / Meme) as-is or lightly refine.

### 3.3 Shared data approach (FE)

- Shared hook/cache for `getUserContentList` (e.g. `useMyContent`).
- View adapters: `toStudioHistory`, `toHubActions`, `toLibraryItem`, `toFeedPost`.
- Avoid divergent client-only filters drifting over time.

---

## 4. Follow, creator signatures & public identity

### 4.1 Current state (summary)

- **BE:** follow/unfollow + feed assembly (self + following) exists.  
- **FE:** follow on some cards/profiles; author name sometimes on Feed; avatar often missing on cards.  
- Own Profile follower/following counts are placeholders.

### 4.2 Target social flow (MVP)

1. **Discover** — Feed posts with clear creator chip.  
2. **Identity** — Avatar + display name + link to `/users/:id` on every non-own social post.  
3. **Follow** — Follow / Following toggle (optimistic) on card + profile.  
4. **Consume** — Home feed = self + following (already BE-backed).  
5. **Own graph** — Real follower/following counts + simple lists on Own Profile.

### 4.3 Signature rule

- **Social surfaces** (Feed, Post detail, Public post, User profile): always show `{avatar, displayName, userId}`.  
- Own posts: “You” + own avatar.  
- **Internal tools** (Library, Studio, Hub): no other-user attribution required.

### 4.4 Gaps to close (implementation backlog)

- Render avatar on Feed `PostCard`.  
- Follow/Following state + unfollow on Feed cards.  
- Wire Own Profile counts (and later lists).  
- Optional later: dedicated author-feed API instead of fragile public content filter.

---

## 5. Dashboard plan

### 5.1 Positioning

**“How is my creator business doing this week?”** — not another Recent grid.

### 5.2 MVP zones

| Zone | Purpose | Near-term data |
|------|---------|----------------|
| KPI strip | Reach, engagement, published, Live | Aggregate from mine + feed (patterns already on Feed) |
| Pipeline | Draft → Published → Scheduled → Live | Content statuses + social targets |
| Week plan | Coach plan | Profile week/onboarding plan (partially wired) |
| Needs attention | Failed gens, unfinished drafts, connect socials | Mine list + profile socials |
| Top content | Best performing | Platform stats when available |
| Quick actions | Create, Library, Coach, Connect | Links only |

### 5.3 Out of scope for Dashboard MVP

- Full Analytics tab suite (that belongs on **Analytics**).  
- Duplicating Library browser or Hub recent mosaics.

---

## 5A. Analytics page (Cycle 1 — journey completion)

### 5A.1 Why it belongs in Cycle 1

Without Analytics, the loop stops at Publish/Social: creators create and post but never **measure**. Cycle 1 explicitly ends at:

`Onboarding → Image Studio → Publish → Social → Analytics`

### 5A.2 Current state (audit)

| Piece | Status |
|-------|--------|
| Route `/analytics` + rich tab shell | Exists |
| Empty state when no content | Real (`getUserContentList`) |
| Overview KPIs / trends | **Fake** (i18n strings + random chart) |
| Content / Platforms / Geo / etc. | Mostly empty arrays or hardcoded |
| `analyticsApi` (`/analytics/metrics`, events, report) | **Defined in FE, not used by the page** |
| BE | Metrics summary + weekly report + event ingest; publish can enqueue `CONTENT_PUBLISHED` |
| Social platform rollups → Analytics | Not wired into Analytics UI |

### 5A.3 Analytics MVP (Cycle 1)

**Goal:** After a user creates and publishes, Overview shows **real** data from BE (or honest zeros)—never fake “482.5k”.

| Work | Detail |
|------|--------|
| Wire Overview | Call `analyticsApi.fetchSummaryMetrics` (+ optional `fetchLatestWeeklyReport`) |
| Date range | Pass 7D / 30D / 90D into API where BE supports; otherwise filter client-side or document limits |
| Replace mocks | Remove i18n fake KPI numbers from Overview once API is live |
| Empty vs zero | No content → keep EmptyState CTA to Studio; has content but no events → real zeros + “Publish to see growth” |
| Cross-links | From Analytics → Feed post / Library item where IDs exist |
| Dashboard link | Dashboard CTA “Open Analytics” |
| Tabs beyond Overview | **Phase Cycle 1b:** hide or mark “Coming soon” tabs that lack BE (Geo, Audience, Games, Retention, etc.) until APIs exist—avoid shipping fake pies |

### 5A.4 Cycle 1 journey checklist (product)

| Step | Surface | Cycle 1 done when |
|------|---------|-------------------|
| Onboard | `/onboarding` | Completes → Hub/Feed (existing) |
| Create | Image Studio / Hub | Can generate + see recent/history |
| Manage | Library | Can find drafts/published |
| Publish | Feed publish / status | Post appears on Feed |
| Social | Signatures + Follow + go Live CTAs | Identity + follow work; social publish path clear (UI or real) |
| Measure | **Analytics Overview** | Live metrics (or zeros) from API after publish |

### 5A.5 Explicitly Cycle 2 (not Cycle 1)

- Deep **Creator Coach** productization (beyond Hub/Dashboard plan hooks).  
- **Battles** feature build-out.  
- Advanced Analytics tabs that need new BE (geo heatmaps, audience DNA, retention cohorts, AI insight engine).

---

## 6. Home page liveliness (marketing)

### 6.1 Problems (current `/`)

- Home feels text-heavy / blue-toned.  
- Capability labels don’t show what nxClip *produces*.  
- How It Works is abstract (icons), not Create → Moderate → Publish.  
- CTAs are weak relative to the product surface area (Studio, Clips, Memes, Coach, Feed, Library).

### 6.2 North star for Home v2

**Home v2 is the marketing & conversion option** for nxClip: every section should make a visitor understand *what they get*, *how it works*, and *what to do next* (Sign up / Open Studio / Start free).

Interim media (Pexels photos **and videos**) is acceptable and expected. Visitors should still *feel* product truth through framing: aspect ratios, UI chrome, labels, and CTAs under the nxClip umbrella—not a raw stock dump.

Later, Admin CMS swaps the same slots for real nxClip outputs without redesigning the page.

### 6.3 Media strategy (locked for Home v2)

| Phase | Source |
|-------|--------|
| **Home v2 now** | Pexels **Photos** + Pexels **Videos** via proxy |
| **Later (P6)** | Admin / owned nxClip samples in the same slots |

**Implementation needs (P0):**

- Keep `/api/pexels/search` (photos).  
- **Add** `/api/pexels/videos` (Pexels Videos API) + `searchMarketingVideos()` in FE.  
- Abstraction: `lib/marketingMedia.ts`  
  - `type: "image" | "video"`  
  - `{ src, poster?, creditName, creditUrl, source: "pexels" | "cms" | "fallback" }`  
- Session cache + empty/fallback when `PEXELS_API_KEY` missing.  
- Always show **Via Pexels · photographer/videographer** credit on media.  
- Videos: `muted` `playsInline` `loop` `autoPlay` where allowed; pause off-screen; poster frame while loading.

**Media type by capability (locked):**

| Slot | Media | Why |
|------|--------|-----|
| Image Studio | Pexels **photo** (cinematic / digital art) | Still = generated image outcome |
| Meme Generator | Pexels **photo** (graphic / bold / caption-friendly) | Still + meme chrome (bars/caption) |
| **Viral Clips** | Pexels **video** (vertical/action preferred) | Motion = short-form clip promise |
| **Clip Editor** | Pexels **video** (gameplay / edit energy) | Motion = editor / trimmer promise |
| Creator Coach | Pexels **photo** (creator desk / planning) | Still + chat/plan UI mock overlay |
| Hero reel | Mix: 2–3 photos + **1–2 video** clips | Liveliness without only particles |
| Pipeline Create | Photo (create/workspace) | Story beat |
| Pipeline Moderate | Photo (review / check) | Story beat |
| Pipeline Publish | Photo or short video (share / phone / social) | Story beat |

---

## 6A. Home v2 — section-by-section lookbook (what looks like what)

> Goal: no ambiguity. Every block below is what `/home-2` should look and do.

### Global chrome

- Same Navbar / Footer as current Home (Sign in / Sign up / avatar menu when logged in).  
- Small sticky or top **“Preview · Home v2”** badge (review only; removed on swap to `/`).  
- Background: landing atmosphere, but **media-led**—less flat blue wash, more image/video planes.  
- Primary CTAs: **Get started** → `/signup` (logged out) or **Open Creator Hub** → `/create` (logged in).  
- Secondary CTAs: **Sign in**, deep-links into Studio / Clip / Coach / Feed.

### A. Hero — “See the product in 5 seconds”

**Look**

- Left/center: brand headline + one supporting line + CTA group (primary + secondary).  
- Dominant visual plane: **full-bleed or large framed media reel** (not particles-only).  
  - Crossfade / soft slide every ~4–5s across capability moments (image still → meme frame → **muted clip loop** → coach card).  
- Product chrome overlays on the reel: small chips like `Image` · `Meme` · `Clip` · `Coach`.  
- Trust strip under CTAs (reuse light TrustMetrics or condensed: “Create · Moderate · Publish”).

**CTAs**

- Primary: Get started / Open Hub  
- Secondary: Watch how it works (smooth scroll to pipeline)  
- Optional tertiary: View Feed (logged in) or Sign in  

**Media source:** Pexels photos + videos via `getHeroReelMedia()`.

---

### B. Trust metrics (keep, tighten)

**Look:** Compact row of 3–4 metrics (can stay i18n-driven). No large empty blue cards.  
**Job:** Credibility pause between Hero and Capabilities—not the visual star.

---

### C. Capabilities — “What nxClip can produce” (visual-first)

**Layout:** 2×2 on desktop (or 4-up on xl); stacked on mobile. Each tile is a **media card**, not an icon box.

#### C1. Image Studio

| | |
|--|--|
| **Visual** | Full-bleed Pexels **photo**; hover `scale-110` + dark fade (Create Hub language) |
| **Overlay** | Title “Image Studio”, one line, chip `AI Image` |
| **CTA** | Try Image Studio → `/create/image` (or login) |

#### C2. Meme Generator

| | |
|--|--|
| **Visual** | Pexels **photo** under **meme chrome** (top/bottom caption bars or punchline UI) so it reads as meme, not lifestyle stock |
| **Overlay** | Title “Meme Generator”, chip `Meme` |
| **CTA** | Make a meme → `/create/image?type=meme` |

#### C3. Viral Clips *(Pexels video — required)*

| | |
|--|--|
| **Visual** | **Muted looping Pexels video**, prefer portrait/9:16 crop in card; play affordance; optional fake social chrome (`0:12` · views) |
| **Overlay** | Title “Viral Clips”, chip `Short-form` |
| **CTA** | Explore clips → `/create/clip` or Feed |

#### C4. Clip Editor *(Pexels video — required)*

| | |
|--|--|
| **Visual** | **Muted looping Pexels video** with **editor chrome** (timeline scrub hint, cut markers, “Trim” pill)—clearly editing, not just watching |
| **Overlay** | Title “Clip Editor”, chip `Edit` |
| **CTA** | Open Clip Editor → `/create/clip` |

#### C5. Creator Coach

| | |
|--|--|
| **Visual** | Pexels **photo** + floating **coach UI mock** (message bubble + “Week plan” strip) |
| **Overlay** | Title “Creator Coach”, chip `Strategy` |
| **CTA** | Meet your Coach → `/coach` |

*(If 4-up is crowded, Coach can span or sit as a wide fifth band under the 2×2.)*

**Attribution:** Small “Photo/Video via Pexels · {name}” on each card.

---

### D. How it works — Create → Moderate → Publish (pipeline)

**Look:** Three storyboard panels connected by a line (desktop) / vertical steps (mobile). Each panel = media background + step number + title + one sentence + micro-CTA.

| Step | Title (copy direction) | Visual | Micro-CTA |
|------|------------------------|--------|-----------|
| **1. Create** | Generate images, memes, and clips with AI | Pexels photo (studio/create energy) | Start creating |
| **2. Moderate** | Safety & quality checks before it goes out | Pexels photo (review/check) | See Library |
| **3. Publish** | Post to Feed, then go Live on social | Pexels photo or short **video** (publish/share) | Go to Feed |

This must read as **nxClip’s real pipeline**, not generic “search → zap → rocket.”

---

### E. Platform umbrella strip (improve under full nxClip)

**Look:** Horizontal “Where it lives in the product” row—icons + one line each, not another media grid:

- Creator Hub · Content Library · Home Feed · Dashboard · Analytics · Coach  

**Job:** Connect marketing promise to app IA; CTAs deep-link (auth-aware).  
**Why:** Maximizes Home as the front door to the whole umbrella, not only Studio.

---

### F. Social proof / creator energy

Reuse/adapt Creator Spotlight + Testimonials, but:

- Prefer Pexels-backed portraits where Spotlight already does.  
- Keep quotes short; CTA “Join creators” → signup.

---

### G. Pricing → Final CTA

- Keep Pricing component; ensure primary plan CTA matches Hero (signup / upgrade).  
- Final CTA: full-width band with strong headline + dual buttons (Get started / Sign in) and optional subtle media wash behind (static Pexels, low opacity).

---

### H. Marketing & CTA rules (Home v2)

1. Every major section ends with **one clear action**.  
2. Logged-out → Signup primary; Sign in secondary.  
3. Logged-in → product deep-link primary (Hub / Studio / Clip / Coach / Feed).  
4. No dead “Learn more” without scroll or route.  
5. Prefer fewer, stronger CTAs over many weak links.

---

### 6.4 Home v2 page order (locked)

1. Preview badge  
2. Hero (media reel + CTAs)  
3. Trust metrics (compact)  
4. Capabilities (Image, Meme, **Viral Clips video**, **Clip Editor video**, Coach)  
5. Pipeline How-it-works (Create → Moderate → Publish)  
6. Platform umbrella strip  
7. Creator spotlight / testimonials  
8. Pricing  
9. Final CTA  
10. Footer  

*(ProductShowcase from v1 can be dropped or merged into Capabilities to avoid triple-repeating tools.)*

---

## 7. Parallel Home v2 (review track)

### 7.1 Why

Improve Home **without** risking the live landing page. Current `/` stays production; review layout on `/home-2`.

### 7.2 Delivery (after approval)

| Item | Detail |
|------|--------|
| Route | `/home-2` (public) |
| Code | `pages/HomeV2/` — does **not** replace `pages/Home/` |
| Shared | Navbar, Footer, Pricing, Testimonials patterns |
| New | HeroV2, CapabilitiesV2 (photo + **video** cards), PipelineHowItWorks, PlatformStrip, `marketingMedia.ts`, `/api/pexels/videos` |
| Badge | “Preview · Home v2” |
| Swap later | Point `/` → HomeV2 after your sign-off |

### 7.3 In scope for first Home v2 pass (maximize umbrella)

- Pexels photos + **Pexels videos for Viral Clips & Clip Editor** (and hero/pipeline where useful).  
- Visual capability cards + pipeline story.  
- Strong CTAs + auth-aware deep links across Hub / Studio / Clip / Meme / Coach / Feed / Library / Dashboard / **Analytics**.  
- Platform umbrella strip (includes Analytics).  
- Credits, cache, fallbacks.  

### 7.4 Explicit non-goals for first pass

- Auto-replacing `/`.  
- Admin CMS.  
- Claiming Pexels media was “generated by nxClip.”  
- Perfect pixel parity with future owned assets (slots stay; files change later).

---

## 8. Proposed build order (after approval)

### Cycle 1

| Phase | Workstream | Outcome |
|-------|------------|---------|
| **P0** | Home v2 (`/home-2`): Pexels photos + **videos**, capabilities, pipeline, umbrella CTAs | Review marketing/layout |
| **P1** | Creator Hub content role change | Stop duplicate recent content |
| **P2** | Feed signatures + Follow/Following | Social identity |
| **P3** | Own Profile follower/following counts | Graph feels real |
| **P4** | Dashboard MVP (snapshot + link to Analytics) | Ops page live |
| **P5** | **Analytics MVP** — wire Overview to `analyticsApi`; kill fake KPIs; honest empty/zero | Journey ends at Measure |
| **P6** | Home v2 → replace `/` after sign-off | Ship marketing upgrade |
| **P7** | Admin marketing media (replace Pexels) | Owned visuals |

**Recommended start: P0**, then P1–P5 to close the creator loop, then P6–P7.

### Cycle 2 (next plan — after Cycle 1 review)

| Phase | Workstream |
|-------|------------|
| **C2-P0** | Creator Coach depth (plans, guided flows, Hub/Dashboard integration) |
| **C2-P1** | Battles (product definition + MVP) |
| **C2-P2** | Advanced Analytics tabs as BE grows |

---

## 9. Success criteria (Cycle 1)

- Hub, Studio, Library, Feed each feel distinct.  
- Feed posts show who created them; follow works on primary paths.  
- Dashboard shows live snapshot metrics + clear path to Analytics.  
- **Analytics Overview uses real API data** (or zeros)—no fake marketing numbers after publish.  
- A creator can walk **Onboarding → Studio → Publish → Social → Analytics** without a dead end.  
- `/home-2` is clearly more visual than `/`; Pexels credited; `/` unchanged until swap.  
- Coach deep-work and Battles **not** required to call Cycle 1 done.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Pexels looks generic | Curated queries + product/meme/editor chrome + attribution |
| Video bandwidth / autoplay policies | Muted loops, posters, pause when off-screen |
| Missing `PEXELS_API_KEY` | Fallbacks so layout still reviewable |
| Duplicate content confusion | Role matrix; Hub = actions |
| Home v2 vs Home drift | Single `marketingMedia` module; swap checklist |
| Analytics tabs over-promise | Overview-first; hide/soon other tabs without BE |
| BE metrics thinner than UI | Align Overview to actual summary fields; extend BE later (Cycle 2) |
| Dashboard vs Analytics overlap | Snapshot vs deep-dive split (§3.2) |
| Social stats not in analytics yet | Cycle 1: in-app publish events + available metrics; social rollup later |

---

## 11. Approval checklist

Please confirm or adjust:

- [ ] **Cycle 1 journey:** Onboarding → Studio → Publish → Social → **Analytics**  
- [ ] **Cycle 2 later:** AI Coach depth + Battles  
- [ ] Role matrix including Dashboard vs Analytics split  
- [ ] Social MVP (signatures + follow + profile counts)  
- [ ] Dashboard MVP zones  
- [ ] **Analytics MVP** (wire Overview, no fake KPIs)  
- [ ] Home v2 lookbook + Pexels **videos** for Viral Clips + Clip Editor  
- [ ] Parallel **`/home-2`** first; keep **`/`** until swap  
- [ ] Build order **P0 → P7** (Cycle 1)

---

## 12. Next step after approval

1. Implement **P0: Home v2** (or your chosen first phase).  
2. Continue Cycle 1 through **P5 Analytics** so the measure step is real.  
3. Review full journey; then open Cycle 2 plan (Coach + Battles).

**No code changes under this plan until you approve this document.**
