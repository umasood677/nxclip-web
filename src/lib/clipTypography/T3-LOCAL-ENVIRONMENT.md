# T3 isolated persistence preflight — BLOCKED

The complete isolated local environment is unavailable. Persistence testing stopped before project creation, authentication, uploads, saves, database queries or queue submission. No backend service, Docker build, container, migration or schema synchronization was started. No production API/database/Redis/queue was contacted by this audit.

## Verified configuration and connectivity

| Dependency | Observed configuration | Read-only TCP check |
|---|---|---|
| API gateway | Service config and service `.env`: localhost:5000 | Refused |
| Identity | Gateway peer: localhost:5001 | Refused |
| Clip/content service | Service config and `.env`: localhost:5002 | Refused |
| Media worker | Default/example: localhost:5007; content callback localhost:5002; no worker `.env` | Refused |
| Feed / AI / analytics / notifications | Gateway peers localhost:5003–5006 | All refused |
| PostgreSQL | Root `.env`: localhost:5432 | TCP reachable; database identity/schema/ownership NOT verified |
| Content database override | `apps/content-service/.env` DB_URL points to remote Neon PostgreSQL | Not contacted; violates local-only requirement |
| Redis | Root and Docker `.env` configure localhost:6380 | Refused |
| Other Redis-standard port | localhost:6379 | TCP reachable; service identity/ownership NOT verified; not substituted for 6380 |
| Browser frontend | Loopback-only validation UI at 127.0.0.1:4320 | API guard returns local 503, with no outbound proxy |
| Actual frontend API resolver | Rejects localhost/127.0.0.1 env overrides and falls back to production Cloud Run | NOT an approved local write target |

Configuration is not evidence that an application is running. TCP reachability is not proof of database identity or safety. No SQL, Redis commands, authentication requests or production endpoint probes were performed. Credentials were neither printed nor applied to a service process. The audit output includes only endpoint hosts/ports, non-secret settings and credential variable names.

## Implementation findings

- `infrastructure/docker/docker-compose.yml` provisions PostgreSQL, Redis and PgAdmin only; it does not start the application services. Actual Docker `.env` maps Redis to 6380, rather than the Compose default 6379.
- `apps/content-service/src/config/configuration.ts` consumes DB_URL. The service-specific `.env` is a remote-database hazard; its presence must not be treated as an isolated development configuration. Actual runtime precedence was not assumed because services were not started.
- `apps/content-service/src/infrastructure/database/database-init.service.ts` invokes SQL migrations during module initialization. `database.module.ts` enables TypeORM synchronization outside production. Starting it is not a read-only health check.
- The inspected media-worker dispatch implementation invokes background processing directly and calls content-service over HTTP. Its queue-labelled API does not establish a verified Redis-backed local render queue. No queue action was taken.
- No isolated local account/session, disposable project, verified development schema or media-worker runtime configuration is established. No sample media was uploaded and no real user's project was used.

## Permitted fallback results

- Existing read-only browser fixture inspected again: current shared preview reports successful font loading, no fallback success and a surviving component.
- Fixture persistence/editor/Sound Design suite rerun: **6/6 pass, exit 0**. It executes the actual blueprint builder and local-save callback with in-memory test storage, checks legacy font ID preservation and canonical metadata serialization, and checks Original/Master mute behaviour. It does not save to a backend.
- The prior fresh local browser comparison remains **105/105 passing**; it is fixture rendering, not a project reopen result.
- **Real backend create/save/reopen remains unverified.** No request/response save evidence exists because zero backend writes were attempted.

[Sanitized endpoint audit](./T3-LOCAL-ENVIRONMENT.json) · [Fixture results](./T3-final-validation-evidence/local-persistence-fixture-tests.log) · [Fresh visual validation](./T3-FINAL-VALIDATION.md)

## Stop / release status

Keep T3 production flags OFF. Preserve Cursor's deployment configuration and unfinished Phase 4C-B work. No staging, commits, pushes, deployments, dependency installation or feature activation were performed.

Before real persistence testing can resume, a complete isolated stack must be available: a genuine localhost frontend API route, local-only service/database/Redis configuration, verified local schema with a permitted startup strategy, isolated authentication and local media storage. Do not silently repair this by using production or the remote Neon database. Cursor's completed release revisions must still be reconciled before any release approval request.
