import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonical, sha256, validateContext, validateReviewers, validateBuildValues, validateManifest, validateTraffic, traffic, templateConfig, serviceConfig, expectedTemplate, validatePreservation, deploymentArgs, promotionArgs, rollbackArgs, assertTagAbsent, validateArtifactRun, healthProbe, validatePeerTraffic, execute, withCommandExecutorForTest } from './w8-cloud-run.mjs';

const policy = JSON.parse(readFileSync(new URL('./w8-release-policy.json', import.meta.url)));
const sha = 'a'.repeat(40), digest = 'b'.repeat(64);
const service = policy.services[0];
const image = `${policy.registry}/${service}@sha256:${digest}`;
const env = { GITHUB_REPOSITORY: policy.repository, SOURCE_SHA: policy.sourceSha, GITHUB_SHA: sha, RELEASE_ID: 'w8-test-a', OPERATION: 'stage', GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1' };
const copy = x => JSON.parse(JSON.stringify(x));
function baseline() {
  return {
    metadata: { annotations: { 'run.googleapis.com/ingress': 'internal-and-cloud-load-balancing' }, labels: { owned: 'existing' } },
    spec: { template: { metadata: { annotations: { 'run.googleapis.com/cloudsql-instances': 'project:region:db', 'run.googleapis.com/vpc-access-connector': 'existing', 'autoscaling.knative.dev/maxScale': '5' } }, spec: { serviceAccountName: 'runtime@example.invalid', containerConcurrency: 8, timeoutSeconds: 300, containers: [{ image: 'old@sha256:' + 'c'.repeat(64), resources: { limits: { memory: '1Gi', cpu: '1' } }, env: [{ name: 'DB_URL', valueFrom: { secretKeyRef: { name: 'database', key: '7' } } }, { name: 'CONTENT_SKIP_MIGRATIONS', value: '016_existing.sql,017_existing.sql' }, { name: 'EXISTING_FEATURE', value: 'true' }] }] } } },
    status: { latestCreatedRevisionName: `${service}-old`, latestReadyRevisionName: `${service}-old`, traffic: [{ revisionName: `${service}-old`, percent: 80 }, { revisionName: `${service}-older`, percent: 20, tag: 'previous' }] }
  };
}
function staged() {
  const before = baseline(), after = copy(before);
  const expected = expectedTemplate(before, image, policy.safetyOverrides[service]);
  after.spec.template = expected;
  after.status.latestCreatedRevisionName = after.status.latestReadyRevisionName = `${service}-w8-100-1`;
  after.status.traffic.push({ revisionName: `${service}-w8-100-1`, tag: 'w8-100-1', url: 'https://tag---service-uc.a.run.app' });
  return { before, after, item: { service, image, revision: `${service}-w8-100-1`, revisionUid: 'uid', previousTraffic: traffic(before), configHash: sha256(canonical(templateConfig(after.spec.template))) } };
}
function manifest() {
  return { schemaVersion: 1, releaseId: env.RELEASE_ID, repository: policy.repository, sourceSha: policy.sourceSha, workflowSha: sha, runId: '100', runAttempt: '1', project: policy.project, region: policy.region, operation: 'build_publish', services: policy.services.map(service => ({ service, image: `${policy.registry}/${service}@sha256:${digest}`, buildReceipt: { sourceSha: policy.sourceSha, workflowSha: sha, runId: '99', publicBuildValues: policy.publicBuildValues } })) };
}
test('exact repository and approved application source accepted independently of workflow SHA', () => validateContext(policy, env));
for (const [key, value] of Object.entries({ GITHUB_REPOSITORY: 'other/repo', SOURCE_SHA: sha, GITHUB_SHA: 'master', RELEASE_ID: 'w8-test;echo bad', OPERATION: 'deploy-all', GITHUB_RUN_ID: 'x' })) {
  test(`reject invalid context ${key}`, () => assert.throws(() => validateContext(policy, { ...env, [key]: value })));
}
test('development requires a real reviewer rule', () => {
  assert.throws(() => validateReviewers({ name: 'development', protection_rules: [] }), /required-reviewer/);
  validateReviewers({ name: 'development', protection_rules: [{ type: 'required_reviewers', reviewers: [{}] }] });
});
test('approved frontend feature and public build configuration exact', () => {
  validateBuildValues(policy, policy.publicBuildValues);
  for (const key of Object.keys(policy.publicBuildValues)) assert.throws(() => validateBuildValues(policy, { ...policy.publicBuildValues, [key]: 'unapproved' }), new RegExp(key));
});
test('manifest carries immutable images and exact service list', () => validateManifest(policy, manifest(), { releaseId: env.RELEASE_ID, operation: 'build_publish' }));
for (const mutation of ['identity', 'latest', 'source', 'release', 'missing-build', 'wrong-operation', 'duplicate']) {
  test(`reject manifest ${mutation}`, () => {
    const m = manifest();
    if (mutation === 'identity') m.services[0].service = 'identity-service';
    if (mutation === 'latest') m.services[0].image = `${policy.registry}/${service}:latest`;
    if (mutation === 'source') m.sourceSha = sha;
    if (mutation === 'release') m.releaseId = 'w8-other';
    if (mutation === 'missing-build') delete m.services[0].buildReceipt;
    if (mutation === 'wrong-operation') m.operation = 'stage';
    if (mutation === 'duplicate') m.services.push(m.services[0]);
    assert.throws(() => validateManifest(policy, m, { releaseId: env.RELEASE_ID, operation: 'build_publish' }));
  });
}
test('manifest byte hash changes on tampering', () => assert.notEqual(sha256(canonical(manifest())), sha256(canonical({ ...manifest(), sourceSha: sha }))));
test('tag collision and registry authentication failures stop publication', () => {
  assert.throws(() => assertTagAbsent(policy, service, 'w8-tag', () => ({ status: 0, stdout: '{}' })), /already exists/);
  assert.throws(() => assertTagAbsent(policy, service, 'w8-tag', () => ({ status: 1, stderr: 'PERMISSION_DENIED' })), /vacancy/);
  assert.throws(() => assertTagAbsent(policy, service, 'w8-tag', () => ({ status: null, stderr: '' })), /vacancy/);
  assert.throws(() => assertTagAbsent(policy, service, 'w8-tag', () => ({ status: 1, stderr: 'DNS hostname not found' })), /vacancy/);
  assertTagAbsent(policy, service, 'w8-tag', () => ({ status: 1, stderr: 'NOT_FOUND: image not found' }));
});
test('registry domain cannot be spoofed through regex punctuation', () => {
  const m = manifest(); m.services[0].image = m.services[0].image.replace('docker.pkg.dev', 'dockerXpkgXdev');
  assert.throws(() => validateManifest(policy, m, { releaseId: env.RELEASE_ID, operation: 'build_publish' }));
});
test('peer traffic enforces backend-before-frontend promotion', () => {
  const { before, after, item } = staged();
  if (policy.services.includes('nxclip-web')) {
    assert.throws(() => validatePeerTraffic(policy, item, before));
    after.status.traffic = [{ revisionName: item.revision, percent: 100 }];
    validatePeerTraffic(policy, item, after);
  } else {
    validatePeerTraffic(policy, item, before);
    after.status.traffic = [{ revisionName: item.revision, percent: 100 }];
    assert.throws(() => validatePeerTraffic(policy, item, after));
  }
});
test('full build controller publishes only exact allowlist with no deployment commands', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nxclip-w8-build-test-'));
  const calls = [];
  let pushed = false;
  const runner = (exe, args, opts) => {
    calls.push([exe, ...args]);
    if (exe === 'git') return { status: 0, stdout: opts.cwd === 'app' ? policy.sourceSha : sha };
    if (exe === 'gh') return { status: 0, stdout: JSON.stringify({ name: 'development', protection_rules: [{ type: 'required_reviewers', reviewers: [{}] }] }) };
    if (exe === 'docker') { pushed = args[0] === 'push'; return { status: 0, stdout: '' }; }
    if (exe === 'gcloud' && args.slice(0, 4).join(' ') === 'artifacts docker images describe') {
      if (pushed) { pushed = false; return { status: 0, stdout: JSON.stringify({ image_summary: { digest: 'sha256:' + digest } }) }; }
      return { status: 1, stderr: 'NOT_FOUND: image' };
    }
    throw new Error('Unexpected simulated command');
  };
  try {
    await withCommandExecutorForTest(runner, () => execute(policy, { ...env, ...policy.publicBuildValues, OPERATION: 'build_publish', SOURCE_ROOT: 'app', AUTOMATION_ROOT: 'automation', RECEIPT_DIR: dir }));
    const result = JSON.parse(readFileSync(join(dir, 'release-manifest.json')));
    validateManifest(policy, result, { releaseId: env.RELEASE_ID, operation: 'build_publish' });
    assert.equal(calls.filter(c => c[0] === 'docker' && c[1] === 'push').length, policy.services.length);
    assert(!calls.some(c => c.includes('deploy') || c.includes('update-traffic') || c.some(a => String(a).endsWith(':latest'))));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('full stage controller preserves traffic, probes exact tags and records identities', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nxclip-w8-stage-test-'));
  const calls = [], requests = [];
  const source = manifest();
  const bytes = JSON.stringify(source);
  const states = new Map(policy.services.map(s => {
    const b = baseline(); b.status.latestCreatedRevisionName = b.status.latestReadyRevisionName = s + '-old';
    b.status.traffic = [{ revisionName: s + '-old', percent: 100 }];
    return [s, b];
  }));
  const oldTemp = process.env.RUNNER_TEMP, oldFetch = globalThis.fetch;
  process.env.RUNNER_TEMP = dir;
  globalThis.fetch = async url => { requests.push(url); return { status: 200 }; };
  const runner = (exe, args, opts) => {
    calls.push([exe, ...args]); const ok = value => ({ status: 0, stdout: typeof value === 'string' ? value : JSON.stringify(value) });
    if (exe === 'git') return ok(opts.cwd === 'app' ? policy.sourceSha : sha);
    if (exe === 'gh') {
      if (args[0] === 'run') { const dest = args[args.indexOf('--dir') + 1]; mkdirSync(dest, { recursive: true }); writeFileSync(join(dest, 'release-manifest.json'), bytes); return ok(''); }
      if (args[1].endsWith('/environments/development')) return ok({ name: 'development', protection_rules: [{ type: 'required_reviewers', reviewers: [{}] }] });
      if (args[1].includes('/artifacts?')) return ok({ artifacts: [{ name: env.RELEASE_ID + '-build_publish', expired: false, workflow_run: { head_sha: sha } }] });
      return ok({ id: 100, status: 'completed', conclusion: 'success', repository: { full_name: policy.repository }, path: '.github/workflows/deploy-w8-selective.yml', event: 'workflow_dispatch', head_sha: sha, run_attempt: 1 });
    }
    if (exe === 'gcloud') {
      if (args[0] === 'auth') return ok('synthetic-token');
      if (args[1] === 'services') return ok(states.get(args[3]));
      if (args[1] === 'deploy') {
        const s = args[2], state = states.get(s), newImage = args[args.indexOf('--image') + 1], suffix = args[args.indexOf('--revision-suffix') + 1];
        assert(args.includes('--no-traffic'));
        state.spec.template = expectedTemplate(state, newImage, policy.safetyOverrides[s]);
        state.status.latestCreatedRevisionName = state.status.latestReadyRevisionName = `${s}-${suffix}`;
        state.status.url = `https://${s}-uc.a.run.app`;
        state.status.traffic.push({ revisionName: `${s}-${suffix}`, tag: suffix, url: `https://${suffix}---${s}-uc.a.run.app` });
        return ok(state);
      }
      if (args[1] === 'revisions') {
        const state = [...states.values()].find(s => s.status.latestReadyRevisionName === args[3]);
        return ok({ metadata: { uid: args[3] + '-uid' }, spec: state.spec.template.spec, status: { imageDigest: state.spec.template.spec.containers[0].image, conditions: [{ type: 'Ready', status: 'True' }] } });
      }
    }
    throw new Error('Unexpected simulated command');
  };
  try {
    await withCommandExecutorForTest(runner, () => execute(policy, { ...env, SOURCE_ROOT: 'app', AUTOMATION_ROOT: 'automation', RECEIPT_DIR: join(dir, 'receipts'), MANIFEST_RUN_ID: '100', MANIFEST_SHA256: sha256(bytes) }));
    const receipt = JSON.parse(readFileSync(join(dir, 'receipts', 'release-manifest.json')));
    validateManifest(policy, receipt, { releaseId: env.RELEASE_ID, operation: 'stage' });
    assert.equal(requests.length, policy.services.length);
    assert(requests.every(u => u.endsWith('/health')));
    assert(!calls.some(c => c.includes('update-traffic') || c[0] === 'docker'));
    for (const s of receipt.services) assert.deepEqual(traffic(states.get(s.service)), s.previousTraffic);
  } finally { globalThis.fetch = oldFetch; if (oldTemp === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = oldTemp; rmSync(dir, { recursive: true, force: true }); }
});
test('staging uses no traffic and only reviewed startup overrides', () => {
  for (const role of policy.services) {
    const args = deploymentArgs(policy, role, `${policy.registry}/${role}@sha256:${digest}`, 'w8-100-1', 'w8-100-1');
    assert(args.includes('--no-traffic'));
    assert(!args.some(a => /--(set-env-vars|env-vars-file|allow-unauthenticated|service-account|set-cloudsql|cpu|memory)/.test(a)));
    assert(!args.join(' ').includes('CONTENT_SKIP_MIGRATIONS'));
  }
  for (const role of ['identity-service', 'media-worker', 'feed-service']) assert.throws(() => deploymentArgs(policy, role, image, 'suffix', 'tag'));
});
test('preserves all existing settings and migration filename list', () => {
  const { before, after } = staged(); validatePreservation(before, after, image, policy.safetyOverrides[service]);
  assert.equal(after.spec.template.spec.containers[0].env.find(e => e.name === 'CONTENT_SKIP_MIGRATIONS').value, '016_existing.sql,017_existing.sql');
});
for (const mutation of ['secret', 'account', 'resource', 'network', 'ingress', 'feature', 'traffic', 'tag']) {
  test(`reject staging ${mutation} drift`, () => {
    const { before, after } = staged();
    const spec = after.spec.template.spec;
    if (mutation === 'secret') spec.containers[0].env.find(e => e.name === 'DB_URL').valueFrom.secretKeyRef.key = 'latest';
    if (mutation === 'account') spec.serviceAccountName = 'other';
    if (mutation === 'resource') spec.containers[0].resources.limits.cpu = '2';
    if (mutation === 'network') after.spec.template.metadata.annotations['run.googleapis.com/vpc-access-connector'] = 'other';
    if (mutation === 'ingress') after.metadata.annotations['run.googleapis.com/ingress'] = 'all';
    if (mutation === 'feature') spec.containers[0].env.find(e => e.name === 'EXISTING_FEATURE').value = 'false';
    if (mutation === 'traffic') after.status.traffic = [{ revisionName: `${service}-w8-100-1`, percent: 100 }];
    if (mutation === 'tag') after.status.traffic.find(t => t.tag === 'previous').revisionName = 'different';
    assert.throws(() => validatePreservation(before, after, image, policy.safetyOverrides[service]));
  });
}
test('normalizes environment ordering without hiding values', () => {
  const a = baseline(), b = baseline(); b.spec.template.spec.containers[0].env.reverse();
  assert.equal(canonical(templateConfig(a.spec.template)), canonical(templateConfig(b.spec.template)));
  assert.deepEqual(serviceConfig(a), serviceConfig(b));
});
test('promotes exact staged revision only', () => {
  const { after, item } = staged(); const args = promotionArgs(policy, item, after);
  assert(args.includes(`${item.revision}=100`)); assert(!args.includes('--to-latest'));
});
for (const mutation of ['traffic', 'revision', 'config']) {
  test(`promotion blocks ${mutation} drift`, () => {
    const { after, item } = staged();
    if (mutation === 'traffic') after.status.traffic = [{ revisionName: 'someone-else', percent: 100 }];
    if (mutation === 'revision') after.status.latestCreatedRevisionName = 'newer';
    if (mutation === 'config') after.spec.template.spec.timeoutSeconds = 900;
    assert.throws(() => promotionArgs(policy, item, after));
  });
}
test('rollback restores exact prior split and can recover partial promotions', () => {
  const { after, item } = staged(); after.status.traffic = [{ revisionName: item.revision, percent: 100 }];
  const args = rollbackArgs(policy, item, after);
  assert(args.includes(item.previousTraffic.map(t => `${t.revisionName}=${t.percent}`).join(',')));
  after.status.traffic = item.previousTraffic; rollbackArgs(policy, item, after);
  after.status.traffic = [{ revisionName: 'foreign', percent: 100 }]; assert.throws(() => rollbackArgs(policy, item, after));
});
test('invalid traffic including symbolic latest is rejected', () => {
  for (const t of [[], [{ latestRevision: true, percent: 100 }], [{ revisionName: 'old', percent: 99 }], [{ revisionName: 'old', percent: 50 }, { revisionName: 'old', percent: 50 }]]) assert.throws(() => validateTraffic(t));
});
test('artifact must come from successful reviewed manual workflow run', () => {
  const run = { id: 100, status: 'completed', conclusion: 'success', repository: { full_name: policy.repository }, path: '.github/workflows/deploy-w8-selective.yml', event: 'workflow_dispatch', head_sha: sha };
  const artifact = { name: 'w8-test-stage', expired: false, workflow_run: { head_sha: sha } };
  validateArtifactRun(run, policy.repository, '100', artifact);
  for (const patch of [{ conclusion: 'failure' }, { event: 'push' }, { path: '.github/workflows/other.yml' }, { repository: { full_name: 'other/repo' } }]) assert.throws(() => validateArtifactRun({ ...run, ...patch }, policy.repository, '100', artifact));
});
test('smoke requests health only without retry or generation', async () => {
  const requests = [];
  await healthProbe('https://tag---service-uc.a.run.app', 'https://service-uc.a.run.app', async (url, opts) => { requests.push({ url, opts }); return { status: 200 }; }, 'synthetic-test-token');
  assert.equal(requests.length, 1); assert.equal(new URL(requests[0].url).pathname, '/health');
  await assert.rejects(healthProbe('https://tag---service-uc.a.run.app', 'https://service-uc.a.run.app', async () => ({ status: 503 }), 'synthetic-test-token'));
});
test('workflow remains manual, scoped, independently approved and artifact driven', () => {
  const yaml = readFileSync(new URL('../../.github/workflows/deploy-w8-selective.yml', import.meta.url), 'utf8');
  assert(yaml.includes('workflow_dispatch:')); assert(!/^\s+(push|pull_request|workflow_run):/m.test(yaml));
  for (const op of ['build_publish', 'stage', 'promote', 'rollback']) assert(yaml.includes(`- ${op}`));
  assert(yaml.includes('environment: development')); assert(yaml.includes('cancel-in-progress: false'));
  assert(yaml.includes('path: application')); assert(yaml.includes('path: automation'));
  assert(yaml.includes('if: always()')); assert(!yaml.includes('docker push') && !yaml.includes('gcloud run deploy'));
});
