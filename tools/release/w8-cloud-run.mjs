// W8 release controller. Importing this module never executes a command.
// Raw Cloud Run configuration, tokens and CLI error output are never emitted.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export class ReleaseGuardError extends Error {}
export function assert(condition, message) { if (!condition) throw new ReleaseGuardError(message); }
const clone = value => JSON.parse(JSON.stringify(value));
let processExecutor = spawnSync;
// Tests supply an in-memory CLI simulator; the workflow CLI has no override switch.
export async function withCommandExecutorForTest(executor, operation) {
  const previous = processExecutor;
  processExecutor = executor;
  try { return await operation(); } finally { processExecutor = previous; }
}
export function validateContext(policy, env) {
  assert(env.GITHUB_REPOSITORY === policy.repository, 'Repository is outside the W8 allowlist');
  assert(env.SOURCE_SHA === policy.sourceSha, 'Application source must equal the approved full SHA');
  assert(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || ''), 'Workflow revision must be a full SHA');
  assert(/^w8-[a-z0-9][a-z0-9-]{0,30}$/.test(env.RELEASE_ID || ''), 'Invalid release ID; use w8- plus lowercase letters/digits/hyphens (max 34 chars)');
  assert(['build_publish', 'stage', 'promote', 'rollback'].includes(env.OPERATION), 'Unsupported release operation');
  assert(/^\d+$/.test(env.GITHUB_RUN_ID || '') && /^\d+$/.test(env.GITHUB_RUN_ATTEMPT || ''), 'Missing GitHub run identity');
  validateManualAuthorization(policy.repository, env);
}
export function authorizedMaintainers(repository, value = '[]') {
  let extra;
  try { extra = JSON.parse(value); } catch { assert(false, 'W8_RELEASE_MAINTAINERS must be a JSON array of GitHub logins'); }
  assert(Array.isArray(extra) && extra.every(login => typeof login === 'string' && /^[a-z0-9][a-z0-9-]{0,38}$/i.test(login)), 'Invalid W8_RELEASE_MAINTAINERS allowlist');
  return new Set([repository.split('/')[0], ...extra].map(login => login.toLowerCase()));
}
export function validateManualAuthorization(repository, env) {
  assert(env.GITHUB_EVENT_NAME === 'workflow_dispatch', 'Release operations require a separate manual workflow dispatch');
  assert(env.GITHUB_REF === 'refs/heads/master', 'Release automation may run only from master');
  assert(env.GITHUB_WORKFLOW_REF === `${repository}/.github/workflows/deploy-w8-selective.yml@refs/heads/master`, 'Unexpected release workflow/ref');
  const allowed = authorizedMaintainers(repository, env.W8_RELEASE_MAINTAINERS || '[]');
  assert(allowed.has(String(env.GITHUB_ACTOR || '').toLowerCase()) && allowed.has(String(env.GITHUB_TRIGGERING_ACTOR || '').toLowerCase()), 'Release dispatcher and rerun actor must be authorized maintainers');
}
export function validateBuildValues(policy, values) {
  for (const [key, expected] of Object.entries(policy.publicBuildValues)) {
    assert(values[key] === expected, `Approved frontend build input mismatch: ${key}`);
  }
}
export function validateManifest(policy, manifest, expected = {}) {
  assert(manifest.schemaVersion === 1 && manifest.project === policy.project && manifest.region === policy.region, 'Invalid manifest target/schema');
  assert(manifest.repository === policy.repository && manifest.sourceSha === policy.sourceSha, 'Manifest source/repository mismatch');
  assert(manifest.releaseId === expected.releaseId, 'Manifest release ID mismatch');
  assert(manifest.operation === expected.operation, 'Unexpected manifest operation');
  assert(/^[a-f0-9]{40}$/.test(manifest.workflowSha || ''), 'Manifest missing workflow revision');
  assert(/^\d+$/.test(manifest.runId || '') && /^\d+$/.test(manifest.runAttempt || ''), 'Manifest missing build/run receipt');
  assert(Array.isArray(manifest.services) && canonical(manifest.services.map(s => s.service)) === canonical(policy.services), 'Manifest services/order differ from exact allowlist');
  for (const item of manifest.services) {
    const imagePrefix = `${policy.registry}/${item.service}@sha256:`;
    assert(typeof item.image === 'string' && item.image.startsWith(imagePrefix) && /^[a-f0-9]{64}$/.test(item.image.slice(imagePrefix.length)), 'Image is not an allowlisted immutable digest');
    assert(item.buildReceipt?.sourceSha === policy.sourceSha && /^[a-f0-9]{40}$/.test(item.buildReceipt.workflowSha || '') && /^\d+$/.test(item.buildReceipt.runId || ''), 'Missing build provenance');
    if (policy.repository.endsWith('/nxclip-web')) validateBuildValues(policy, item.buildReceipt.publicBuildValues || {});
    if (expected.operation === 'stage') {
      assert(item.stagingStatus === 'verified' && item.smoke?.health === 'pass', 'Staged service is not health-verified');
      assert(item.revision?.startsWith(item.service + '-') && item.revisionUid && /^[a-f0-9]{64}$/.test(item.configHash || '') && /^[a-f0-9]{64}$/.test(item.revisionSpecHash || ''), 'Missing staged revision identity');
      validateTraffic(item.previousTraffic);
    }
  }
}
export function validateTraffic(traffic) {
  assert(Array.isArray(traffic) && traffic.length > 0 && traffic.every(t => typeof t.revisionName === 'string' && /^[a-z0-9-]+$/.test(t.revisionName) && Number.isInteger(t.percent) && t.percent > 0), 'Concrete prior traffic allocation required');
  assert(new Set(traffic.map(t => t.revisionName)).size === traffic.length && traffic.reduce((n, t) => n + t.percent, 0) === 100, 'Invalid/duplicate traffic allocation');
}
export function traffic(service) {
  const allocations = (service.status?.traffic || []).filter(t => t.percent > 0).map(t => ({ revisionName: t.revisionName, percent: t.percent })).sort((a, b) => a.revisionName.localeCompare(b.revisionName));
  validateTraffic(allocations);
  return allocations;
}
function annotations(input = {}) {
  return Object.fromEntries(Object.entries(input).filter(([k]) => !['run.googleapis.com/client-name', 'run.googleapis.com/client-version', 'run.googleapis.com/operation-id', 'client.knative.dev/user-image'].includes(k)));
}
export function templateConfig(template) {
  const copy = clone(template);
  const metadata = { annotations: annotations(copy.metadata?.annotations), labels: { ...(copy.metadata?.labels || {}) } };
  delete metadata.labels['client.knative.dev/nonce'];
  const spec = copy.spec;
  assert(spec?.containers?.length === 1, 'W8 controller supports existing single-container services only');
  for (const container of spec.containers) container.env = (container.env || []).sort((a, b) => a.name.localeCompare(b.name));
  return { metadata, spec };
}
export function serviceConfig(service) {
  const spec = clone(service.spec || {}); delete spec.template; delete spec.traffic;
  return { annotations: annotations(service.metadata?.annotations), labels: service.metadata?.labels || {}, spec };
}
export function expectedTemplate(current, image, overrides) {
  const out = clone(current.spec.template);
  assert(out.spec?.containers?.length === 1, 'Unexpected container layout');
  const container = out.spec.containers[0]; container.image = image;
  const env = new Map((container.env || []).map(entry => [entry.name, entry]));
  for (const [name, value] of Object.entries(overrides)) env.set(name, { name, value });
  container.env = [...env.values()];
  return templateConfig(out);
}
export function validatePreservation(before, after, image, overrides) {
  assert(canonical(serviceConfig(before)) === canonical(serviceConfig(after)), 'Service configuration drift: ingress/network/scaling/labels changed');
  assert(canonical(expectedTemplate(before, image, overrides)) === canonical(templateConfig(after.spec.template)), 'Revision configuration drift outside reviewed image/startup overrides');
  assert(canonical(traffic(before)) === canonical(traffic(after)), 'Traffic changed during zero-traffic staging');
  const beforeTags = (before.status?.traffic || []).filter(t => t.tag).map(t => [t.tag, t.revisionName]);
  const afterTags = new Map((after.status?.traffic || []).filter(t => t.tag).map(t => [t.tag, t.revisionName]));
  assert(beforeTags.every(([tag, revision]) => afterTags.get(tag) === revision), 'Existing traffic tag changed');
}
export function deploymentArgs(policy, service, image, suffix, tag) {
  assert(policy.services.includes(service), 'Forbidden service');
  const overrides = policy.safetyOverrides[service];
  const args = ['run', 'deploy', service, '--project', policy.project, '--region', policy.region, '--image', image, '--no-traffic', '--revision-suffix', suffix, '--tag', tag, '--quiet', '--format=json'];
  if (Object.keys(overrides).length) args.push('--update-env-vars', Object.entries(overrides).map(([k, v]) => `${k}=${v}`).join(','));
  return args;
}
export function promotionArgs(policy, item, current) {
  assert(policy.services.includes(item.service), 'Forbidden promotion service');
  assert(canonical(traffic(current)) === canonical(item.previousTraffic), 'Promotion blocked: baseline traffic changed');
  assert(current.status?.latestCreatedRevisionName === item.revision && current.status?.latestReadyRevisionName === item.revision, 'Promotion blocked: intervening or unready revision');
  assert(sha256(canonical(templateConfig(current.spec.template))) === item.configHash, 'Promotion blocked: configuration changed');
  return ['run', 'services', 'update-traffic', item.service, '--project', policy.project, '--region', policy.region, '--to-revisions', `${item.revision}=100`, '--quiet', '--format=json'];
}
export function rollbackArgs(policy, item, current) {
  assert(policy.services.includes(item.service), 'Forbidden rollback service'); validateTraffic(item.previousTraffic);
  const now = traffic(current);
  assert(canonical(now) === canonical(item.previousTraffic) || canonical(now) === canonical([{ revisionName: item.revision, percent: 100 }]), 'Rollback blocked: traffic is outside this release');
  assert(current.status?.latestCreatedRevisionName === item.revision && current.status?.latestReadyRevisionName === item.revision, 'Rollback blocked: intervening revision');
  assert(sha256(canonical(templateConfig(current.spec.template))) === item.configHash, 'Rollback blocked: configuration drift');
  return ['run', 'services', 'update-traffic', item.service, '--project', policy.project, '--region', policy.region, '--to-revisions', item.previousTraffic.map(t => `${t.revisionName}=${t.percent}`).join(','), '--quiet', '--format=json'];
}
// No shell interpolation. CLI stderr may contain sensitive configuration: suppress it.
export function command(exe, args, options = {}) {
  const { W8_RELEASE_READ_TOKEN: _peerToken, ...childEnv } = options.env || process.env;
  const r = processExecutor(exe, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options, env: childEnv });
  if (r.status !== 0) throw new ReleaseGuardError(`${exe} operation failed (exit ${r.status ?? 'unavailable'}); no automatic retry; upstream output suppressed`);
  return r.stdout;
}
function jsonCommand(exe, args) { return JSON.parse(command(exe, args)); }
export function assertTagAbsent(policy, service, tag, run = processExecutor) {
  const r = run('gcloud', ['artifacts', 'docker', 'images', 'describe', `${policy.registry}/${service}:${tag}`, '--project', policy.project, '--format=json'], { encoding: 'utf8' });
  assert(r.status !== 0, `Release tag already exists for ${service}; no overwrite allowed`);
  assert(Number.isInteger(r.status) && r.status > 0 && /\bNOT_FOUND\b/.test(r.stderr || '') && !/PERMISSION_DENIED|UNAUTHENTICATED/i.test(r.stderr || ''), 'Cannot establish tag vacancy; registry inspection failed');
}
function artifactName(releaseId, operation) { return `${releaseId}-${operation}`; }
export function validateArtifactRun(run, repository, runId, artifact) {
  assert(run.id === Number(runId) && run.status === 'completed' && run.conclusion === 'success', 'Manifest run is not completed/successful');
  assert(run.repository?.full_name === repository && run.path === '.github/workflows/deploy-w8-selective.yml' && run.event === 'workflow_dispatch', 'Manifest producer is not the reviewed manual W8 workflow');
  assert(run.head_branch === 'master', 'Manifest must be produced by the master release workflow');
  assert(!artifact.expired && artifact.name && artifact.workflow_run?.head_sha === run.head_sha, 'Artifact provenance/expiry mismatch');
}
export async function obtainManifest(repo, runId, expectedHash, releaseId, operation, policy, requesterRepository = process.env.GITHUB_REPOSITORY) {
  assert(/^\d+$/.test(runId || '') && /^[a-f0-9]{64}$/.test(expectedHash || ''), 'Supply producing run ID and manifest SHA-256');
  const { W8_RELEASE_READ_TOKEN: peerToken, ...ordinaryEnv } = process.env;
  // Own artifacts use the ordinary job token; only peer reads receive the scoped token.
  const ghEnv = { ...ordinaryEnv, GH_TOKEN: repo === requesterRepository ? process.env.GH_TOKEN : peerToken || process.env.GH_TOKEN };
  const ghJson = args => JSON.parse(command('gh', ['api', ...args], { env: ghEnv }));
  const run = ghJson([`repos/${repo}/actions/runs/${runId}`]);
  const list = ghJson([`repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`]);
  const artifacts = list.artifacts.filter(a => a.name === artifactName(releaseId, operation));
  assert(artifacts.length === 1, 'Expected one unexpired release artifact');
  const artifact = artifacts[0]; validateArtifactRun(run, repo, runId, artifact);
  // gh run download handles authenticated redirects; inspect only the named JSON.
  const dest = resolve(process.env.RUNNER_TEMP, `w8-input-${repo.split('/')[1]}-${runId}`);
  mkdirSync(dest, { recursive: true });
  command('gh', ['run', 'download', runId, '--repo', repo, '--name', artifact.name, '--dir', dest], { env: ghEnv });
  const bytes = readFileSync(resolve(dest, 'release-manifest.json'));
  assert(sha256(bytes) === expectedHash, 'Manifest SHA-256 mismatch');
  const manifest = JSON.parse(bytes);
  assert(manifest.runId === String(run.id) && manifest.runAttempt === String(run.run_attempt) && manifest.workflowSha === run.head_sha, 'Receipt differs from producing workflow run');
  validateManifest(policy, manifest, { releaseId, operation });
  return manifest;
}
function serviceDescribe(policy, service) { return jsonCommand('gcloud', ['run', 'services', 'describe', service, '--project', policy.project, '--region', policy.region, '--format=json']); }
function revisionDescribe(policy, revision) { return jsonCommand('gcloud', ['run', 'revisions', 'describe', revision, '--project', policy.project, '--region', policy.region, '--format=json']); }
function checkRevision(policy, item) {
  const revision = revisionDescribe(policy, item.revision);
  assert(revision.metadata?.uid === item.revisionUid && revision.status?.imageDigest === item.image, 'Revision UID/digest mismatch');
  assert(revision.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True'), 'Revision not Ready');
  assert(sha256(canonical(templateConfig({ spec: revision.spec }).spec)) === item.revisionSpecHash, 'Immutable revision specification differs');
}
export async function healthProbe(url, audience, fetcher = fetch, token = null) {
  assert(/^https:\/\/[^/]+\.run\.app$/.test(url), 'Unexpected staged health URL');
  const identity = token ?? command('gcloud', ['auth', 'print-identity-token', '--audiences', audience]).trim();
  const response = await fetcher(`${url}/health`, { headers: { Authorization: `Bearer ${identity}` }, redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert(response.status === 200, 'Exact staged revision health failed; no automatic generation/retry');
}
function writeReceipt(manifest, output) {
  mkdirSync(output, { recursive: true });
  const bytes = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(resolve(output, 'release-manifest.json'), bytes);
  const hash = sha256(bytes);
  writeFileSync(resolve(output, 'release-manifest.sha256'), `${hash}  release-manifest.json\n`);
  console.log(`Release receipt: ${manifest.releaseId} ${manifest.operation}; SHA-256=${hash}`);
}
export function precheck(policy, env) {
  validateContext(policy, env);
  assert(command('git', ['rev-parse', 'HEAD'], { cwd: env.SOURCE_ROOT }).trim() === policy.sourceSha, 'Checked-out application source differs');
  assert(command('git', ['rev-parse', 'HEAD'], { cwd: env.AUTOMATION_ROOT }).trim() === env.GITHUB_SHA, 'Automation checkout differs from workflow revision');
  if (policy.services.includes('nxclip-web') && env.OPERATION === 'build_publish') validateBuildValues(policy, env);
}
export async function execute(policy, env) {
  precheck(policy, env);
  const output = resolve(env.RECEIPT_DIR);
  const manifest = { schemaVersion: 1, releaseId: env.RELEASE_ID, repository: policy.repository, sourceSha: policy.sourceSha, workflowSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, project: policy.project, region: policy.region, operation: env.OPERATION, createdAt: new Date().toISOString(), services: [] };
  const save = () => writeReceipt(manifest, output);
  if (env.OPERATION === 'build_publish') {
    if (policy.services.includes('nxclip-web')) validateBuildValues(policy, env);
    const tag = `${env.RELEASE_ID}-${policy.sourceSha.slice(0, 12)}-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
    for (const service of policy.services) assertTagAbsent(policy, service, tag);
    for (const service of policy.services) {
      const imageTag = `${policy.registry}/${service}:${tag}`;
      const args = ['build', '--label', `org.opencontainers.image.revision=${policy.sourceSha}`, '--label', `org.opencontainers.image.source=https://github.com/${policy.repository}`, '--tag', imageTag, '--file', policy.services.includes('nxclip-web') ? 'Dockerfile' : `apps/${service}/Dockerfile`];
      if (service === 'nxclip-web') for (const [key, value] of Object.entries(policy.publicBuildValues)) args.push('--build-arg', `${key}=${value}`);
      args.push('.');
      command('docker', args, { cwd: env.SOURCE_ROOT });
      assertTagAbsent(policy, service, tag);
      command('docker', ['push', imageTag]);
      const remote = jsonCommand('gcloud', ['artifacts', 'docker', 'images', 'describe', imageTag, '--project', policy.project, '--format=json']);
      const digest = remote.image_summary?.digest;
      assert(/^sha256:[a-f0-9]{64}$/.test(digest || ''), 'Remote registry digest missing');
      manifest.services.push({ service, image: `${policy.registry}/${service}@${digest}`, releaseTag: tag, revision: null, previousTraffic: null, stagingStatus: 'not-staged', promotionStatus: 'not-promoted', buildReceipt: { sourceSha: policy.sourceSha, workflowSha: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, ciChecks: 'workflow-source-checks-passed', ...(service === 'nxclip-web' ? { publicBuildValues: policy.publicBuildValues } : {}) } });
      save();
    }
    return;
  }
  const inputOperation = env.OPERATION === 'stage' ? 'build_publish' : 'stage';
  const input = await obtainManifest(policy.repository, env.MANIFEST_RUN_ID, env.MANIFEST_SHA256, env.RELEASE_ID, inputOperation, policy, policy.repository);
  manifest.inputManifestSha256 = env.MANIFEST_SHA256;
  manifest.services = clone(input.services); save();
  let verifyPeerState = () => {};
  if (env.OPERATION === 'promote' || env.OPERATION === 'rollback') {
    if (env.OPERATION === 'promote') assert(env.SMOKE_ACCEPTANCE === 'accepted' && env.BACKGROUND_READINESS === 'retain-disabled-reviewed', 'Promotion requires owner smoke acceptance and reviewed disabled-background policy');
    const peer = { ...policy, repository: policy.peerRepository, sourceSha: policy.peerSourceSha, services: policy.peerServices };
    const peerManifest = await obtainManifest(policy.peerRepository, env.PEER_RUN_ID, env.PEER_MANIFEST_SHA256, env.RELEASE_ID, 'stage', peer, policy.repository);
    manifest.peer = { repository: policy.peerRepository, runId: env.PEER_RUN_ID, manifestSha256: env.PEER_MANIFEST_SHA256 };
    verifyPeerState = () => {
      for (const item of peerManifest.services) {
        checkRevision(peer, item);
        const current = serviceDescribe(peer, item.service);
        assert(current.status?.latestCreatedRevisionName === item.revision && current.status?.latestReadyRevisionName === item.revision && sha256(canonical(templateConfig(current.spec.template))) === item.configHash, 'Peer staging state has changed');
        validatePeerTraffic(policy, item, current, env.OPERATION);
      }
    };
    verifyPeerState();
    if (env.OPERATION === 'promote') manifest.ownerAcceptance = { smoke: env.SMOKE_ACCEPTANCE, background: env.BACKGROUND_READINESS };
  }
  // Prevalidate every target before performing the first mutation.
  const baselines = new Map();
  for (const item of manifest.services) {
    const current = serviceDescribe(policy, item.service); baselines.set(item.service, current);
    assert(current.status?.latestCreatedRevisionName === current.status?.latestReadyRevisionName, 'Existing pending/unready revision; stop');
    if (env.OPERATION === 'stage') { traffic(current); expectedTemplate(current, item.image, policy.safetyOverrides[item.service]); }
    else { checkRevision(policy, item); (env.OPERATION === 'promote' ? promotionArgs : rollbackArgs)(policy, item, current); }
  }
  // Reverse dependency order for rollback; backend promotion order is policy order.
  const items = env.OPERATION === 'rollback' ? [...manifest.services].reverse() : manifest.services;
  for (const item of items) {
    const current = serviceDescribe(policy, item.service);
    assert(canonical(current) === canonical(baselines.get(item.service)), 'Cloud Run changed since preflight; stop without overwriting');
    if (env.OPERATION === 'stage') {
      const suffix = `w8-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
      const tag = suffix;
      assert(!(current.status?.traffic || []).some(t => t.tag === tag), 'Staging tag already exists');
      item.previousTraffic = traffic(current);
      item.previousRevision = current.status.latestReadyRevisionName;
      item.previousConfigHash = sha256(canonical(templateConfig(current.spec.template)));
      item.revision = `${item.service}-${suffix}`;
      item.stagingStatus = 'attempting'; save();
      command('gcloud', deploymentArgs(policy, item.service, item.image, suffix, tag));
      const after = serviceDescribe(policy, item.service);
      item.stagingStatus = 'deployed-unverified'; save();
      validatePreservation(current, after, item.image, policy.safetyOverrides[item.service]);
      assert(after.status.latestCreatedRevisionName === item.revision && after.status.latestReadyRevisionName === item.revision, 'Wrong/unready staged revision');
      const revision = revisionDescribe(policy, item.revision);
      item.revisionUid = revision.metadata.uid;
      item.configHash = sha256(canonical(templateConfig(after.spec.template)));
      item.revisionSpecHash = sha256(canonical(templateConfig({ spec: revision.spec }).spec));
      assert(item.revisionSpecHash === sha256(canonical(templateConfig(after.spec.template).spec)), 'Service and revision specifications differ');
      checkRevision(policy, item);
      const tagged = after.status.traffic.find(t => t.tag === tag && t.revisionName === item.revision);
      assert(tagged?.url, 'Tagged revision route missing');
      item.stagingStatus = 'deployed'; save();
      await healthProbe(tagged.url, after.status.url);
      item.smoke = { health: 'pass', paidGeneration: 'not-executed', integratedBrowserUat: 'not-executed' };
      item.stagingStatus = 'verified';
    } else {
      checkRevision(policy, item);
      const args = (env.OPERATION === 'promote' ? promotionArgs : rollbackArgs)(policy, item, current);
      // Cross-repository locks do not exist; recheck the peer immediately before
      // each approved traffic operation, not only at dispatch preflight.
      verifyPeerState();
      item.promotionStatus = env.OPERATION === 'promote' ? 'attempting' : 'rollback-attempting'; save();
      command('gcloud', args);
      const after = serviceDescribe(policy, item.service);
      const expected = env.OPERATION === 'promote' ? [{ revisionName: item.revision, percent: 100 }] : item.previousTraffic;
      assert(canonical(traffic(after)) === canonical(expected), 'Resulting traffic differs from requested exact revisions');
      assert(canonical(serviceConfig(current)) === canonical(serviceConfig(after)) && canonical(templateConfig(current.spec.template)) === canonical(templateConfig(after.spec.template)), 'Traffic operation changed service configuration');
      item.promotionStatus = env.OPERATION === 'promote' ? 'promoted' : 'rolled-back';
    }
    save();
  }
}
export function validatePeerTraffic(policy, item, current, operation = 'promote') {
  const promoted = [{ revisionName: item.revision, percent: 100 }];
  if (operation === 'rollback') {
    const atBaseline = canonical(traffic(current)) === canonical(item.previousTraffic);
    if (policy.services.includes('nxclip-web')) {
      assert(atBaseline || canonical(traffic(current)) === canonical(promoted), 'Frontend rollback blocked: backend traffic is outside this release');
    } else {
      assert(atBaseline, 'Backend rollback requires frontend rollback to its exact baseline first');
    }
    return;
  }
  assert(operation === 'promote', 'Unsupported peer traffic operation');
  if (policy.services.includes('nxclip-web')) {
    assert(canonical(traffic(current)) === canonical(promoted), 'Frontend promotion requires backend candidates already promoted');
  } else {
    assert(canonical(traffic(current)) === canonical(item.previousTraffic), 'Backend promotion requires frontend still staged at baseline traffic');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const policy = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'w8-release-policy.json'), 'utf8'));
  const operation = process.argv.includes('--check') ? async () => precheck(policy, process.env) : () => execute(policy, process.env);
  operation().catch(error => {
    // Never echo raw upstream errors; partial safe receipts are uploaded on failure.
    console.error(error instanceof ReleaseGuardError ? `W8 release stopped: ${error.message}` : 'W8 release stopped: unexpected response/transport failure; raw upstream data suppressed. No automatic retry/rollback.');
    process.exitCode = 1;
  });
}
