/** Standalone local synthetic harness for the EXISTING disabled W8.7 editor. No application route. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import fixture from './fixtures/intelligent-ad-studio.json';
import { W87SyntheticCompositionEditor } from '../src/pages/AdStudio/composition/W87SyntheticCompositionEditor';
import { toW87EditorViewModel } from '../src/pages/AdStudio/composition/w87-synthetic-editor';
import { IntelligentAdStudioPanel } from '../src/pages/AdStudio/intelligent/IntelligentAdStudioPanel';
import { validateAdSceneGraphDto } from '../src/pages/AdStudio/intelligent/contracts/ad-scene-graph';
import type { CreativeContext } from '../src/pages/AdStudio/intelligent/contracts/ad-creative-proposals';
import type { MeasureCampaignText } from '../src/pages/AdStudio/intelligent/contracts/ad-campaign-adapt';
const context = { ...fixture, graph: validateAdSceneGraphDto(fixture.graph) } as CreativeContext;
const store = { read: (key: string) => localStorage.getItem(key), write: (key: string, value: string) => localStorage.setItem(key, value), remove: (key: string) => localStorage.removeItem(key) };
const measure: MeasureCampaignText = layer => {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
    const size = layer.fontSize ?? 24;
    ctx.font = (layer.fontWeight ?? 400) + ' ' + size + 'px Inter';
    const lines: string[] = [];
    for (const paragraph of layer.text.split('\n')) {
        let line = '';
        for (const word of paragraph.split(/(\s+)/)) {
            const next = line + word;
            if (line && ctx.measureText(next).width > layer.width) {
                lines.push(line.trimEnd());
                line = word.trimStart();
            }
            else
                line = next;
        }
        lines.push(line);
    }
    return { height: lines.length * size * (layer.lineHeight ?? 1.25), maxWidth: Math.max(0, ...lines.map(l => ctx.measureText(l).width)), missingGlyphs: document.fonts.check(size + 'px Inter') ? [] : ['font-not-loaded'] };
};
function Demo() {
    const [policy, setPolicy] = useState(context);
    const [model, setModel] = useState(() => toW87EditorViewModel({ isolationApproval: 'pendingReview', productPreservationOk: true, providerGatesReady: false, variations: ['focal', 'atmosphere', 'typography'].map((intent, i) => ({ variationId: i === 0 ? context.variationId : 'synthetic-v' + (i + 1), intent: intent as 'focal' | 'atmosphere' | 'typography', label: 'Synthetic ' + intent, productLayerId: 'product', sceneGraph: structuredClone(context.graph), backgroundSha256: 'synthetic-only', distinctivenessKey: intent })) }));
    const assetUrls = { 'synthetic-product': location.origin + '/product.svg', 'synthetic-logo': location.origin + '/logo.svg' };
    return <main><h1>Intelligent Ad Studio · local proof</h1><p>No private assets, providers, production routes or exports. Existing Stage A canvas, variation state and undo/redo are reused.</p><W87SyntheticCompositionEditor enabled model={model} assetUrls={assetUrls} onModelChange={setModel} renderEnhancements={slot => <IntelligentAdStudioPanel enabled context={policy} slot={slot} assetUrls={assetUrls} store={store} measure={measure} onContextChange={setPolicy}/>}/><details><summary>Editable output SceneGraphs</summary><pre>{JSON.stringify(model, null, 2)}</pre></details></main>;
}
void document.fonts.load('400 24px Inter').then(() => createRoot(document.getElementById('root')!).render(<Demo />));
