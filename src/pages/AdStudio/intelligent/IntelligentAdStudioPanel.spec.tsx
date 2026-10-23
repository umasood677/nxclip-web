import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import fixture from '../../../../tools/fixtures/intelligent-ad-studio.json';
import { IntelligentAdStudioPanel } from './IntelligentAdStudioPanel';
import type { CreativeContext } from './contracts/ad-creative-proposals';
import { sanitizeSceneGraphForClient } from '../canvas/sanitizeSceneGraph';
const context = fixture as CreativeContext;
const props = { context, slot: { graph: context.graph, revision: 0, variationId: context.variationId, productLayerId: 'product', commit: () => { throw Error('SSR cannot commit'); }, createVariation: () => { throw Error('SSR cannot create'); } }, assetUrls: {}, store: { read: () => null, write: () => { }, remove: () => { } }, measure: () => ({ height: 1, maxWidth: 1, missingGlyphs: [] }), onContextChange: () => { } };
test('enhancement panel is inaccessible by default', () => { assert.equal(renderToStaticMarkup(<IntelligentAdStudioPanel {...props}/>), ''); });
test('explicit local panel reuses SceneStage and exposes review, DNA, findings and adaptation controls', () => { const html = renderToStaticMarkup(<IntelligentAdStudioPanel {...props} enabled/>); for (const text of ['LOCAL SYNTHETIC ONLY', 'Creative Director command', 'Creative DNA', 'Smart Canvas', 'Campaign format', 'Propose edit'])
    assert.ok(html.includes(text)); });
test('sanitizer retains declared metadata and strips private source keys', () => { const graph = structuredClone(context.graph); graph.creativeMetadata = { mood: 'declared calm', lighting: 'left' }; const p = graph.layers.find(l => l.id === 'product')!; if (p.type === 'image')
    p.storageKey = 'private-secret'; const output = sanitizeSceneGraphForClient(graph)!; assert.deepEqual(output.creativeMetadata, graph.creativeMetadata); assert.ok(!JSON.stringify(output).includes('private-secret')); });
