# Deploy nxclip-web to Google Cloud Run

Vite + React SPA with the Express server in `server.ts`. CD mirrors the backend monorepo: Artifact Registry `nxclip-services` → Cloud Run `nxclip-web` in `us-central1`.

The browser must call **api-gateway only**. Do not point `VITE_API_GATEWAY_URL` at identity/content/feed Cloud Run URLs.

## 1. GitHub (this repo: `umasood677/nxclip-web`)

**Settings → Secrets and variables → Actions**

| Name | Type | Required | Value |
|------|------|----------|--------|
| `GCP_PROJECT_ID` | Secret | Yes | `nxclip-500511` (same project as backend) |
| `GCP_SA_KEY` | Secret | Yes | Same deployer service-account JSON as backend CD |
| `GEMINI_API_KEY` | Secret | No | Runtime key for `/api/ai/*` on the Express server |
| `VITE_API_GATEWAY_URL` | Variable | Yes | `https://api-gateway-216098834386.us-central1.run.app` (no trailing slash) |
| `VITE_NOTIFICATION_WS_URL` | Variable | No | `notification-service` Cloud Run origin (Socket.IO, not the gateway) |
| `VITE_GOOGLE_CLIENT_ID` | Variable | No | Google Sign-In web client ID |
| `CLOUD_RUN_SERVICE` | Variable | No | Defaults to `nxclip-web` |

Reuse `GCP_SA_KEY` from the backend repo (`NxClip`). That SA already pushes to Artifact Registry and deploys Cloud Run.

## 2. Ship it

Push to `master` (or run **Actions → Frontend GCP Continuous Deployment → Run workflow**).

First deploy prints the service URL in the job summary, like:

`https://nxclip-web-xxxxx.us-central1.run.app`

## 3. After the first URL exists

1. **Backend repo** (`NxClip`) → Actions variable or secret `FRONTEND_URL` = that origin (no trailing slash). Redeploy backend (or at least `api-gateway` + `identity-service`) so CORS and verification emails match.
2. **Google Cloud Console → APIs & Services → Credentials** → the OAuth Web client: add the Cloud Run origin under **Authorized JavaScript origins** (and redirect URIs if you use them).
3. **GCS bucket CORS**: allow `PUT` from the new origin (same policy you already have for localhost).
4. Open `{FRONTEND_URL}/health` — expect `{ "status": "ok", "env": "production" }`.

## Local against prod gateway

```
VITE_API_GATEWAY_URL=https://api-gateway-216098834386.us-central1.run.app
```

Cookies only work if gateway `FRONTEND_URL` includes `http://localhost:3000`.
