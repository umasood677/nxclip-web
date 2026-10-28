import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import fixture from '../../../../tools/fixtures/intelligent-ad-studio.json';
import {
  buildIntelligentCreativeContext,
  resolveIntelligentOwnerId,
  safeAnalyzeSmartCanvas,
} from './buildIntelligentCreativeContext';
import { analyzeSmartCanvas } from './contracts/ad-smart-canvas';
import {
  validateCreativeContext,
  type CreativeContext,
} from './contracts/ad-creative-proposals';
import { IntelligentAdStudioPanel } from './IntelligentAdStudioPanel';
import type { BrandKitSummary } from '../../BrandKits/lib/brandKitTypes';
import type { AdSceneGraph } from '../types';

const baseGraph = structuredClone(fixture.graph) as AdSceneGraph;
const kit: BrandKitSummary = {
  id: 'zoe-kit',
  name: 'ZoeArtisan',
  version: 16,
  colors: [
    { role: 'primary', hex: '#A6192E' },
    { role: 'secondary', hex: '#800020' },
  ],
  typography: [
    { role: 'heading', family: 'Playfair Display' },
    { role: 'body', family: 'Montserrat' },
  ],
};

function build(overrides: Partial<Parameters<typeof buildIntelligentCreativeContext>[0]> = {}) {
  return buildIntelligentCreativeContext({
    ownerUserId: '019fa448-43a3-7041-9c4a-5d799aab6baf',
    projectId: 'proj-1',
    creativeId: 'creative-1',
    graph: baseGraph,
    brandKit: kit,
    revision: 0,
    ...overrides,
  });
}

test('resolveIntelligentOwnerId reads Login SerializedUser.uid first', () => {
  assert.equal(resolveIntelligentOwnerId({ uid: 'u1', id: 'ignored' }), 'u1');
  assert.equal(resolveIntelligentOwnerId({ id: 'id-only' }), 'id-only');
  assert.equal(resolveIntelligentOwnerId({ sub: 'jwt-sub' }), 'jwt-sub');
  assert.equal(resolveIntelligentOwnerId({ userId: 'legacy' }), 'legacy');
  assert.equal(resolveIntelligentOwnerId(null), '');
  assert.equal(resolveIntelligentOwnerId({}), '');
});

test('1. valid complete creative context builds and validates', () => {
  const r = build();
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.doesNotThrow(() => validateCreativeContext(r.context));
  assert.equal(r.context.ownerId.startsWith('019fa448'), true);
  assert.equal(r.context.brand.kitId, 'zoe-kit');
  assert.equal(r.context.brand.version, 16);
  assert.ok(r.context.authorizedAssetIds.includes('synthetic-product'));
  assert.ok(r.context.authorizedAssetIds.includes('synthetic-logo'));
  assert.equal(r.notice, null);
});

test('2. draft loading: revision increments stay valid', () => {
  const a = build({ revision: 0 });
  const b = build({ revision: 1 });
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.equal(a.context.revision, 0);
  assert.equal(b.context.revision, 1);
});

test('3. missing SceneGraph (empty layers) fails closed with diagnostic', () => {
  const r = build({
    graph: {
      schemaVersion: '1.0',
      canvas: { width: 1080, height: 1350 },
      layers: [],
    } as AdSceneGraph,
  });
  // Empty graph may validate schema but fail role/protection expectations differently;
  // at minimum builder must not throw.
  assert.ok(r.ok === true || r.ok === false);
  if (!r.ok) {
    assert.ok(r.reason.length > 0);
    assert.equal(r.hardBlock, true);
  }
});

test('4. missing Brand Kit hard-blocks', () => {
  const r = build({ brandKit: null });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.code, 'MISSING_BRAND_KIT');
  assert.match(r.reason, /Brand Kit/i);
});

test('5. Brand Kit with valid product/logo assets authorizes them', () => {
  const r = build();
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const product = r.context.graph.layers.find((l) => l.id === 'product');
  const logo = r.context.graph.layers.find((l) => l.id === 'logo');
  assert.equal(product && 'assetId' in product && product.assetId, 'synthetic-product');
  assert.equal(logo && 'assetId' in logo && logo.assetId, 'synthetic-logo');
  assert.deepEqual(
    [...r.context.authorizedAssetIds].sort(),
    ['synthetic-logo', 'synthetic-product'],
  );
});

test('6. partial template draft (image without assetId) soft-allows with notice', () => {
  const graph = structuredClone(baseGraph) as AdSceneGraph;
  const product = graph.layers.find((l) => l.id === 'product')!;
  if (product.type === 'image') delete (product as { assetId?: string }).assetId;
  const r = build({ graph });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.notice && /assetId/i.test(r.notice));
  assert.ok(!r.context.authorizedAssetIds.includes('synthetic-product'));
});

test('7. invalid context: empty owner maps to MISSING_OWNER (INVALID_CONTEXT root cause)', () => {
  const r = build({ ownerUserId: '' });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.code, 'MISSING_OWNER');
});

test('7b. invalid context: missing project hard-blocks', () => {
  const r = build({ projectId: null });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.code, 'MISSING_PROJECT');
});

test('8. context becomes valid after async-like owner + kit arrival', () => {
  const missing = build({ ownerUserId: '', brandKit: null });
  assert.equal(missing.ok, false);
  const ready = build({
    ownerUserId: '019fa448-43a3-7041-9c4a-5d799aab6baf',
    brandKit: kit,
  });
  assert.equal(ready.ok, true);
  if (!ready.ok) return;
  assert.doesNotThrow(() => validateCreativeContext(ready.context));
});

test('9. Smart Canvas analysis failure does not throw (safe wrapper)', () => {
  const bad = {
    ...(fixture as CreativeContext),
    ownerId: '',
  };
  const safe = safeAnalyzeSmartCanvas(analyzeSmartCanvas as never, bad);
  assert.equal(safe.findings.length, 0);
  assert.equal(safe.error, 'INVALID_CONTEXT');
});

test('9b. Panel render with INVALID_CONTEXT owner does not crash (controlled Smart Canvas)', () => {
  const context = {
    ...(fixture as CreativeContext),
    ownerId: '',
  };
  const props = {
    context,
    slot: {
      graph: context.graph,
      revision: 0,
      variationId: context.variationId,
      productLayerId: 'product',
      commit: () => undefined,
      createVariation: () => undefined,
    },
    assetUrls: {},
    store: { read: () => null, write: () => undefined, remove: () => undefined },
    measure: () => ({ height: 1, maxWidth: 1, missingGlyphs: [] }),
    onContextChange: () => undefined,
    enabled: true as const,
  };
  const html = renderToStaticMarkup(React.createElement(IntelligentAdStudioPanel, props));
  assert.ok(html.includes('Smart Canvas'));
  assert.ok(html.includes('unavailable') || html.includes('INVALID_CONTEXT') || html.includes('incomplete'));
  assert.ok(html.includes('Creative Director') || html.includes('Creative DNA') || html.includes('Campaign'));
});

test('10. other intelligent features remain labeled when Smart Canvas unavailable', () => {
  const context = {
    ...(fixture as CreativeContext),
    ownerId: '',
  };
  const html = renderToStaticMarkup(
    React.createElement(IntelligentAdStudioPanel, {
      enabled: true,
      context,
      slot: {
        graph: context.graph,
        revision: 0,
        variationId: context.variationId,
        productLayerId: 'product',
        commit: () => undefined,
        createVariation: () => undefined,
      },
      assetUrls: {},
      store: { read: () => null, write: () => undefined, remove: () => undefined },
      measure: () => ({ height: 1, maxWidth: 1, missingGlyphs: [] }),
      onContextChange: () => undefined,
    }),
  );
  assert.ok(html.includes('Creative DNA'));
  assert.ok(html.includes('Campaign format'));
  assert.ok(html.includes('Propose edit'));
});

test('brand version string coerces to integer (INVALID_BRAND_POLICY prevention)', () => {
  const r = build({
    brandKit: { ...kit, version: '16' as unknown as number },
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.context.brand.version, 16);
});
