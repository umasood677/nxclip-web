# Google-credit-preserving beta integration — 2026-10-28

This policy supersedes the earlier requirement for commercial per-generation quotations as a beta prerequisite. Development uses mocked Google transports and synthetic/recorded fixtures. No live image/video/variation/refinement calls, load tests or provider retries were performed. An essential developer smoke test requires separate owner approval and is limited to one image request. Full provider execution and creative-quality review are reserved for owner UAT.

## Implemented source

- Existing image, Creative Director concept and Brand Analysis routes now support beta execution without dollar limits or known price metadata. Their existing `/quote` endpoints remain backward-compatible but serve as non-billable source/model preflights. UI dollar-entry/quotation requirements are removed. Optional legacy cost caps still work for callers that explicitly supply them; they are not required for beta.
- Source/version/model binding, explicit one-request UAT consent, durable request IDs, exact-model routing, retained status/recovery, no hidden fallback and no automatic paid retry remain. Existing feature gates stay off.
- Image usage and concept/analysis token counts are recorded in existing private job results. Unknown prices remain null, never a fabricated zero charge. No wallet, billing, credit reservation, new commercial pricing subsystem or migration is introduced.
- Existing job claims now serialize Ad Studio account claims using a transaction-scoped PostgreSQL advisory lock and permit at most one queued/processing image/concept/analysis request per owner. Other job types remain on their existing path. Completed duplicate IDs can still recover their result; a different active request blocks new provider execution. This is mock-transaction verified, not live database concurrency acceptance. A crashed/stale active job requires status/manual review; it is not automatically replayed.
- Product-aware scene planning uses owner-resolved Brand Kit product photographs already bound in the existing Canvas. It validates readiness, source header/dimensions/hash, complete placement and contain-fit when aspect ratios differ. Multiple independent layers/components are retained; product/logo/copy regions guide the background. Full source photo surroundings remain; this is not segmentation or an accepted alpha matte.
- Immutable product identifiers/hashes bind the local execution snapshot and are rechecked before persistence. Only role/rectangle/canvas geometry is sent as additional provider guidance; original product pixels, private keys/URLs, asset IDs and source hashes are excluded from that guidance. Original photos, printed branding and exact editable copy remain separate Canvas layers.
- The preflight explicitly identifies protected product-layer count or a background-only result. It does not invent a SKU, approve an asset, verify an unrecorded variant, infer rights or claim isolation quality. ZOE Mask V3 remains rejected and untouched.

## Verification

- AI: 48 unique focused cases passed across image execution, concept execution, Brand Analysis, beta preflight and mocked transaction concurrency. All provider transports were mocked. The final image privacy-binding rerun contains 13 cases; overlapping reruns are not counted twice.
- Content: 33 cases passed for synthetic product geometry, owned image lifecycle, Brand Analysis ownership and quoted-concept compatibility. The existing renderer/export and scene-capacity checks now run before provider execution. No private product images, live object storage or database was accessed.
- Frontend: 16 cases passed for beta and legacy preflight contracts; focused ESLint passed. Exact TypeScript baseline comparison: 42 existing diagnostics, 42 current, zero added (file/location/code/full message). Unrelated baseline errors remain.
- Strict AI/Content and shared-contract compilation passed. All 34 approved M2B prototype source/asset files remain unchanged. The forty-screen acceptance register remains explicitly partial; no screen is accepted solely because navigation exists.

## Runtime verification versus UAT

No new functionality in this increment was runtime-activated. Last previously verified managed release remains `2026-10-27T17-57-31-660Z-1f1359`; it predates these changes. Current service health is not proof of this source running. No services, ports, environment configuration, feature flags or database schemas were modified here.

New Content/regular-AI source still needs reviewed build/activation and owner-approved gates before UAT; the heuristic 5104 launcher cannot activate regular-AI image/Veo execution. Preserve Gateway, Identity, Media Worker, frontend and unrelated services. New image/concept/analysis beta paths must be verified against the intended local storage/database and existing Google adapter configuration without triggering generation.

## Requiring owner live UAT / remaining work

- Real Google image, concept and analysis execution; generated image variations/refinement; latency, actual visual fidelity, Canvas save/reopen and PNG/JPEG export parity remain unverified. No paid developer smoke test is currently requested or scheduled.
- Current provider-backed visual changes still target the environment behind the protected original photograph. Complete-ad copy/layout changes, campaign-level Director review/improvement/comparison and permissions-aware character generation remain incomplete. Do not label a background edit as full-ad refinement.
- Original-photo-layer treatment can preserve an opaque photograph/plinth/background. Professional isolated-product integration still requires separately approved source-preserving segmentation and visual review. Hash/header checks are not semantic product recognition or creative-quality acceptance.
- Multi-image/multi-scene Veo orchestration, cinematic ad completion and video export parity remain pending integration/owner UAT through existing Veo/media-worker/Sound Design services. No Veo inference was invoked or newly validated here.
- Complete remaining forty-screen production UX parity and all integrated journeys. Preserve approved luxury UX, original prototype files, existing Project -> Create Ad workflow and production Canvas. First Golden Ad and overall production acceptance remain NOT GRANTED.

Next source slice: reviewed complete-ad Director proposals and controlled copy/layout variations/refinement, followed by multi-scene animation integration. Continue mocked/synthetic verification; reserve full Google execution for owner UAT.
