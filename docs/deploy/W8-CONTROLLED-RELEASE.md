# W8 selective GitHub release â€” GitHub Free development

Status: local automation implementation only. No commit, push, workflow execution,
image publication, Cloud Run deployment, migration or traffic change is authorized
by this document. It supersedes the deployment instructions in the historical
`.tmp/w8-release-20261103/GCP-DEPLOYMENT.md` for this W8 release only.

## Immutable application inputs

| Repository | Application SHA | Built services |
|---|---|---|
| umasood677/nxclip | `0001905c9ea579b76abe746d7bdf62498b64fc93` | ai-service, content-service, api-gateway |
| umasood677/nxclip-web | `746515f6d07c7240a4d47391d6c3c0a2d44623e0` | nxclip-web |

Automation is checked out separately at the workflow dispatch SHA. Both identities
are checked and recorded. A future automation commit does not change the application
source being built. Build receipts include the workflow run ID and attempt.

Target: project `nxclip-500511`, Cloud Run region `us-central1`, registry
`us-central1-docker.pkg.dev/nxclip-500511/nxclip-services`.
Identity and Media Worker are excluded from build, publish and deployment. Preserve
Media Worker `media-worker-00139-nnx`. Full T3 access unification is deferred.
Backup and additive Brand Templates schema work are already complete; no SQL is run.

## New files and unchanged legacy behavior

Each repository adds `.github/workflows/deploy-w8-selective.yml` and the policy,
controller and tests under `tools/release/`. The existing `ci.yml` and
`deploy-gcp.yml` are unchanged. Do not run legacy CD during the W8 window: it still
deploys unrelated services and replaces broad runtime settings.

New and old CD share the same repository-level deployment concurrency group:
`gcp-deploy-development` (backend), `gcp-deploy-web-development` (frontend).
There is no GitHub cross-repository concurrency lock. Use sequential dispatches
and the peer-manifest/live-state checks below; do not run external deploy commands.

## GitHub Free setup (repository-level configuration)

- Existing repository-level `GCP_SA_KEY` deployment authentication. No GitHub
  environment, environment secrets/variables or Required reviewers are needed.
- Every operation is manually dispatched from master. The job guard and controller
  independently verify workflow_dispatch, refs/heads/master and the exact release
  workflow path/ref. Both dispatcher and rerun actor must be authorized.
- The repository owner (`umasood677`) is authorized by default. Optional repository
  Variable `W8_RELEASE_MAINTAINERS` is a JSON array of additional GitHub logins,
  for example `["trusted-maintainer"]`. Leave it absent for owner-only execution.
  Those users also need GitHub permission to dispatch the workflow. Invalid
  allowlist JSON fails closed. No new approval service or confirmation framework.
- `W8_RELEASE_READ_TOKEN`: needed where the ordinary token cannot read the peer
  repository. For private peers, provide a fine-grained read-only token with Actions
  read access to the PEER repository (or an equivalently scoped GitHub App token).
  Own artifacts always use the ordinary job token. The peer token is exposed only
  in the coordinated promote/rollback step, never source installation, tests,
  builds, publication or staging. It is mapped to GH_TOKEN only for peer GitHub
  reads and stripped from cloud subprocess environments.
  Artifact transfer uses explicit repository + producing run ID, never a presumed
  shared artifact namespace. No cross-repository write permission is needed.
- The ordinary job token needs Contents and Actions read permissions.
  Existing Google deployment credentials must already have registry read/write,
  Cloud Run describe/deploy/update-traffic and runtime-service-account actAs access.
  The workflow grants no IAM rights and creates no registry repository.
- Frontend public build inputs must resolve exactly to `publicBuildValues` in
  `tools/release/w8-release-policy.json`. Repository Variables take precedence over
  same-name repository Secrets. Values are compared before build, without printing them.
  This includes both Gateway URL arguments, notification URL, Google OAuth client
  ID, TemplatesV1/Animated=true and all six new W8 flags=false. Missing variables
  fail closed; the workflow does not invent defaults or enable features.

Authorization is the deliberate owner/maintainer dispatch for the selected
operation and exact manifest inputs, not an environment review. There is no
automatic stage, promotion or rollback after a successful preceding operation.
Normal CI and the legacy CD workflows remain unchanged.

Security boundary: these are workflow/controller guards, not tamper-proof secret
isolation against repository writers who can edit workflow code. Repository-level
deployment credentials require trusted repository write access. Dispatch reviewed
master only; protect the owner account and credentials. This development trust
model does not provide independent two-person review. No GitHub settings changed.

## Operations and artifact chain

Choose the same lowercase `w8-...` release ID in both repositories. The workflow
has nine inputs; operation, release ID and exact source SHA are always required.

1. `build_publish` (separate approval in each repository): run focused source
   builds/tests, build only approved Dockerfiles from the application checkout,
   publish unique tags containing release ID, source SHA, run ID and attempt.
   Existing destination tags stop the operation; permission/transport errors are
   not interpreted as tag vacancy. No `latest` push, cleanup, Cloud Run change or
   local-image dependency. Resolve the remote immutable digest after each push.
2. `stage` (separate approval): supply own build run ID and exact manifest SHA-256.
   Download only its successful manual W8 workflow artifact, verify producer run,
   repository, workflow revision, source SHA, manifest bytes, services and images.
   Deploy by digest with `--no-traffic` and a unique tag. Save prior concrete traffic,
   revision identity and configuration hashes. Verify unchanged traffic, original
   tags and full single-container configuration before tagged health probes.
3. `promote` (separate approval): supply own stage run/hash AND peer stage run/hash,
   `smoke_acceptance=accepted`, and `background_readiness=retain-disabled-reviewed`.
   Backend requires the frontend still staged on its baseline traffic. Frontend
   requires all three backend revisions already promoted. Peer revision UID,
   digest and configuration are checked live. Artifact producers must also be
   manual master release runs. Backend order is AI -> Content ->
   Gateway; then dispatch frontend promotion. No `--to-latest` or automatic chain.
4. `rollback` (separate approval): supply own AND peer successful stage run/hash,
   not failed-operation artifacts or freshly generated manifests. Restore exact
   prior traffic split. Roll frontend back first, then backend (Gateway -> Content
   -> AI). Backend rollback refuses any write while the peer frontend still serves
   its W8 candidate or has unrelated traffic. Frontend rollback accepts a backend
   at the recorded baseline or the recorded W8 candidate, including a partial
   backend promotion. Peer UID, digest, configuration and traffic are checked at
   preflight and again before EVERY local traffic operation. No database restoration,
   migrations, environment replacement, asset deletion or queue replay. The
   controller refuses unrelated traffic/configuration changes or newer revisions.

Artifact names are `<release_id>-<operation>`, retained for 90 days. Each contains
`release-manifest.json` and its SHA-256, including source/workflow/run identities,
service/digest/build receipt, staged revision UID, previous traffic and per-service
staging/promotion status. Copy the producing run ID and printed manifest hash into
the next dispatch. Preserve both repositories' receipts outside expiring artifacts
for long-term rollback. Partial-failure receipts are retained; a failed operation
does not automatically retry, promote or roll back. Partial build outputs are not
accepted for staging. Use a new release/run for a failed build, not tag overwrite.

## Verified recovery behavior (Phase B1)

| Failure | Guarded recovery, always separately dispatched/approved |
|---|---|
| Backend promotion fails after some targets moved | Stop; do not rerun promotion as resume. Already-promoted traffic fails the original baseline guard. Roll back using the original successful own/peer stage manifests. Frontend must be at its exact baseline first. |
| Frontend is already promoted | Backend rollback is blocked. Roll frontend back first, then dispatch backend rollback. |
| Rollback fails partway | Receipt records completed/attempting targets. A new approved rollback dispatch may restore targets still at the candidate and reassert targets already at baseline. Unrelated traffic/configuration/new revisions remain blocked. |
| CLI reports failure after applying traffic | No retry or automatic rollback. The receipt may say attempting; live traffic can already have changed. Review live state and explicitly dispatch guarded rollback. |
| Staged health fails | Existing ordinary traffic stays unchanged in the tested path; retain the failed receipt and zero-traffic revision. Failed-run artifacts cannot authorize promotion. After diagnosis, a new explicitly approved stage dispatch can use the successful build manifest; do not treat this as an automatic retry. |
| Configuration, digest, artifact hash or expiry mismatch | Stop before further changes. No automatic repair, restage, traffic update or cleanup. Configuration drift after deploy may already exist on the zero-traffic candidate; review it before any new operation. |

Successful stage manifests remain the recovery source of truth even when later
promotion/rollback runs fail. Save their producing run IDs and exact hashes. A
failure receipt documents partial progress but never replaces the stage manifest
as authorization. No new resume operation or weakened baseline check was added.

There is still no atomic cross-repository transaction/lock. Run release dispatches
sequentially. Per-service peer rechecks narrow concurrent-change exposure but do
not authorize simultaneous frontend promotion/backend rollback, legacy CD or
external deployment commands. A changed peer stops the next local traffic update.

## Configuration and startup semantics

Only image and these startup overrides may change during staging:

| Service | Reviewed overrides |
|---|---|
| AI | AI_DB_RUN_MIGRATIONS=false, AI_DB_SYNCHRONIZE=false, AI_QUEUE_WORKERS_ENABLED=false |
| Content | CONTENT_DB_RUN_MIGRATIONS=false, CONTENT_DB_SYNCHRONIZE=false, CONTENT_BACKGROUND_POLLERS_ENABLED=false, OUTBOX_DISPATCHER_ENABLED=false |
| Gateway / Web | None |

Content/AI migration helpers default ON unless explicitly false. Synchronization
is also constrained by production NODE_ENV, but explicitly disabled here. AI
BullMQ registration is already disabled on Cloud Run by `K_SERVICE`; keep the
explicit worker opt-out too. Content outbox/pollers must remain suppressed even
on zero-traffic revisions. `CONTENT_SKIP_MIGRATIONS` is preserved byte-for-byte.

Environment/secret references, runtime account, resources, network, ingress,
Cloud SQL attachments and scaling are compared against the immediate pre-stage
snapshot. Config is handled in memory; artifacts contain hashes, not raw env or
keys. No `--set-env-vars`, `--env-vars-file`, IAM changes or URL injection.
Post-deploy drift stops the workflow and preserves the receipt; it does not attempt
an unapproved corrective update. Cloud Run defaults/admission normalization may
require a reviewed comparator adjustment after staging evidence, not bypassing it.

Promotion retains the staged background opt-outs and cannot turn workers on.
Owner acceptance must explicitly consider effects on existing Clip Studio jobs,
pollers and events. If those services must resume background work, STOP: propose
a separate configuration revision with its own review and smoke tests. This
workflow is not authorization to enable them. Traffic rollback does not guarantee
that every warm instance stops background work or undo any completed writes.

### Separate background-processing restoration gate (design only)

No restoration operation or commands are implemented. Restoring workers changes
Content configuration and creates another revision; current stage-manifest UID/
configuration guards must not be bypassed or reused for that new revision.

1. Obtain separate approval for read-only inventory of pending outbox events, due
   scheduled posts, abandoned exports and in-flight work, including downstream
   effects. Do not reset statuses, replay queues or manually requeue records.
2. Review the backlog and approve its consumption explicitly. Establish a bounded
   maintenance/drain window and verify earlier processing instances are quiescent;
   ordinary traffic rollback alone is not evidence they stopped.
3. Propose and approve a new restoration manifest/configuration revision. Keep
   migrations/synchronization OFF and CONTENT_SKIP_MIGRATIONS unchanged. Review
   outbox restoration first, then the poller/recovery group, including any bounded
   batch/interval overrides; do not apply these changes under this release workflow.
4. Approve activation knowing that outbox dispatch starts on its timer, meme
   polling can start after 5 seconds and animated recovery after 10 seconds, even
   on zero-traffic instances. Do not run an enabled-background dry-run against
   shared data. If a safe activation window cannot be established, STOP.
5. Verify the new revision, observed job effects and fresh rollback baseline.
   Any stop/rollback is another approved operation, not automatic. Preserve event
   history and completed writes. Do not claim restoration from HTTP health alone.

## Smoke-test boundaries and remaining gates

Automatic smoke invokes ONLY `/health` on each exact tagged revision, with a
short-lived IAM token kept in memory. It checks readiness, immutable image digest,
UID and configuration. It does not log in as an owner, generate media, analyze a
brand, upload/delete objects or mutate saved records. No provider retries.

Stable peer URLs are intentionally preserved. A tagged Content/Gateway/Web can
therefore still call the currently serving peer, not the staged peer. Tagged
health is NOT integrated W8/browser/provider acceptance. Before promotion, owner
smoke must cover approved read-only authenticated Brand Kit/assets/template APIs,
and explicitly review mixed-version compatibility. Full candidate-to-candidate
testing may need a separately approved, temporary routing plan; do not silently
rewrite URLs or promote based only on HTTP 200. Tagged frontend OAuth origins and
ingress/IAM access may limit browser testing. If a runner cannot reach a tagged
service using existing ingress/IAM, stop; never open access automatically.

Initial six new frontend features remain OFF. This is a code release, not Golden
Ad acceptance or activation of all W8 functionality. Live Google creative quality
remains owner UAT. Immutable source pinning does not guarantee byte-identical
rebuilds: existing Dockerfiles have upstream base/dependency installation behavior;
record remote digests and deploy those exact outputs.

## Local Phase A validation

Run `node --test tools/release/w8-cloud-run.spec.mjs tools/release/w8-cloud-run.recovery.spec.mjs`
in each repository. Tests use
synthetic metadata and in-memory CLI/HTTP simulators, including the complete
build/publish and staging controller paths. They do not invoke Docker, gcloud or
GitHub workflows. Validate YAML separately. Do not interpret these tests as a
GitHub-hosted image build, live Cloud Run preservation or browser UAT PASS.

The recovery suite additionally executes complete controllers through partial
promotion, explicit rollback, failed staging, own/peer configuration drift,
cross-repository rollback ordering, mid-operation peer changes, uncertain CLI
results, failed rollback followed by a new dispatch, hash/expiry/digest rejection
and missing peer manifests. All cloud/HTTP actions are in-memory simulations.

Change-control order: local implementation -> owner review -> explicit commit/push
approval. Once approved automation is on master, separately authorize and manually
dispatch build_publish, stage, promote or rollback. These dispatches replace the
unavailable environment-reviewer gate; they do not authorize another operation.
Smoke acceptance/background readiness inputs and every existing recovery guard
remain required. The separate background-restoration gate is unchanged.


## Owner-approved Brand Template activation (2026-11-04)

This profile enables only native Brand Templates and real Ad Studio images: Content AD_STUDIO_BRAND_TEMPLATES_ENABLED=true; Content/AI AD_STUDIO_REAL_IMAGES_ENABLED=true; matching frontend VITE flags=true. AI_MODEL_ROUTER_ENABLED=true is required for the existing Vertex image route; no model, provider or fallback configuration is changed. Real concepts and brand analysis remain disabled. Existing migrations, synchronization, workers and outbox opt-outs remain false. No provider generation is part of deployment verification.

Backend application source/images stay pinned to the existing approved W8 build receipt. `preserveServices: ["api-gateway"]` requires Gateway to already serve the exact approved immutable image at 100%, with the same ready/latest revision and unchanged configuration. Staging records its existing UID, digest, spec/config hashes and health without deploying, tagging or changing traffic. Promotion and rollback revalidate that receipt and perform no Gateway mutation. Only AI and Content receive new reviewed configuration revisions. Any mismatch stops before mutations during preflight; no fallback redeployment or automatic recovery is permitted.

Stage backend configuration revisions and the enabled frontend at zero traffic, then promote backend followed by frontend using their new stage manifests. The frontend must still be at its recorded baseline during backend promotion. Preserve old stage/build artifacts for rollback. Configuration-only activation does not authorize background processing or a paid test request. Owner generation remains separate UAT.


## Test A fidelity hotfix — 2026-11-04

Owner authorized commit, push and deployment of the Test A correction. Application pins:
backend `6452749f29ffa34dbf6c60b55d0ebf7d8643c416`; frontend `1a71b13f04572bcab3ad9980bc0a08de937616bb`.
This release's backend exact allowlist is **AI and Content only**, with frontend peerServices matching.
Gateway is excluded entirely rather than rebuilt or relabeled as the new application SHA.
Its existing image, revision and traffic remain unchanged, as do Identity and Media Worker.
Existing safety overrides, frontend flags, source/digest guards and coordinated ordering remain intact.
Build, stage at zero traffic, then promote backend followed by frontend through the same selective controller.
No migrations, background restoration or provider generation is included. Old manifests remain rollback evidence for their original releases; use this release's own successful stage manifests for its rollback.
Full three-service recovery fixtures remain covered, plus an AI/Content-only stage/promotion/rollback fixture with no Gateway access.
