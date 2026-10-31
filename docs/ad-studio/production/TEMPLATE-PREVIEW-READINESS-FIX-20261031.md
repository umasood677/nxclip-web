# Template preview readiness lifecycle — 2026-10-31

## Confirmed source defect

The owner screenshot shows successful ai-source and quote requests, no visible execution request, and an indefinitely busy preview. The application enables React StrictMode. ProductionImageGeneration incremented its request epoch in passive-effect cleanup. Development cleanup/setup replay therefore invalidated the in-flight automatic quote; autoAttempt prevented another quote, and the first response's state update/finally could no longer clear busy. The shared busy label misleadingly said Generating even during non-billable readiness.

## Correction

Use mounted-lifetime checks independently of the operation epoch: genuine unmount discards late callbacks, while StrictMode replay allows the same pending quote to settle. Keep serial operation/retained-request checks. Separate readiness, generation, status and recovery activity. Readiness says Checking readiness / No generation has started; only actual user-requested execution says Generating. No automatic paid execution, retry, feature-gate change or backend change.

## Verification

Tests execute the actual component function and handlers using deterministic hook/effect scheduling, including explicit StrictMode cleanup/setup replay. They use the real quote validators and mocked APIs, with no browser or provider execution. Cases cover success, rejected readiness, real unmount, explicit consent/generation without replay duplication, and retained-request protection. Existing component/model/template-entry tests also run. 22 focused tests passed; scoped ESLint passed. Strict TypeScript retains the same 38 baseline diagnostics with zero exact additions. All 34 approved prototype hashes remain unchanged. This is not live image-quality acceptance.

Read-only HTTP verification of the Vite module returned 200 and confirmed the new mounted-lifecycle guard, Checking readiness label and No generation has started message. No frontend/backend service restart was performed. Owner can reopen the same draft URL without creating another source or starting a campaign. Readiness must settle before the existing approval checkbox and Generate template preview action; owner initiates the paid request. If a retained request is displayed, check its status instead of starting another.

The earlier Gateway asset-read 429 and unclassified drafts HTTP400 are separate issues. This frontend correction does not claim to activate the Gateway rate-limit change or resolve an unknown backend response.
