import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execute, sha256, canonical, traffic, templateConfig, FAILED_WEB_RECOVERY, withCommandExecutorForTest } from './w8-cloud-run.mjs';

const local = JSON.parse(readFileSync(new URL('./w8-release-policy.json', import.meta.url)));
local.preserveServices = []; // Full-release scenarios exercise every mutation path.
// Historical three-service recovery fixtures must not depend on a narrower hotfix policy.
if(local.services.includes('ai-service'))local.services=['ai-service','content-service','api-gateway'];
else local.peerServices=['ai-service','content-service','api-gateway'];
const workflowSha = 'a'.repeat(40), digest = 'b'.repeat(64);
const overrides = {
  'ai-service': { AI_DB_RUN_MIGRATIONS: 'false', AI_DB_SYNCHRONIZE: 'false', AI_QUEUE_WORKERS_ENABLED: 'false' },
  'content-service': { CONTENT_DB_RUN_MIGRATIONS: 'false', CONTENT_DB_SYNCHRONIZE: 'false', CONTENT_BACKGROUND_POLLERS_ENABLED: 'false', OUTBOX_DISPATCHER_ENABLED: 'false' },
  'api-gateway': {}, 'nxclip-web': {}
};
const peer = { ...local, repository: local.peerRepository, sourceSha: local.peerSourceSha, peerRepository: local.repository, peerSourceSha: local.sourceSha, services: local.peerServices, peerServices: local.services };
const backend = [local, peer].find(p => p.services.includes('ai-service'));
const frontend = [local, peer].find(p => p.services.includes('nxclip-web'));
const copy = object => JSON.parse(JSON.stringify(object));
function oldService(name) {
  return {
    metadata: { annotations: { 'run.googleapis.com/ingress': 'all' } },
    spec: { template: { metadata: { annotations: { 'run.googleapis.com/cloudsql-instances': 'approved:region:db' } }, spec: { serviceAccountName: 'existing@project.invalid', containers: [{ image: `old/${name}@sha256:${'c'.repeat(64)}`, resources: { limits: { memory: '1Gi' } }, env: [{ name: 'SECRET', valueFrom: { secretKeyRef: { name: 'existing', key: '5' } } }, { name: 'CONTENT_SKIP_MIGRATIONS', value: '016.sql,017.sql' }] }] } } },
    status: { url: `https://${name}-uc.a.run.app`, latestCreatedRevisionName: `${name}-old`, latestReadyRevisionName: `${name}-old`, traffic: [{ revisionName: `${name}-old`, percent: 100 }] }
  };
}

// Complete controller simulator: no real git, gh, Docker, gcloud or HTTP operation.
// The fake provider applies actual argv updates rather than calling the controller's
// expectedTemplate/promotion/rollback helpers to manufacture matching responses.
class Harness {
  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), 'nxclip-w8-recovery-'));
    this.policies = new Map([backend, frontend].map(p => [p.repository, { ...p, safetyOverrides: Object.fromEntries(p.services.map(s => [s, overrides[s]])) }]));
    this.states = new Map([...backend.services, ...frontend.services].map(s => [s, oldService(s)]));
    this.revisions = new Map(); this.artifacts = new Map(); this.stages = new Map(); this.builds = new Map();
    this.calls = []; this.healthCalls = []; this.nextRun = 100; this.options = {}; this.activeRepository = null;
    for (const p of this.policies.values()) {
      const runId = String(this.nextRun++);
      this.builds.set(p.repository, this.record(p, { schemaVersion: 1, releaseId: 'w8-recovery', repository: p.repository, sourceSha: p.sourceSha, workflowSha, runId, runAttempt: '1', project: p.project, region: p.region, operation: 'build_publish', services: p.services.map(service => ({ service, image: `${p.registry}/${service}@sha256:${digest}`, revision: null, previousTraffic: null, stagingStatus: 'not-staged', promotionStatus: 'not-promoted', buildReceipt: { sourceSha: p.sourceSha, workflowSha, runId, publicBuildValues: p.publicBuildValues } })) }, 'success'));
    }
  }
  record(policy, manifest, conclusion) {
    const bytes = JSON.stringify(manifest);
    const ref = { repository: policy.repository, runId: manifest.runId, manifest, bytes, hash: sha256(bytes), conclusion, expired: false };
    this.artifacts.set(`${policy.repository}:${ref.runId}`, ref); return ref;
  }
  dispose() {
    assert(resolve(this.dir).startsWith(resolve(tmpdir()) + '\\nxclip-w8-recovery-') || resolve(this.dir).startsWith(resolve(tmpdir()) + '/nxclip-w8-recovery-'));
    rmSync(this.dir, { recursive: true, force: true });
  }
  allocation(service) { return traffic(this.states.get(service)); }
  atBaseline(service) { return canonical(this.allocation(service)) === canonical([{ revisionName: service + '-old', percent: 100 }]); }
  trafficCalls() { return this.calls.filter(c => c.exe === 'gcloud' && c.args[1] === 'services' && c.args[2] === 'update-traffic'); }
  deployCalls() { return this.calls.filter(c => c.exe === 'gcloud' && c.args[1] === 'deploy'); }
  runner = (exe, args, options) => {
    // The peer secret must not leak as an unrelated subprocess environment variable.
    assert(!Object.hasOwn(options.env || {}, 'W8_RELEASE_READ_TOKEN'));
    this.calls.push({ exe, args: [...args] });
    const ok = value => ({ status: 0, stdout: typeof value === 'string' ? value : JSON.stringify(value) });
    const fail = () => ({ status: 1, stderr: 'simulated command failure' });
    if (exe === 'git') return ok(options.cwd === 'application' ? this.policies.get(this.activeRepository).sourceSha : workflowSha);
    if (exe === 'unzip') {
      assert.deepEqual(args.slice(0, 2), ['-j', '-o']);
      assert.equal(args[3], 'release-manifest.json');
      const dir = args[args.indexOf('-d') + 1]; mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'release-manifest.json'), readFileSync(args[2])); return ok('');
    }
    if (exe === 'gh') {
      if (args[1]?.endsWith('/actions/artifacts/' + FAILED_WEB_RECOVERY.artifactId + '/zip')) {
        const ref = this.artifacts.get(FAILED_WEB_RECOVERY.repository + ':' + FAILED_WEB_RECOVERY.runId);
        return { status: 0, stdout: Buffer.from(ref.bytes) };
      }
      if (args[0] === 'run') {
        const repo = args[args.indexOf('--repo') + 1], ref = this.artifacts.get(`${repo}:${args[2]}`);
        this.checkToken(repo, options.env.GH_TOKEN);
        const dir = args[args.indexOf('--dir') + 1]; mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'release-manifest.json'), ref.bytes); return ok('');
      }
      const match = args[1].match(/^repos\/(.+\/.+)\/actions\/runs\/(\d+)(?:\/attempts\/(\d+))?(\/artifacts\?per_page=100)?$/);
      assert(match, 'Unexpected GitHub request'); const [, repo, runId, attempt, list] = match;
      this.checkToken(repo, options.env.GH_TOKEN);
      const ref = this.artifacts.get(`${repo}:${runId}`); assert(ref, 'Unknown mock artifact');
      if (list) return ok({ artifacts: this.options.missingFailedArtifact && runId === FAILED_WEB_RECOVERY.runId ? [] : [{ id: runId === FAILED_WEB_RECOVERY.runId ? Number(FAILED_WEB_RECOVERY.artifactId) : 123, name: `${ref.manifest.releaseId}-${ref.manifest.operation}`, expired: ref.expired, workflow_run: { head_sha: ref.manifest.workflowSha } }, ...(this.options.rerunArtifact && runId === FAILED_WEB_RECOVERY.runId ? [{ id: 999, name: `${ref.manifest.releaseId}-stage`, expired: false, workflow_run: { head_sha: ref.manifest.workflowSha } }] : [])] });
      return ok({ id: Number(runId), run_attempt: Number(ref.manifest.runAttempt), head_sha: ref.manifest.workflowSha, status: 'completed', conclusion: ref.conclusion, path: '.github/workflows/deploy-w8-selective.yml', event: 'workflow_dispatch', head_branch: 'master', repository: { full_name: repo } });
    }
    assert.equal(exe, 'gcloud', 'No real executable may escape the simulator');
    assert.equal(options.env.GH_TOKEN, 'synthetic-own-token', 'Peer credential leaked to a cloud subprocess');
    if (args[0] === 'auth') return ok('synthetic-iam-token');
    if (args[1] === 'revisions') { this.options.onRevision?.(args[3], this); return ok(this.revisions.get(args[3])); }
    if (args[1] === 'services' && args[2] === 'describe') {
      this.options.onDescribe?.(args[3], this); return ok(this.states.get(args[3]));
    }
    if (args[1] === 'deploy') {
      const service = args[2], state = this.states.get(service);
      assert(this.policies.get(this.activeRepository).services.includes(service));
      assert(args.includes('--no-traffic')); assert(!args.includes('--set-env-vars'));
      const container = state.spec.template.spec.containers[0]; container.image = args[args.indexOf('--image') + 1];
      const entries = new Map(container.env.map(e => [e.name, e]));
      const index = args.indexOf('--update-env-vars');
      if (index >= 0) for (const pair of args[index + 1].split(',')) { const [name, value] = pair.split('='); entries.set(name, { name, value }); }
      container.env = [...entries.values()];
      const suffix = args[args.indexOf('--revision-suffix') + 1], tag = args[args.indexOf('--tag') + 1];
      const revision = `${service}-${suffix}`; state.status.latestCreatedRevisionName = state.status.latestReadyRevisionName = revision;
      state.status.traffic.push({ revisionName: revision, tag, url: `https://${tag}---${service}-uc.a.run.app` });
      this.revisions.set(revision, { metadata: { uid: revision + '-uid' }, spec: copy(state.spec.template.spec), status: { imageDigest: container.image, conditions: [{ type: 'Ready', status: 'True' }] } });
      this.options.afterDeploy?.(service, state); return ok(state);
    }
    if (args[1] === 'services' && args[2] === 'update-traffic') {
      const service = args[3]; assert(this.policies.get(this.activeRepository).services.includes(service));
      if (this.options.failTraffic === service && !this.options.failAfterApply) return fail();
      const state = this.states.get(service), tags = state.status.traffic.filter(t => t.tag).map(t => ({ ...t, percent: undefined }));
      state.status.traffic = args[args.indexOf('--to-revisions') + 1].split(',').map(pair => { const [revisionName, percent] = pair.split('='); return { revisionName, percent: Number(percent) }; }).concat(tags);
      this.options.afterTraffic?.(service, this);
      if (this.options.failTraffic === service && this.options.failAfterApply) return fail();
      return ok(state);
    }
    throw new Error('Unexpected simulated gcloud command');
  };
  checkToken(repo, token) { assert.equal(token, repo === this.activeRepository ? 'synthetic-own-token' : 'synthetic-peer-token'); }
  async dispatch(policy, operation, inputs = {}) {
    const p = this.policies.get(policy.repository), runId = String(this.nextRun++);
    const input = inputs.own || (operation === 'stage' ? this.builds : this.stages).get(p.repository);
    const other = inputs.peer || this.stages.get(p.peerRepository);
    const output = join(this.dir, `receipt-${runId}`);
    const env = { GITHUB_REPOSITORY: p.repository, GITHUB_SHA: workflowSha, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: '1', RELEASE_ID: 'w8-recovery', SOURCE_SHA: p.sourceSha, OPERATION: operation, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/master', GITHUB_WORKFLOW_REF: `${p.repository}/.github/workflows/deploy-w8-selective.yml@refs/heads/master`, GITHUB_ACTOR: p.repository.split('/')[0], GITHUB_TRIGGERING_ACTOR: p.repository.split('/')[0], W8_RELEASE_MAINTAINERS: '[]', SOURCE_ROOT: 'application', AUTOMATION_ROOT: 'automation', RECEIPT_DIR: output, MANIFEST_RUN_ID: input?.runId || '', MANIFEST_SHA256: input?.hash || '', PEER_RUN_ID: other?.runId || '', PEER_MANIFEST_SHA256: other?.hash || '', SMOKE_ACCEPTANCE: 'accepted', BACKGROUND_READINESS: 'retain-disabled-reviewed', ...inputs.env };
    const keys = ['RUNNER_TEMP', 'GH_TOKEN', 'W8_RELEASE_READ_TOKEN']; const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    const oldFetch = globalThis.fetch; this.activeRepository = p.repository;
    process.env.RUNNER_TEMP = this.dir; process.env.GH_TOKEN = 'synthetic-own-token';
    if (operation === 'promote' || operation === 'rollback') process.env.W8_RELEASE_READ_TOKEN = 'synthetic-peer-token'; else delete process.env.W8_RELEASE_READ_TOKEN;
    globalThis.fetch = async url => { this.healthCalls.push(url); return { status: this.options.healthFailure && url.includes('---' + this.options.healthFailure + '-') ? 503 : 200 }; };
    let error;
    try { await withCommandExecutorForTest(this.runner, () => execute(p, env)); } catch (caught) { error = caught; }
    finally { globalThis.fetch = oldFetch; for (const k of keys) { if (previous[k] === undefined) delete process.env[k]; else process.env[k] = previous[k]; } }
    let manifest, ref;
    try { manifest = JSON.parse(readFileSync(join(output, 'release-manifest.json'))); ref = this.record(p, manifest, error ? 'failure' : 'success'); } catch { /* guard can fail before a receipt exists */ }
    if (!error && operation === 'stage') this.stages.set(p.repository, ref);
    return { error, manifest, ref };
  }
  async stageBoth() {
    for (const p of [backend, frontend]) { const result = await this.dispatch(p, 'stage'); assert.equal(result.error, undefined); }
  }
  async promoteBoth() {
    for (const p of [backend, frontend]) { const result = await this.dispatch(p, 'promote'); assert.equal(result.error, undefined); }
  }
}
async function scenario(operation) { const h = new Harness(); try { await operation(h); } finally { h.dispose(); } }

test('controller: partial backend promotion stops once, refuses resume, explicit rollback restores all targets', () => scenario(async h => {
  await h.stageBoth(); const start = h.trafficCalls().length;
  h.options.failTraffic = 'content-service';
  const result = await h.dispatch(backend, 'promote'); assert(result.error); assert.equal(result.manifest.services[0].promotionStatus, 'promoted');
  assert(!h.atBaseline('ai-service')); assert(h.atBaseline('content-service')); assert(h.atBaseline('api-gateway'));
  assert.equal(h.trafficCalls().length - start, 2, 'No retry, later promotion or automatic rollback');
  delete h.options.failTraffic;
  const resumed = await h.dispatch(backend, 'promote'); assert.match(resumed.error.message, /baseline traffic changed/);
  assert.equal(h.trafficCalls().length - start, 2);
  const rolled = await h.dispatch(backend, 'rollback'); assert.equal(rolled.error, undefined);
  assert.deepEqual(h.trafficCalls().slice(-3).map(c => c.args[3]), ['api-gateway', 'content-service', 'ai-service']);
  assert(backend.services.every(s => h.atBaseline(s)));
}));

test('controller: both promoted requires frontend rollback before any backend rollback command', () => scenario(async h => {
  await h.stageBoth(); await h.promoteBoth(); const count = h.trafficCalls().length;
  const blocked = await h.dispatch(backend, 'rollback'); assert.match(blocked.error.message, /frontend rollback.*baseline first/);
  assert.equal(h.trafficCalls().length, count);
  assert.equal((await h.dispatch(frontend, 'rollback')).error, undefined);
  assert.equal((await h.dispatch(backend, 'rollback')).error, undefined);
  assert([...h.states.keys()].every(s => h.atBaseline(s)));
}));

test('controller: frontend rollback accepts a partially promoted backend', () => scenario(async h => {
  await h.stageBoth(); h.options.failTraffic = 'content-service'; assert((await h.dispatch(backend, 'promote')).error);
  delete h.options.failTraffic;
  assert.equal((await h.dispatch(frontend, 'rollback')).error, undefined);
  assert(!h.atBaseline('ai-service')); assert(h.atBaseline('content-service'));
}));

test('controller: failed staged health retains partial receipt and cannot supply a promotion manifest', () => scenario(async h => {
  h.options.healthFailure = 'content-service';
  const failed = await h.dispatch(backend, 'stage'); assert.match(failed.error.message, /health failed/);
  assert.equal(failed.manifest.services[0].stagingStatus, 'verified'); assert.equal(failed.manifest.services[1].stagingStatus, 'deployed');
  assert.equal(h.deployCalls().length, 2); assert.equal(h.trafficCalls().length, 0);
  assert(backend.services.every(s => h.atBaseline(s)));
  const result = await h.dispatch(backend, 'promote', { own: failed.ref }); assert.match(result.error.message, /completed\/successful/);
  assert.equal(h.trafficCalls().length, 0);
}));

test('controller: a separately dispatched restage is possible after health failure, never automatic', () => scenario(async h => {
  h.options.healthFailure = 'ai-service'; assert((await h.dispatch(backend, 'stage')).error);
  assert.equal(h.deployCalls().length, 1);
  delete h.options.healthFailure;
  const second = await h.dispatch(backend, 'stage'); assert.equal(second.error, undefined);
  assert.equal(h.deployCalls().length, 4); assert.equal(h.trafficCalls().length, 0);
  assert(backend.services.every(s => h.atBaseline(s)));
}));

test('controller: stage configuration drift stops subsequent deployments without corrective writes', () => scenario(async h => {
  h.options.afterDeploy = (name, state) => { if (name === 'ai-service') state.spec.template.spec.serviceAccountName = 'changed'; };
  const result = await h.dispatch(backend, 'stage'); assert.match(result.error.message, /configuration drift/);
  assert.equal(h.deployCalls().length, 1); assert.equal(h.trafficCalls().length, 0);
  assert.equal(result.manifest.services[0].stagingStatus, 'deployed-unverified');
}));

for (const operation of ['promote', 'rollback']) test(`controller: own configuration drift blocks all ${operation} traffic writes`, () => scenario(async h => {
  await h.stageBoth(); h.states.get('content-service').spec.template.spec.containers[0].resources.limits.memory = '2Gi';
  const result = await h.dispatch(backend, operation); assert.match(result.error.message, /configuration (changed|drift)/);
  assert.equal(h.trafficCalls().length, 0);
}));

test('controller: peer configuration drift blocks backend rollback before traffic writes', () => scenario(async h => {
  await h.stageBoth(); h.states.get('nxclip-web').spec.template.spec.containers[0].resources.limits.memory = '2Gi';
  const result = await h.dispatch(backend, 'rollback'); assert.match(result.error.message, /Peer staging state has changed/);
  assert.equal(h.trafficCalls().length, 0);
}));

test('controller: peer ordering is rechecked before every backend rollback operation', () => scenario(async h => {
  await h.stageBoth(); await h.promoteBoth(); assert.equal((await h.dispatch(frontend, 'rollback')).error, undefined);
  const before = h.trafficCalls().length;
  h.options.afterTraffic = (service, harness) => {
    if (service === 'api-gateway') {
      const state = harness.states.get('nxclip-web'); state.status.traffic = [{ revisionName: state.status.latestReadyRevisionName, percent: 100 }];
    }
  };
  const result = await h.dispatch(backend, 'rollback'); assert.match(result.error.message, /frontend rollback.*baseline first/);
  assert.equal(h.trafficCalls().length - before, 1); assert(h.atBaseline('api-gateway')); assert(!h.atBaseline('content-service'));
}));

test('controller: failed rollback retains progress and can resume only in another approved dispatch', () => scenario(async h => {
  await h.stageBoth(); await h.promoteBoth(); assert.equal((await h.dispatch(frontend, 'rollback')).error, undefined);
  h.options.failTraffic = 'content-service'; const before = h.trafficCalls().length;
  const failed = await h.dispatch(backend, 'rollback'); assert(failed.error); assert(h.atBaseline('api-gateway')); assert(!h.atBaseline('content-service'));
  assert.equal(failed.manifest.services.find(s => s.service === 'api-gateway').promotionStatus, 'rolled-back');
  assert.equal(h.trafficCalls().length - before, 2);
  delete h.options.failTraffic;
  assert.equal((await h.dispatch(backend, 'rollback')).error, undefined);
  assert(backend.services.every(s => h.atBaseline(s)));
}));

test('controller: uncertain CLI result after applied traffic never retries and remains explicitly recoverable', () => scenario(async h => {
  await h.stageBoth(); h.options.failTraffic = 'ai-service'; h.options.failAfterApply = true;
  const failed = await h.dispatch(backend, 'promote'); assert(failed.error); assert.equal(h.trafficCalls().length, 1); assert(!h.atBaseline('ai-service'));
  assert.equal(failed.manifest.services[0].promotionStatus, 'attempting');
  h.options = {};
  assert.equal((await h.dispatch(backend, 'rollback')).error, undefined); assert(backend.services.every(s => h.atBaseline(s)));
}));

for (const operation of ['promote', 'rollback']) test(`controller: missing peer manifest blocks ${operation} without local traffic changes`, () => scenario(async h => {
  await h.stageBoth(); const result = await h.dispatch(backend, operation, { env: { PEER_RUN_ID: '', PEER_MANIFEST_SHA256: '' } });
  assert.match(result.error.message, /producing run ID/); assert.equal(h.trafficCalls().length, 0);
}));

for (const failure of ['hash', 'expired', 'digest']) test(`controller: ${failure} integrity failure blocks promotion`, () => scenario(async h => {
  await h.stageBoth(); const own = h.stages.get(backend.repository); const extra = {};
  if (failure === 'hash') extra.MANIFEST_SHA256 = '0'.repeat(64);
  if (failure === 'expired') own.expired = true;
  if (failure === 'digest') h.revisions.get(own.manifest.services[0].revision).status.imageDigest = 'wrong';
  const result = await h.dispatch(backend, 'promote', { env: extra });
  assert.match(result.error.message, failure === 'hash' ? /SHA-256 mismatch/ : failure === 'expired' ? /provenance\/expiry/ : /UID\/digest mismatch/);
  assert.equal(h.trafficCalls().length, 0);
}));

test('workflow: peer token is step-scoped only to coordinated operations', () => {
  const yaml = readFileSync(new URL('../../.github/workflows/deploy-w8-selective.yml', import.meta.url), 'utf8');
  const beforeSteps = yaml.slice(0, yaml.indexOf('    steps:'));
  assert(!beforeSteps.includes('W8_RELEASE_READ_TOKEN'));
  const steps = yaml.split(/\n      - name: /).slice(1);
  assert.equal(steps.filter(s => s.includes('W8_RELEASE_READ_TOKEN')).length, 1);
  const step = steps.find(s => s.includes('W8_RELEASE_READ_TOKEN'));
  assert(step.includes("if: inputs.operation == 'promote' || inputs.operation == 'rollback'"));
  assert(step.includes('node automation/tools/release/w8-cloud-run.mjs'));
});

for (const patch of [{ GITHUB_ACTOR: 'outsider' }, { GITHUB_TRIGGERING_ACTOR: 'outsider' }, { GITHUB_REF: 'refs/heads/other' }, { GITHUB_EVENT_NAME: 'push' }]) {
  test(`controller: unauthorized context ${Object.keys(patch)[0]} stops before external commands`, () => scenario(async h => {
    const result = await h.dispatch(backend, 'stage', { env: patch });
    assert(result.error); assert.equal(h.calls.length, 0); assert.equal(h.trafficCalls().length, 0);
  }));
}

test('controller: template activation changes only AI/Content; Gateway is verified without deploy or traffic calls', () => scenario(async h => {
  const p=h.policies.get(backend.repository);p.preserveServices=['api-gateway'];
  p.safetyOverrides['ai-service']={...p.safetyOverrides['ai-service'],AD_STUDIO_REAL_IMAGES_ENABLED:'true',AI_MODEL_ROUTER_ENABLED:'true'};
  p.safetyOverrides['content-service']={...p.safetyOverrides['content-service'],AD_STUDIO_BRAND_TEMPLATES_ENABLED:'true',AD_STUDIO_REAL_IMAGES_ENABLED:'true'};
  const gateway=h.states.get('api-gateway');gateway.spec.template.spec.containers[0].image=h.builds.get(backend.repository).manifest.services.find(s=>s.service==='api-gateway').image;
  h.revisions.set('api-gateway-old',{metadata:{uid:'original-gateway-uid'},spec:copy(gateway.spec.template.spec),status:{imageDigest:gateway.spec.template.spec.containers[0].image,conditions:[{type:'Ready',status:'True'}]}});
  const before=canonical(gateway);
  await h.stageBoth();
  assert.equal(h.stages.get(backend.repository).manifest.services.find(s=>s.service==='api-gateway').stagingMode,'existing-verified');
  assert.deepEqual(h.deployCalls().map(c=>c.args[2]),['ai-service','content-service','nxclip-web']);
  assert.equal(h.states.get('ai-service').spec.template.spec.containers[0].env.find(e=>e.name==='AD_STUDIO_REAL_IMAGES_ENABLED').value,'true');
  assert.equal(h.states.get('ai-service').spec.template.spec.containers[0].env.find(e=>e.name==='AI_MODEL_ROUTER_ENABLED').value,'true');
  assert.equal(h.states.get('content-service').spec.template.spec.containers[0].env.find(e=>e.name==='CONTENT_BACKGROUND_POLLERS_ENABLED').value,'false');
  await h.promoteBoth();
  assert.equal((await h.dispatch(frontend,'rollback')).error,undefined);
  assert.equal((await h.dispatch(backend,'rollback')).error,undefined);
  assert.equal(canonical(h.states.get('api-gateway')),before);
  assert(!h.trafficCalls().some(c=>c.args[3]==='api-gateway'));
}));
test('controller: preserved Gateway image mismatch blocks staging before any service mutation', () => scenario(async h => {
  h.policies.get(backend.repository).preserveServices=['api-gateway'];
  const result=await h.dispatch(backend,'stage');
  assert.match(result.error.message,/Preserved service image differs/);assert.equal(h.deployCalls().length,0);assert.equal(h.trafficCalls().length,0);
}));


test('controller: AI/Content-only hotfix stages, promotes and rolls back without Gateway access',()=>scenario(async h=>{
 const p=h.policies.get(backend.repository),f=h.policies.get(frontend.repository);
 p.services=['ai-service','content-service'];delete p.safetyOverrides['api-gateway'];f.peerServices=[...p.services];
 const build=h.builds.get(backend.repository);const manifest=copy(build.manifest);manifest.services=manifest.services.filter(s=>s.service!=='api-gateway');
 h.builds.set(backend.repository,h.record(p,manifest,'success'));
 const before=canonical(h.states.get('api-gateway'));
 await h.stageBoth();await h.promoteBoth();
 assert.equal((await h.dispatch(frontend,'rollback')).error,undefined);
 assert.equal((await h.dispatch(backend,'rollback')).error,undefined);
 assert.equal(canonical(h.states.get('api-gateway')),before);
 assert(!h.calls.some(c=>c.args.includes('api-gateway')));
}));

// This fixture models a Cloud Run terminal failure, unlike the earlier HTTP-only health failure.
function terminalWebFailure(h) {
  const pin = FAILED_WEB_RECOVERY, p = h.policies.get(frontend.repository), current = h.states.get(pin.service);
  current.metadata.name = pin.service; current.metadata.generation = 118; current.status.observedGeneration = 118; current.status.conditions = [{ type: 'Ready', status: 'False' }];
  current.status.latestCreatedRevisionName = current.status.latestReadyRevisionName = pin.healthyRevision;
  current.status.traffic = [{ revisionName: pin.healthyRevision, percent: 100 }];
  const previousConfigHash = sha256(canonical(templateConfig(current.spec.template)));
  h.revisions.set(pin.healthyRevision, { metadata: { name: pin.healthyRevision, uid: 'healthy-uid', annotations: copy(current.spec.template.metadata.annotations) }, spec: copy(current.spec.template.spec), status: { imageDigest: current.spec.template.spec.containers[0].image, conditions: [{ type: 'Ready', status: 'True' }] } });
  const build = copy(h.builds.get(p.repository).manifest);
  build.releaseId = pin.releaseId; build.services[0].image = pin.image;
  const built = h.record(p, build, 'success'); h.builds.set(p.repository, built);
  current.spec.template.spec.containers[0].image = pin.image; current.status.latestCreatedRevisionName = pin.revision;
  const failure = { status: 'False', reason: 'HealthCheckContainerError', message: 'Quota exceeded for total allowable CPU per project per region.\nLogs URL: synthetic', lastTransitionTime: '2026-11-05T05:07:00Z' };
  h.revisions.set(pin.revision, { metadata: { name: pin.revision, uid: 'failed-uid', creationTimestamp: '2026-11-05T05:06:22Z', annotations: copy(current.spec.template.metadata.annotations) }, spec: copy(current.spec.template.spec), status: { imageDigest: pin.image, conditions: [{ type: 'Ready', ...failure }, { type: 'ContainerHealthy', ...failure }, { type: 'ContainerReady', status: 'True' }, { type: 'Active', status: 'False' }] } });
  const receipt = { ...copy(build), operation: 'stage', runId: pin.runId, runAttempt: pin.runAttempt, workflowSha: pin.workflowSha, inputManifestSha256: built.hash, services: [{ ...copy(build.services[0]), revision: pin.revision, previousRevision: pin.healthyRevision, previousTraffic: copy(current.status.traffic), previousConfigHash, stagingStatus: 'attempting', promotionStatus: 'not-promoted' }] };
  const env = { RELEASE_ID: pin.releaseId };
  const updateReceipt = mutate => { if (mutate) mutate(receipt); const ref = h.record(p, receipt, 'failure'); env.FAILED_REVISION_RECOVERY = pin.revision + '@sha256:' + ref.hash; return ref; };
  updateReceipt();
  return { pin, p, current, receipt, env, updateReceipt, failed: h.revisions.get(pin.revision), healthy: h.revisions.get(pin.healthyRevision) };
}
test('terminal recovery: owner-authorized stage uses same digest, preserves failed revision/config/100% traffic and emits evidence', () => scenario(async h => {
  const f = terminalWebFailure(h), beforeFailed = canonical(f.failed), beforeHealthy = canonical(f.healthy), beforeTraffic = canonical(traffic(f.current));
  const r = await h.dispatch(frontend, 'stage', { env: f.env });
  assert.equal(r.error, undefined); assert.equal(h.deployCalls().length, 1); assert.equal(h.trafficCalls().length, 0);
  const args = h.deployCalls()[0].args; assert(args.includes('--no-traffic')); assert(args.includes(f.pin.image));
  for (const flag of ['--cpu', '--memory', '--min-instances', '--max-instances', '--cpu-boost', '--no-cpu-boost', '--update-env-vars']) assert(!args.includes(flag));
  assert.equal(canonical(h.revisions.get(f.pin.revision)), beforeFailed); assert.equal(canonical(h.revisions.get(f.pin.healthyRevision)), beforeHealthy); assert.equal(canonical(traffic(f.current)), beforeTraffic);
  assert.equal(r.manifest.failedRevisionRecovery.failedRunAttempt, '1'); assert.equal(r.manifest.failedRevisionRecovery.failedRevisionUid, 'failed-uid');
  assert(h.calls.some(c => c.exe === 'gh' && c.args[1]?.endsWith('/attempts/1')));
  assert(!h.calls.some(c => c.args.includes('delete')));
  const second = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(second.error.message, /superseded/); assert.equal(h.deployCalls().length, 1);
}));
const recoveryRejections = {
  'missing authorization': f => { delete f.env.FAILED_REVISION_RECOVERY; },
  'incorrect authorization': f => { f.env.FAILED_REVISION_RECOVERY = 'true'; },
  'wrong service': f => { f.p.services = ['other-web']; },
  'wrong project': f => { f.p.project = 'other-project'; },
  'wrong region': f => { f.p.region = 'europe-west1'; },
  'wrong revision': f => { f.current.status.latestCreatedRevisionName = 'nxclip-web-unreviewed'; },
  'unobserved service generation': f => { f.current.status.observedGeneration = 117; },
  'missing service generation': f => { delete f.current.metadata.generation; },
  'pending service': f => { f.current.status.conditions[0].status = 'Unknown'; },
  'pending revision': f => { f.failed.status.conditions[0].status = 'Unknown'; },
  'unknown revision': f => { f.failed.status.conditions = []; },
  'non-quota terminal failure': f => { f.failed.status.conditions[0].message = 'Container failed to start'; },
  'ambiguous terminal conditions': f => { f.failed.status.conditions.push(copy(f.failed.status.conditions[0])); },
  'missing terminal timestamp': f => { delete f.failed.status.conditions[0].lastTransitionTime; },
  'reconciling revision': f => { f.failed.status.conditions.push({ type: 'Reconciling', status: 'True' }); },
  'receipt hash mismatch': f => { f.env.FAILED_REVISION_RECOVERY = f.pin.revision + '@sha256:' + '0'.repeat(64); },
  'receipt targets another revision': f => { f.updateReceipt(r => { r.services[0].revision = 'nxclip-web-other'; }); },
  'receipt from rerun rather than original attempt': f => { f.updateReceipt(r => { r.runAttempt = '2'; }); },
  'receipt from unrelated workflow': f => { f.updateReceipt(r => { r.workflowSha = 'f'.repeat(40); }); },
  'mismatched build receipt': f => { f.updateReceipt(r => { r.services[0].buildReceipt.runId = 'unrelated'; }); },
  'mismatched successful build hash': f => { f.updateReceipt(r => { r.inputManifestSha256 = 'e'.repeat(64); }); },
  'mismatched receipt digest': f => { f.updateReceipt(r => { r.services[0].image = 'wrong'; }); },
  'mismatched live digest': f => { f.failed.status.imageDigest = 'wrong'; },
  'configuration drift': f => { f.current.spec.template.spec.containers[0].resources.limits.memory = '2Gi'; },
  'source configuration hash mismatch': f => { f.updateReceipt(r => { r.services[0].previousConfigHash = 'e'.repeat(64); }); },
  'startup/scaling annotation drift': f => { f.current.spec.template.metadata.annotations['run.googleapis.com/startup-cpu-boost'] = 'false'; },
  'healthy revision unready': f => { f.healthy.status.conditions[0].status = 'False'; },
  'healthy traffic changed': f => { f.current.status.traffic = [{ revisionName: f.pin.healthyRevision, percent: 90 }, { revisionName: 'nxclip-web-other', percent: 10 }]; },
  'failed revision has tag': f => { f.current.status.traffic.push({ revisionName: f.pin.revision, tag: 'unexpected' }); },
  'maintainer instead of owner': f => { Object.assign(f.env, { GITHUB_ACTOR: 'maintainer', GITHUB_TRIGGERING_ACTOR: 'maintainer', W8_RELEASE_MAINTAINERS: '["maintainer"]' }); },
  'rerun authorization': f => { f.env.GITHUB_RUN_ATTEMPT = '2'; },
  'recovery used for promotion': f => { f.env.OPERATION = 'promote'; },
};
for (const [name, mutate] of Object.entries(recoveryRejections)) test('terminal recovery rejects ' + name + ' without cloud mutation', () => scenario(async h => {
  const f = terminalWebFailure(h); mutate(f);
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert(r.error, name + ' must fail'); assert.equal(h.deployCalls().length, 0); assert.equal(h.trafficCalls().length, 0);
}));
test('terminal recovery rejects missing failed-run artifact without deployment', () => scenario(async h => {
  const f = terminalWebFailure(h); h.options.missingFailedArtifact = true;
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(r.error.message, /Missing or ambiguous/); assert.equal(h.deployCalls().length, 0);
}));
test('terminal recovery rechecks identity between preflight and mutation', () => scenario(async h => {
  const f = terminalWebFailure(h); let reads = 0;
  h.options.onRevision = name => { if (name === f.pin.revision && ++reads === 2) f.failed.metadata.uid = 'replacement-uid'; };
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(r.error.message, /identity changed/); assert.equal(h.deployCalls().length, 0);
}));
test('terminal recovery CLI failure after creating a revision is never automatically retried or replayed', () => scenario(async h => {
  const f = terminalWebFailure(h), delegate = h.runner;
  h.runner = (exe, args, options) => { const result = delegate(exe, args, options); return exe === 'gcloud' && args[1] === 'deploy' ? { status: 1, stderr: 'uncertain CLI result' } : result; };
  const first = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(first.error.message, /no automatic retry/); assert.equal(h.deployCalls().length, 1);
  const replay = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(replay.error.message, /superseded/); assert.equal(h.deployCalls().length, 1); assert.equal(h.trafficCalls().length, 0);
}));

test('terminal recovery rejects absent original failed-run receipt without deployment', () => scenario(async h => {
  const f = terminalWebFailure(h); h.artifacts.delete(f.pin.repository + ':' + f.pin.runId);
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert(r.error); assert.equal(h.deployCalls().length, 0);
}));
test('terminal recovery rejects expired original failed-run artifact', () => scenario(async h => {
  const f = terminalWebFailure(h); h.artifacts.get(f.pin.repository + ':' + f.pin.runId).expired = true;
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(r.error.message, /Missing or ambiguous/); assert.equal(h.deployCalls().length, 0);
}));
test('terminal recovery cannot change the approved build image even if the failed receipt is changed too', () => scenario(async h => {
  const f = terminalWebFailure(h), built = copy(h.builds.get(f.p.repository).manifest);
  built.services[0].image = built.services[0].image.replace(/sha256:.*/, 'sha256:' + 'e'.repeat(64));
  const replacement = h.record(f.p, built, 'success'); h.builds.set(f.p.repository, replacement);
  f.updateReceipt(r => { r.inputManifestSha256 = replacement.hash; r.services[0].image = built.services[0].image; });
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert.match(r.error.message, /service identity changed/); assert.equal(h.deployCalls().length, 0);
}));

test('terminal recovery selects the pinned original artifact when reruns retain identical artifact names', () => scenario(async h => {
  const f = terminalWebFailure(h); h.options.rerunArtifact = true;
  const r = await h.dispatch(frontend, 'stage', { env: f.env }); assert.equal(r.error, undefined); assert.equal(h.deployCalls().length, 1);
  assert.equal(r.manifest.failedRevisionRecovery.failedArtifactId, FAILED_WEB_RECOVERY.artifactId);
  assert(h.calls.some(c => c.exe === 'gh' && c.args[1]?.endsWith('/actions/artifacts/' + FAILED_WEB_RECOVERY.artifactId + '/zip')));
}));
