# nxclip-web — change log, localhost QA & GCP readiness

**Repo:** `D:\nxclip-web` (separate from backend monorepo `D:\NxClip`)  
**Contracts:** Backend `docs/generated/frontend-integration-guide.md`, `api-reference.md`, `docs/frontend-alignment-plan.md`  
**Date:** 2026-07-26  

This document summarizes **frontend alignment work** already applied in this repo, what you can verify on **localhost**, what still depends on **GCP / backend ops**, and what is **still pending**.

---

## Console errors (localhost vs production gateway)

| Console message | Severity | Meaning |
|-----------------|----------|---------|
| `contentscript.js` / ObjectMultiplex | Ignore | Browser extension (e.g. wallet), not nxClip |
| React DevTools download | Ignore | Dev hint |
| `apple-mobile-web-app-capable` deprecated | Low | PWA meta; cosmetic |
| `beforeinstallprompt` | Ignore | PWA install banner suppressed on purpose |
| Socket to `api-gateway…/events` timeout | **Fixed** | Socket.IO is on **notification-service**, not gateway. Set `VITE_NOTIFICATION_WS_URL` |
| Pexels `/api/pexels/search` 500 | **Fixed** | Missing `PEXELS_API_KEY` now returns empty photos (marketing only) |
| `GET /users/me` 401 + refresh 500 | Session | Stale tokens in localStorage — log in again or clear site data |
| Circuit breaker OPEN | Cascade | Follows failed `/users/me` / refresh — clears after login |
| Vite `ws://localhost:24678` failed | Dev | HMR lost (server restart); refresh the page |

**Live WebSocket (GCP):**  
```bash
gcloud run services describe notification-service --region=us-central1 --format='value(status.url)'
```  
Put that origin in `.env` as `VITE_NOTIFICATION_WS_URL` (no `/events` suffix required).

---

## 1. How to run locally

```powershell
cd D:\nxclip-web
copy .env.example .env   # if needed
npm install --legacy-peer-deps
npm run dev
```

App: **http://localhost:3000**

Minimum `.env`:

```env
VITE_API_GATEWAY_URL=https://api-gateway-216098834386.us-central1.run.app
VITE_API_GATEWAY_URL_PRODUCTION=https://api-gateway-216098834386.us-central1.run.app
```

Optional:

```env
VITE_GOOGLE_CLIENT_ID=<same web client id as identity GOOGLE_OAUTH_CLIENT_ID>
GEMINI_API_KEY=...          # only for leftover local Express AI helpers
PEXELS_API_KEY=...
```

**CORS note:** Gateway `FRONTEND_URL` must allow `http://localhost:3000` for cookie auth, **or** use Bearer tokens from login JSON. After the FE is on Cloud Run, set backend `FRONTEND_URL` to that origin and redeploy gateway/identity.

Also added: `.npmrc` with `legacy-peer-deps=true` (React 19 vs `react-simple-maps`), and dependency `prop-types`.

---

## 2. Changes already made (this repo)

### 2.1 API client (`src/services/apiClient.ts`)

| Change | Detail |
|--------|--------|
| Follow / unfollow | `POST` / `DELETE` `/feed/users/{id}/follow` |
| Feed profile | `GET` `/feed/users/{id}/profile` |
| Google auth | `POST` `/auth/google` `{ idToken }` |
| Meme create | `POST` `/content/meme` |
| Regenerate | `POST` `/content/{id}/regenerate` (already present; wired in UI) |
| Upload PUT | `putToUploadUrl` + `uploadFile` — real binary PUT to signed URL |
| Feed list shape | Normalizes `{ items, nextCursor }` for Home / trending |
| Social stubs | `socialApi` for future `/social/*` (adapters still backend TBD) |
| Likes | Deprecated for product UX; prefer `platformStats` |

### 2.2 Auth & session

- Stopped forcing `onboardingCompleted: true` on login / profile sync (uses API values).
- Google Sign-In button (`GoogleSignInButton.tsx`) on Login + Signup (GIS → `/auth/google`).
- Register / login / refresh / verify-email paths unchanged at client level (gateway).

### 2.3 Home / Explore / engagement

- Home: `GET /feed` (self + following).
- Explore: `GET /feed/trending`.
- Product engagement UI uses **`platformStats`** (YT/IG/TikTok), not in-app like KPIs.
- Empty Explore is expected until Live verified social posts exist.

### 2.4 Profiles & public post

- `UserProfile` / `PublicPostView`: live APIs (identity + feed profile + content/feed item); follow/unfollow; removed picsum demos.

### 2.5 Creator Coach onboarding

- `/onboarding` driven by `/coach/onboarding/start|status|answer|generate-plan`.
- Socket.IO for `coach:token`, `coach:progress`, `onboarding:complete`.
- Completing plan refreshes `/auth/me` and navigates to dashboard / Image Studio.

### 2.6 Notifications

- Notifications page loads `GET /notifications`, mark-read via API.
- TopBar preview from API (mocks removed).
- Socket overlay for generation / moderation / onboarding events.

### 2.7 Image Studio & clips

- Meme mode → `POST /content/meme`.
- Draft regenerate → `POST /content/{id}/regenerate` when editing existing draft.
- Publish → listens for `content:moderation_complete` (not “instantly live”).
- Clip upload: real `upload-url` + binary PUT.

### 2.8 Content Library presentation

- Status-first card footer (no fake like counts).
- Thumbs via authenticated media / content media path helpers.

### 2.9 Backend monorepo (not this repo)

- SPA source removed from `NxClip`; contracts + [`docs/frontend-alignment-plan.md`](https://github.com/) live in backend docs only.
- Content-service build fix: export `ImageStudioAspectRatio` (needed for meme DTO / CI).

---

## 3. What you can test on localhost now

Assume gateway is reachable and CORS allows localhost (or Bearer auth).

| # | Flow | How to verify | Pass criteria |
|---|------|---------------|---------------|
| 1 | Health / API proxy | Network tab → `/api/gateway-proxy/...` | No CORS block; JSON from gateway |
| 2 | Register / login | Signup → Login | Tokens/cookies; redirect by onboarding flag |
| 3 | Email verify | Link / token flow if SMTP or dev token | `emailVerified` updates |
| 4 | Google Sign-In | Button on Login | Needs `VITE_GOOGLE_CLIENT_ID` + backend Google config |
| 5 | Coach onboarding | New user → `/onboarding` | Questions from backend; plan generates; `onboardingCompleted` |
| 6 | Image Studio generate | Create → Image | `POST /content/generate`; image via media URL |
| 7 | Meme mode | Mode = meme | `POST /content/meme` |
| 8 | Publish + moderation | Publish draft | Status `publishing` → WS/API → approved/rejected |
| 9 | Content Library | `/my-content` | Drafts / published with status badges |
| 10 | Home feed | `/feed` | Own published + followed users only |
| 11 | Explore | Explore tab | May be **empty** without Live social data — still 200 |
| 12 | Follow | User profile Follow | `POST/DELETE /feed/users/.../follow` |
| 13 | Notifications | `/notifications` + TopBar | List from API (may be empty); no hardcoded demos |
| 14 | Clip upload | `/create/clip` | Real PUT to signed URL (GCS CORS may block in browser — see §4) |
| 15 | Public post | `/p/:id` | Published content; `platformStats` if any |

**Expected empty / soft failures (not FE bugs):**

- Explore empty without social Live posts.
- `platformStats` empty without connected social + sync.
- Google button disabled without client id.
- Clip/browser upload fails if GCS bucket CORS does not allow `http://localhost:3000`.

---

## 4. What requires GCP / backend configuration

| Item | Why | Owner |
|------|-----|--------|
| Production api-gateway | FE talks only to gateway | Backend CD already |
| `FRONTEND_URL` on gateway + identity | CORS + verify-email links | Backend GitHub variable + redeploy |
| `GOOGLE_OAUTH_CLIENT_ID` + identity migration | Google Sign-In | Backend env + DB |
| GCS signed upload CORS | Browser `PUT` to signed URL | GCS bucket CORS for FE origins |
| Socket.IO to notifications | Live moderation / coach tokens | Notification Cloud Run + FE WS URL |
| Explore / `platformStats` data | Social OAuth + metrics sync | Backend still incremental |
| Custom domain for FE | Optional | GCP / DNS after FE Cloud Run |

Localhost can use the **already-deployed** gateway without deploying the SPA.

---

## 5. Still pending (explicit)

### P0 / product — pending or partial

| Item | Status |
|------|--------|
| **FE CI/CD → Cloud Run** | **Pending** — no Dockerfile / `.github/workflows` in this repo yet |
| Social connect UI (`/social/*`) | API stubs only; wait for real YT/IG/TikTok adapters |
| Full analytics page vs gateway | Still largely decorative / incomplete |
| Clip trim | Backend not implemented — skip |
| Meme `template` compositor mode | Backend incremental; FE uses AI/hybrid meme path |
| Deep cleanup of Firebase shim / DevSuite / mock API | Partial; not required for core gateway paths |
| CreatorCoach chat page | Prefer backend where possible; may still use local AI helpers in places |
| Remove unused Express Gemini paths as primary | Onboarding uses coach API; other screens may still call `/api/ai/*` |

### Phase E from backend plans (docs/plans)

- Social distribute adapters, metrics sync workers, privacy tier display polish — backend-led; FE can follow later.
- DB-backed coach question bank — backend plan; FE already consumes coach APIs (transparent if banks move to DB).

### Recommended next steps (order)

1. **Localhost QA** using §3 checklist.  
2. Fix any bugs found (this repo).  
3. **GCP FE deploy:** Dockerfile (Vite + Express `server.ts`), GitHub Actions → Artifact Registry → Cloud Run `nxclip-web`.  
4. Set backend `FRONTEND_URL` = FE Cloud Run URL; redeploy gateway.  
5. Then social hub UI when adapters leave `not_configured`.

Reference templates (Next.js-oriented — **adapt for Vite/Express**): backend monorepo `infrastructure/ci/frontend/` and `docs/FRONTEND-GCP-DEPLOYMENT.md`.

---

## 6. Architecture reminder

```text
Browser (localhost:3000 or Cloud Run nxclip-web)
   └── /api/gateway-proxy ──► api-gateway (GCP)
                                  ├── identity
                                  ├── content
                                  ├── feed (+ /social stubs)
                                  ├── ai (coach)
                                  ├── analytics
                                  └── notification (+ Socket.IO /events)
```

Do **not** call microservice Cloud Run URLs from the browser.

---

## 7. Change log (high level)

| When | What |
|------|------|
| 2026-07-26 | Repo split: FE = `nxclip-web`; backend monorepo SPA-free |
| 2026-07-26 | Contract alignment: follow paths, platformStats, Google, coach, notifications, meme/regenerate/upload, profiles |
| TBD | Cloud Run CI/CD for this repo |
| TBD | Social hub UI + analytics polish |

---

*Update this file when FE CD lands or when social adapters ship.*
