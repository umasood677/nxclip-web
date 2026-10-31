# Brand asset 429 correction — 2026-10-31

## Evidence and scope

Owner response correlation trace_gateway_auto_1793424231271_wyvtzc is HTTP 429 for GET /brands/:brandId/assets/:assetId/media. This is NOT the response from GET /brands/:brandId/templates/drafts. The earlier drafts HTTP 400 remains unclassified pending its actual Response JSON; do not claim it is fixed by this correction.

The existing Gateway rate classifier categorized all /brands paths containing /assets as uploads, including image GETs. Default configuration has 20 upload requests per minute versus the existing media bucket's 400 per minute; actual runtime overrides were not changed. Brand Template library and nested AI workspace independently hydrate the same private Brand Kit assets. The old hook fetched again for new Brand Kit object references and exposed raw protected URLs while loading/after errors, permitting extra unauthenticated img requests.

## Corrected source

- GET/HEAD exact Brand Kit asset-media and generated-ad asset-media endpoints now use the existing bounded media category. Authentication/public-route rules, upload/generation limits, bucket keys and configuration are unchanged. No limit is disabled or raised.
- Existing Brand Kit hydration shares in-flight reads and short-lived image bytes across consumers. Cache is memory-only, scoped to access token and Gateway, valid for 30 seconds, bounded to 24 settled entries/32 MiB. Each consumer retains its own revocable blob URLs. Cache clears on logout and does not reuse another token/Gateway scope.
- Equivalent Brand Kit payloads do not trigger another hydration effect. Authentication changes invalidate displayed private URLs. Failed or pending protected URLs are omitted, rather than offered to img without authorization. Public/signed image behavior remains unchanged.
- 429 failures are held for a 60-second cooldown; other failures for five seconds. There are no scheduled or automatic retries. A subsequent explicit load after expiry may retry; no AI/provider request is involved. Canonical same-origin proxy fetches use Bearer headers and redirect:error, never tokens in URLs or arbitrary-origin credential forwarding.

## Verification

- Gateway route/middleware regression tests: 17 passed. Includes protected media classification, GET/HEAD/trailing slash, unchanged write/generation limits and continued enforcement of media capacity.
- Gateway strict Nx build passed; active process was not restarted.
- Frontend secure-media, loader, asset-map and template-entry tests: 21 passed. Includes concurrent/remount de-duplication, auth/Gateway isolation, canonical URLs/headers, rate-limit cooldown without retries, MIME/body rejection, expiry and bounded cache.
- Frontend lint passed. Exact TypeScript comparison and approved prototype hash result recorded in .tmp/brand-media-429-diagnostics.json and the task completion report.
- No paid calls, database mutations, schema changes, environment/flag changes, service restarts or token extraction.

## Runtime and next action

Health reads returned 200 for Content5102/providerAI5114/Gateway5100/frontend3000. Active Content registry and receipt agree on PID15332 and release 2026-10-30T10-43-02-505Z-eac44d; its artifact and startup log contain the drafts route. A blanket stale-Content diagnosis is unsupported.

Gateway PID29556 is a node.exe process launched with the relative command node dist/apps/api-gateway/src/main.js. Working directory and original environment still need verified preservation before any approved Gateway-only restart. The Ad Studio launcher manages Content/providerAI, not Gateway; do not use it to activate this Gateway fix, terminate a guessed PID, or restart unrelated services. No Gateway restart is authorized or performed here. Browser/authenticated runtime verification of the correction remains pending activation. Keep the drafts 400 investigation separate and request only its sanitized Response JSON; owner need not run another paid generation to obtain it.
