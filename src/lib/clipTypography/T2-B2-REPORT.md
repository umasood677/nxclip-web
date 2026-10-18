# Smart Typography T2-B2 — browser and FFmpeg integration

Scope: ten families, fifteen exact faces; no new production selector entries, advanced editor or kinetic captions. Both repositories remain on master. No shared contracts or content-service caption DTOs were changed by this work.

## Browser loader

FontLoaderService exposes loadFont, ensureFontsLoaded, getFontLoadStatus, preloadPopularFonts and clearUnusedFonts. Creation performs no I/O. Requests use exact canonical family/weight/style, self-hosted WOFF2 subsets, SHA-256 verification, concurrent promise deduplication, successful-face caching, timeouts, cancellation, retryable failures and idle release. Optional text selects relevant subsets and rejects unsupported codepoints. Requests without text load the requested face's subsets, never all catalog families.

FontFace API is preferred. A document fallback registers checksum-verified Blob bytes in a private CSS font-face rule and waits on the exact newly registered FontFaceSet entry. It never treats document.fonts.check/load or system fallback as success. Environments without either verifiable path fail explicitly. The older-document fallback is implemented but not certified across old browsers.

The existing ClipEditor selector, overlay, Google Fonts loading and persisted legacy font IDs remain unchanged. No production component imports the new loader or fixture. The local fixture is served by fixtureServer.mjs on loopback only.

## Worker installation and reproducibility

Approved original T2-B1 font hashes are checked before conversion. The worker tool instantiates all variable axes into real static outlines (requested weight; Inter optical size 14), then assigns unique primary names NxClipT2Face01–15. These names avoid legacy family collisions and the Playfair reserved primary name. Static source faces are renamed without synthesizing their outlines. All copyrights and OFL notices are retained; the supplemental notice explicitly documents T2-B2 derivatives.

Assets live at apps/media-worker/assets/fonts/canonical/1.0.0, alongside untouched legacy files. The existing Docker COPY installs them. fonts.conf registers only that directory, relative to its location; canonical FFmpeg processes receive this isolated config. Legacy requests retain their original fontconfig environment and assets. Validation tools are a separate Docker target derived from the same font-runtime stage as production.

Reproduction from D:/NxClip:

    node node_modules/typescript/bin/tsc -p apps/media-worker/tsconfig.app.json --outDir .tmp/typography-worker-build --incremental false
    docker build --build-context typography=D:/NxClip-Web --target font-evidence --output type=local,dest=apps/media-worker/assets/fonts/canonical/1.0.0 -f apps/media-worker/Dockerfile .

The evidence target exports only fonts and test artifacts; it avoids exporting the large validation image. The compiled worker resolver and ASS generator are exercised in the same stage, with results in worker-preflight.json. The Python tool also supports --verify-only to recheck existing assets without preparing them. Generated static hashes, source hashes/revision, tool version, axis coordinates and selection logs are in the worker manifest. This validates the shared local runtime stage, not a deployed Cloud Run revision. Root manifests and lockfiles were untouched; only approved container-local validation dependencies were installed.

## Canonical resolver and export safety

The existing string fontId worker field carries an exact face ID; no shared-contract change is needed. Existing content-service validation continues to admit only legacy IDs, so new faces cannot enter production through Clip Studio yet.

Canonical preflight rejects unknown face IDs, missing assets, unverified faces, wrong hashes, unexpected fontconfig paths/families and unavailable characters. ASS uses the face's unique internal family with synthetic bold/italic disabled, including emphasis overrides. FFmpeg stderr must report the expected family for every fontselect event; a substitution or missing-glyph warning fails the render before publishing success.

Legacy Impact→Anton, Arial→Inter and Arial Black→Montserrat mappings remain unchanged. Existing saved projects receive no new fields or rewritten IDs. Inter's old filename is still a variable default-400 source; Montserrat's old legacy/preferred names are not replaced.

## Per-face evidence

Runtime: ffmpeg version 5.1.9-0+deb12u1 Copyright (c) 2000-2026 the FFmpeg developers; fontconfig version 2.14.1; fontTools 4.38.0.
Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36.

| Canonical face | Installed identity | fontconfig/libass | Browser load | Canvas advance px | ASS ink width px | Static SHA-256 |
|---|---|---|---|---:|---:|---|
| bebas-neue-400-normal | NxClipT2Face01 | pass | loaded | 223.90 | 172 | 5115218408bea5fdeebea510d8811c84857f056402c1271a18da51c314dc0cb0 |
| anton-400-normal | NxClipT2Face02 | pass | loaded | 268.20 | 156 | 30bc8b8937a034a1cbd46ff8bc1199cb1870970ca134d065f67c60d97ae1061b |
| archivo-black-400-normal | NxClipT2Face03 | pass | loaded | 373.88 | 278 | 8cceeb603c3553e352fc2ccae20de18de752f29d0d405def1b4ba3ffca729652 |
| montserrat-800-normal | NxClipT2Face04 | pass | loaded | 363.93 | 235 | 07343975a78e242aeddbd77bc4e38301a9074ffe2bc38a9f2fcf97bd5c297631 |
| montserrat-900-normal | NxClipT2Face05 | pass | loaded | 371.87 | 240 | 99f8e50dbd142b083b4f20cd64f8b2441481a6c83cb559e6df6c325b7c7aae99 |
| poppins-700-normal | NxClipT2Face06 | pass | loaded | 345.20 | 196 | 97ce60d5a5fa9096104adb49062ae08657066451d5f6dfe2634d0838806dd4b5 |
| poppins-900-normal | NxClipT2Face07 | pass | loaded | 354.69 | 201 | e904b178b34b3e9234deacffd6e596908bd5dc50bbc3c16d60771318d62b3ebb |
| inter-700-normal | NxClipT2Face08 | pass | loaded | 336.25 | 236 | f984343da0aa435e6f7ba8be1356c995526202a143a75f29cfe967047af51112 |
| inter-900-normal | NxClipT2Face09 | pass | loaded | 347.24 | 244 | 0df532e1578974b66d4574de34aa80b7a3e0edc38f8b41787d778bbf7c1e05b0 |
| playfair-display-700-normal | NxClipT2Face10 | pass | loaded | 312.23 | 224 | fe9dfb9067d0340c0743330a232b98aa9400db9c836c558cb8682766dff8639a |
| playfair-display-400-italic | NxClipT2Face11 | pass | loaded | 294.92 | 214 | 02b7e538b39cda2ca6f1b442ea02e329d27bce0ffc19f49d866688b2e98e8ae3 |
| plus-jakarta-sans-700-normal | NxClipT2Face12 | pass | loaded | 332.05 | 201 | ee8e29abb55c985d3405c8d178ca26823db92d124bf6cdc833a199fae32b4ade |
| plus-jakarta-sans-800-normal | NxClipT2Face13 | pass | loaded | 336.92 | 204 | b9ef5e867c229aa6abf742dee26f2379022678bc9e429e568fe0d5750f0161f4 |
| caveat-700-normal | NxClipT2Face14 | pass | loaded | 238.64 | 187 | 37a2d4532dedc7a0e98d63e895ea3f5a6ebcc4ba9e48b85c104a917cbeff35ba |
| jetbrains-mono-700-normal | NxClipT2Face15 | pass | loaded | 378.00 | 283 | c37a0396d4fab9961edf681cf4811c9f190862dc177f9ddaba4210ca820cb6ce |

Both width fixtures use Aa09 Mixed text at nominal size 42. Canvas advance includes bearings/spacing; ASS ink width is a raster bounding box, so these are diagnostic quantities rather than identical metrics or an acceptance ratio. The browser fixture also records block height and CSS line height. Controlled PNG/ASS/log samples are under the worker package's verification directory; T2-B2-browser-results.json records browser measurements.

## Preview/export evaluation

- Family, weight and italic: exact browser binaries verified by hash; static worker outlines and unique identities verified by fontconfig/libass.
- Glyph width: diagnostic numbers above show engine/font-size convention differences. Canonical source and browser delivery releases remain independently versioned.
- Wrapping: both fixtures have a 1120px text region in a 1280×720 frame and explicit multiline text. CSS pre-wrap and ASS automatic wrapping can choose different line breaks.
- Line height: browser uses explicit 1.2 (50.4px); ASS computes line spacing from font metrics. No cross-engine line-height contract is introduced here.
- Position/alignment: both are centered in the same frame; browser block anchoring and ASS an5 align differently when line heights differ.
- Stroke/shadow: browser uses paint-order/stroke and a CSS shadow; ASS uses libass outline/shadow. Rasterization and extents differ.

No pixel-identical output or full-layout parity is claimed. Correct face selection is verified; production typography sizing/wrapping normalization remains a T3 integration task. The public frontend registry stays export-blocked rather than treating local sample success as production rollout approval.

## Glyph and language limits

Fixtures cover uppercase/lowercase Latin, digits, punctuation, mixed text, multiline wrapping and selected Unicode glyphs actually present in each font. Missing sample codepoints are recorded per face. Arabic/Urdu, Indic shaping, bidi, emoji and comprehensive language coverage are not certified. A present cmap glyph does not prove language support; unsupported canonical text fails instead of silently borrowing a system font.

The browser check found a genuine coverage gap: nine faces across Bebas Neue, Anton, Archivo Black, Montserrat, Playfair Display and Plus Jakarta Sans contain Omega in retained originals but not in the served browser subsets. The loader rejected these requests correctly. rendererOnlySampleUnicode records this gap; comparable parity fixtures use the browser/renderer intersection. Coverage checks were not weakened to make the fixture pass.

## Tests and builds

Frontend registry/asset/loader suites: 30 tests, exit 0. Existing ASS/semantic/FFmpeg regressions: 21 tests, exit 0. Canonical worker preflight tests: 3 tests, exit 0. Isolated TypeScript checks and worker TypeScript emit: exit 0. Frontend fixture bundle and targeted ESLint: exit 0. Fontconfig and actual ASS renders: 15/15 verified, evidence build exit 0; compiled runtime preflight/ASS verified for 15 faces. Browser fixture: 15/15 loaded with checksum verification; its page title and persisted measurements confirm success. All fifteen static asset hashes reproduced exactly across regeneration.

Initial attempts are distinguished from final results: Jest sandbox cache writes failed (exit 1); the approved outside-sandbox run exposed a pre-existing assertion that omitted an existing color override (exit 1). Only that expected string was corrected; final regressions pass. A large image export was interrupted (exit 1) and replaced with the successful small evidence target. Optional cropdetect measurement failed (exit 1), then direct raster-pixel measurement replaced it without weakening selection checks. Browser loopback access required running the fixture server outside the sandbox. The initial browser Omega coverage failures remain documented as real asset differences, not ignored loading errors.

## Ownership and remaining blockers

No Ad Studio, App.tsx, apiClient.ts, motion graph, content-service DTO or shared-contract file was edited by this work. Concurrent changes to sound-design services/contracts and Ad Studio are preserved. During final checks, the other workstream also began editing animated-export, queue/orchestration modules, internal clients/contracts and deployment workflow files; these were left untouched. Worker changes from typography are limited to font resolution, ASS/FFmpeg canonical handling, Docker runtime/validation stages, assets and font tests/tools. Build/test results are scoped to the typography changes at verification time, not certification of concurrently changing Ad export work.

No migration, paid AI request, deployment, commit, push, branch or worktree was performed. Remaining blockers for T3 are approval, editor/API integration design, deliberate layout normalization and broader script/browser testing. No T3 work is implemented.
