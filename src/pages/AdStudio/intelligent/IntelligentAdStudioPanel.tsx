import { adaptCanvasFormat } from '../lib/sceneGraph';
import React, { useMemo, useRef, useState } from 'react';
import { SceneStage } from '../canvas/SceneStage';
import { AD_FORMATS } from '../types';
import type { W87EnhancementSlot } from '../composition/W87SyntheticCompositionEditor';
import { createCreativeProposal, createCreativeReviewGate, INTELLIGENT_AD_STUDIO_ENABLED_DEFAULT, type CreativeContext, type CreativeProposal } from './contracts/ad-creative-proposals';
import { directCreativeCommand } from './contracts/ad-creative-director';
import { applyCreativeDna, createDnaPresetRepository, CREATIVE_DNA_ATTRIBUTES, extractCreativeDna, setCreativeDnaLock, type CreativeDnaPreset, type DnaDocumentStore } from './contracts/ad-creative-dna';
import { analyzeSmartCanvas } from './contracts/ad-smart-canvas';
import { adaptCreativeCampaign, type MeasureCampaignText } from './contracts/ad-campaign-adapt';
import { validateAdSceneGraphDto } from './contracts/ad-scene-graph';
type Props = {
    enabled?: boolean;
    context: CreativeContext;
    slot: W87EnhancementSlot;
    assetUrls: Readonly<Record<string, string>>;
    store: DnaDocumentStore;
    measure: MeasureCampaignText;
    onContextChange: (c: CreativeContext) => void;
};
export function IntelligentAdStudioPanel(props: Props) { if ((props.enabled ?? INTELLIGENT_AD_STUDIO_ENABLED_DEFAULT) !== true)
    return null; return <EnabledPanel {...props}/>; }
function EnabledPanel({ context, slot, assetUrls, store, measure, onContextChange }: Props) {
    const [command, setCommand] = useState('center the product'), [proposal, setProposal] = useState<CreativeProposal | null>(null), [message, setMessage] = useState(''), [options, setOptions] = useState<string[]>([]), [dismissed, setDismissed] = useState<string[]>([]);
    const [preset, setPreset] = useState<CreativeDnaPreset | null>(null), [name, setName] = useState('Synthetic DNA'), [attributes, setAttributes] = useState(['typography']), [format, setFormat] = useState<string>(AD_FORMATS[0]!.id), [mode, setMode] = useState<'constraintAware' | 'proportional'>('constraintAware');
    const current = { ...context, graph: validateAdSceneGraphDto(slot.graph), revision: slot.revision, variationId: slot.variationId };
    const refs = useRef({ current, slot, onContextChange });
    refs.current = { current, slot, onContextChange };
    const gate = useMemo(() => createCreativeReviewGate(() => refs.current.current, (graph, metadata, p) => { const r = refs.current; if (p.provenance.feature === 'campaignAdapt')
        r.slot.createVariation(graph, 'adapt-' + p.proposalId, 'Adapted ' + graph.canvas.width + '×' + graph.canvas.height);
    else {
        r.slot.commit(graph);
        r.onContextChange({ ...r.current, metadata });
    } }), []);
    const repo = useMemo(() => createDnaPresetRepository(context.ownerId, store), [context.ownerId, store]);
    const sequence = useRef(0), id = () => slot.variationId + '-' + (++sequence.current);
    const act = (fn: () => void) => { try {
        setMessage('');
        fn();
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Operation failed');
    } };
    const offer = (p: CreativeProposal) => { const fresh = createCreativeProposal(current, id(), p.operations, p.explanation, p.provenance.feature); gate.register(fresh); setProposal(fresh); };
    const findings = analyzeSmartCanvas(current).filter(f => !dismissed.includes(current.variationId + ':' + current.revision + ':' + f.id));
    const button = 'rounded border border-white/20 bg-white/5 px-2 py-1 text-xs hover:bg-white/10';
    return <section className="space-y-4 rounded border border-white/15 bg-zinc-950 p-3 text-zinc-200" aria-label="Intelligent Ad Studio local prototype">
  <p className="text-xs text-amber-300">LOCAL SYNTHETIC ONLY · deterministic proposals · production disabled</p>
  <div className="flex flex-wrap gap-2"><input aria-label="Creative Director command" className="min-w-60 flex-1 bg-zinc-900 p-2 text-sm" value={command} onChange={e => setCommand(e.target.value)}/><button className={button} onClick={() => act(() => { const r = directCreativeCommand(current, command, id()); if (r.status === 'proposed') {
        offer(r.proposal);
        setOptions([]);
    }
    else {
        setOptions(r.options);
        setMessage(r.message);
    } })}>Propose edit</button></div>
  {options.map(o => <button key={o} className={button} onClick={() => setCommand(o)}>{o}</button>)}
  <details><summary>Creative DNA · presets and creator locks</summary><div className="flex flex-wrap gap-2 p-2">{CREATIVE_DNA_ATTRIBUTES.map(a => <label key={a} className="text-xs"><input type="checkbox" checked={current.locks.includes(a)} onChange={e => act(() => onContextChange(setCreativeDnaLock(current, a, e.target.checked, current.ownerId)))}/> Lock {a}</label>)}</div>
  <input aria-label="DNA preset name" value={name} onChange={e => setName(e.target.value)} className="bg-zinc-900 p-1"/>
  <button className={button} onClick={() => act(() => { const p = extractCreativeDna(current, 'local-preset', name); repo.create(p); setPreset(p); })}>Create preset</button>
  <button className={button} onClick={() => act(() => { setPreset(repo.load('local-preset')); })}>Load saved preset</button>
  <button className={button} disabled={!preset} onClick={() => act(() => { repo.rename('local-preset', name); setPreset(repo.load('local-preset')); })}>Rename</button>
  <button className={button} disabled={!preset} onClick={() => act(() => { const p = extractCreativeDna(current, 'local-preset', name); repo.update(p); setPreset(p); })}>Update</button>
  <button className={button} disabled={!preset} onClick={() => act(() => { repo.remove('local-preset'); setPreset(null); })}>Remove</button>
  <div>{CREATIVE_DNA_ATTRIBUTES.map(a => <label key={a} className="mr-2 text-xs"><input type="checkbox" checked={attributes.includes(a)} onChange={e => setAttributes(e.target.checked ? [...attributes, a] : attributes.filter(x => x !== a))}/> Apply {a}</label>)}</div>
  <button className={button} disabled={!preset} onClick={() => act(() => { if (preset)
        offer(applyCreativeDna(current, preset, attributes as CreativeContext['locks'], id())); })}>Preview selected attributes</button>
  </details>
  <details open><summary>Smart Canvas · {findings.length} findings</summary><ul className="space-y-2">{findings.slice(0, 8).map(f => <li key={f.id} className="border-l border-white/20 pl-2 text-xs"><strong>{f.classification} · {f.detected}</strong><p>{f.why} {f.suggestion}</p><p>Layers: {f.layers.join(', ')}</p>{f.proposal && <button className={button} onClick={() => act(() => offer(f.proposal!))}>Preview fix</button>}<button className={button} onClick={() => setDismissed([...dismissed, current.variationId + ':' + current.revision + ':' + f.id])}>Dismiss</button></li>)}</ul></details>
  <div className="flex flex-wrap gap-2"><select aria-label="Campaign format" value={format} onChange={e => setFormat(e.target.value)} className="bg-zinc-900">{AD_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select><select aria-label="Adaptation mode" value={mode} onChange={e => setMode(e.target.value as typeof mode)} className="bg-zinc-900"><option value="constraintAware">Constraint-aware reflow</option><option value="proportional">Explicit proportional fallback</option></select><button className={button} onClick={() => act(() => { const target = AD_FORMATS.find(f => f.id === format)!; const r = adaptCreativeCampaign(current, { formatId: target.id, width: target.width, height: target.height }, id(), measure, mode, (graph,width,height)=>validateAdSceneGraphDto(adaptCanvasFormat(graph,width,height))); if (r.status === 'conflict')
        throw Error(r.conflicts.join('; ')); offer(r.proposal); })}>Preview new format variation</button></div>
  {proposal && <div className="space-y-2"><p>{proposal.explanation}</p><p className="text-xs">Affected: {proposal.affectedLayerIds.join(', ')} · {proposal.approval}</p>{!proposal.constraints.valid && <p role="alert">{proposal.constraints.findings.join('; ')}</p>}<div className="grid gap-2 md:grid-cols-2"><SceneStage graph={proposal.reversible.before} assetUrls={assetUrls} label="Before"/><SceneStage graph={proposal.reversible.after} assetUrls={assetUrls} label="Proposed after"/></div><button className={button} disabled={!proposal.constraints.valid || proposal.approval !== 'pending'} onClick={() => act(() => setProposal(gate.review(proposal.proposalId, 'approve', current.ownerId)))}>Approve changes</button><button className={button} disabled={proposal.approval !== 'pending'} onClick={() => act(() => setProposal(gate.review(proposal.proposalId, 'reject', current.ownerId)))}>Reject</button></div>}
  {message && <p role="status" className="text-xs text-amber-200">{message}</p>}
 </section>;
}
