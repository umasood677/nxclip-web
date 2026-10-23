// Generated from canonical contracts by export-intelligent-ad-studio.cjs.
import { cloneCreative, createCreativeProposal, oneRole, roleLayers, validateCreativeContext, type CreativeAttribute, type CreativeContext, type CreativeOperation, type CreativeProposal, type LayerChange } from './ad-creative-proposals';
export const CREATIVE_DNA_VERSION = '1.0.0' as const;
export const CREATIVE_DNA_ATTRIBUTES: CreativeAttribute[] = ['palette', 'typography', 'productPosition', 'productScale', 'hierarchy', 'logoPlacement', 'spacing', 'mood', 'lighting'];
export interface CreativeDnaPreset {
    schemaVersion: typeof CREATIVE_DNA_VERSION;
    id: string;
    name: string;
    ownerId: string;
    brandKitId: string;
    brandVersion: number;
    values: {
        palette: string[];
        typography: Record<string, LayerChange>;
        productPosition: {
            x: number;
            y: number;
        };
        productScale: {
            areaFraction: number;
        };
        hierarchy: Record<string, number[]>;
        logoPlacement: Array<{
            x: number;
            y: number;
            width: number;
            height: number;
        }>;
        spacing: Record<string, {
            lineHeight?: number;
            letterSpacing?: number;
        }>;
        mood: string | null;
        lighting: string | null;
    };
    locks: CreativeAttribute[];
    protectedAssetReferences: string[];
    provenance: {
        method: 'declaredSceneMetadata';
        blueprintId: string | null;
        blueprintRevision: number | null;
    };
}
export function extractCreativeDna(c: CreativeContext, id: string, name: string): CreativeDnaPreset {
    validateCreativeContext(c);
    const product = oneRole(c, 'product'), w = c.graph.canvas.width, h = c.graph.canvas.height;
    const typography: Record<string, LayerChange> = {}, spacing: CreativeDnaPreset['values']['spacing'] = {}, hierarchy: Record<string, number[]> = {};
    for (const role of ['headline', 'support', 'cta'] as const) {
        const l = roleLayers(c, role)[0];
        if (l?.type === 'text') {
            typography[role] = { fontFamily: l.fontFamily, fontSize: l.fontSize, fontWeight: l.fontWeight, lineHeight: l.lineHeight, letterSpacing: l.letterSpacing };
            spacing[role] = { lineHeight: l.lineHeight, letterSpacing: l.letterSpacing };
        }
    }
    for (const [role, ids] of Object.entries(c.roles))
        hierarchy[role] = (ids ?? []).map(id => c.graph.layers.find(l => l.id === id)!.zIndex);
    const preset: CreativeDnaPreset = { schemaVersion: CREATIVE_DNA_VERSION, id, name, ownerId: c.ownerId, brandKitId: c.brand.kitId, brandVersion: c.brand.version, values: { palette: [...c.brand.colors], typography, productPosition: { x: product.x / w, y: product.y / h }, productScale: { areaFraction: product.width * product.height / (w * h) }, hierarchy, logoPlacement: roleLayers(c, 'logo').map(l => ({ x: l.x / w, y: l.y / h, width: l.width / w, height: l.height / h })), spacing, mood: c.graph.creativeMetadata?.mood ?? c.metadata?.mood ?? null, lighting: c.graph.creativeMetadata?.lighting ?? c.metadata?.lighting ?? null }, locks: [...c.locks], protectedAssetReferences: c.protectedLayerIds.map(id => { const l = c.graph.layers.find(l => l.id === id)!; return 'assetId' in l ? l.assetId ?? '' : ''; }), provenance: { method: 'declaredSceneMetadata', blueprintId: c.metadata?.blueprintId ?? null, blueprintRevision: c.metadata?.blueprintRevision ?? null } };
    validateCreativeDna(preset);
    return cloneCreative(preset);
}
export function validateCreativeDna(p: CreativeDnaPreset): void {
    if (!p || p.schemaVersion !== CREATIVE_DNA_VERSION || !p.id || !p.name.trim() || !p.ownerId || !p.brandKitId || !Number.isInteger(p.brandVersion) || !p.values || !Array.isArray(p.locks) || p.locks.some(l => !CREATIVE_DNA_ATTRIBUTES.includes(l)))
        throw Error('INVALID_DNA_PRESET');
    const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
    if (!p.values.palette.every(v => /^#[0-9a-f]{6}$/i.test(v)) || !finite(p.values.productScale.areaFraction) || p.values.productScale.areaFraction <= 0 || p.values.productScale.areaFraction > 1 || !finite(p.values.productPosition.x) || !finite(p.values.productPosition.y))
        throw Error('INVALID_DNA_VALUES');
    if (p.values.mood !== null && typeof p.values.mood !== 'string' || p.values.lighting !== null && typeof p.values.lighting !== 'string')
        throw Error('INVALID_DNA_METADATA');
}
/** Local document store adapter; no DB, history or cloud service. Host supplies authorized scoped storage. */
export interface DnaDocumentStore {
    read(key: string): string | null;
    write(key: string, value: string): void;
    remove(key: string): void;
}
export function createDnaPresetRepository(ownerId: string, store: DnaDocumentStore) {
    const key = (id: string) => { if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
        throw Error('INVALID_PRESET_ID'); return 'nxclip:dna:v1:' + encodeURIComponent(ownerId) + ':' + id; };
    const load = (id: string) => { const raw = store.read(key(id)); if (!raw)
        throw Error('PRESET_NOT_FOUND'); const p = JSON.parse(raw) as CreativeDnaPreset; validateCreativeDna(p); if (p.ownerId !== ownerId)
        throw Error('UNAUTHORIZED_PRESET'); return p; };
    return { load, create(p: CreativeDnaPreset) { validateCreativeDna(p); if (p.ownerId !== ownerId)
            throw Error('UNAUTHORIZED_PRESET'); if (store.read(key(p.id)))
            throw Error('PRESET_EXISTS'); store.write(key(p.id), JSON.stringify(p)); }, update(p: CreativeDnaPreset) { load(p.id); validateCreativeDna(p); if (p.ownerId !== ownerId)
            throw Error('UNAUTHORIZED_PRESET'); store.write(key(p.id), JSON.stringify(p)); }, rename(id: string, name: string) { const p = load(id); p.name = name; validateCreativeDna(p); store.write(key(id), JSON.stringify(p)); }, remove(id: string) { load(id); store.remove(key(id)); } };
}
export function setCreativeDnaLock(c: CreativeContext, attribute: CreativeAttribute, locked: boolean, actorId: string): CreativeContext {
    if (actorId !== c.ownerId)
        throw Error('UNAUTHORIZED_LOCK_CONTROL');
    if (!CREATIVE_DNA_ATTRIBUTES.includes(attribute))
        throw Error('INVALID_DNA_LOCK');
    return { ...cloneCreative(c), locks: locked ? [...new Set([...c.locks, attribute])] : c.locks.filter(a => a !== attribute) };
}
export function applyCreativeDna(c: CreativeContext, p: CreativeDnaPreset, selected: CreativeAttribute[], proposalId: string): CreativeProposal {
    validateCreativeDna(p);
    validateCreativeContext(c);
    if (p.ownerId !== c.ownerId || p.brandKitId !== c.brand.kitId || p.brandVersion !== c.brand.version)
        throw Error('DNA_OWNER_OR_BRAND_MISMATCH');
    if (p.protectedAssetReferences.some(id => !c.authorizedAssetIds.includes(id)))
        throw Error('UNAUTHORIZED_DNA_SOURCE');
    if (selected.length === 0 || selected.some(a => !CREATIVE_DNA_ATTRIBUTES.includes(a)))
        throw Error('INVALID_DNA_SELECTION');
    const changes = new Map<string, LayerChange>(), ops: CreativeOperation[] = [], w = c.graph.canvas.width, h = c.graph.canvas.height;
    const add = (id: string, patch: LayerChange) => changes.set(id, { ...changes.get(id), ...patch });
    for (const a of [...new Set(selected)]) {
        if (a === 'palette') {
            ops.push({ kind: 'canvas', changes: { backgroundColor: p.values.palette[0] } });
            for (const l of [...roleLayers(c, 'headline'), ...roleLayers(c, 'support')])
                if (l.type === 'text')
                    add(l.id, { color: p.values.palette[1] });
        }
        if (a === 'typography' || a === 'spacing')
            for (const role of ['headline', 'support', 'cta'] as const) {
                const list = roleLayers(c, role);
                if (list.length > 1)
                    throw Error('CLARIFY_ROLE:' + role);
                const l = list[0];
                const v = a === 'typography' ? p.values.typography[role] : p.values.spacing[role];
                if (l && v)
                    add(l.id, v);
            }
        if (a === 'productPosition') {
            const l = oneRole(c, 'product');
            add(l.id, { x: p.values.productPosition.x * w, y: p.values.productPosition.y * h });
        }
        if (a === 'productScale') {
            const l = oneRole(c, 'product'), area = w * h * p.values.productScale.areaFraction, ratio = l.width / l.height;
            add(l.id, { width: Math.sqrt(area * ratio), height: Math.sqrt(area / ratio) });
        }
        if (a === 'hierarchy')
            for (const [role, zs] of Object.entries(p.values.hierarchy)) {
                const ids = c.roles[role as 'product'] ?? [];
                if (ids.length !== zs.length)
                    throw Error('DNA_ROLE_COUNT_MISMATCH');
                ids.forEach((id, i) => add(id, { zIndex: zs[i] }));
            }
        if (a === 'logoPlacement') {
            const layers = roleLayers(c, 'logo');
            if (layers.length !== p.values.logoPlacement.length)
                throw Error('DNA_LOGO_COUNT_MISMATCH');
            layers.forEach((l, i) => { const v = p.values.logoPlacement[i]!; add(l.id, { x: v.x * w, y: v.y * h, width: v.width * w, height: v.height * h }); });
        }
        if (a === 'mood' || a === 'lighting') {
            const value = p.values[a];
            if (value === null)
                throw Error('DNA_METADATA_UNKNOWN:' + a);
            ops.push({ kind: 'metadata', changes: { [a]: value } });
        }
    }
    for (const [id, v] of changes)
        ops.push({ kind: 'updateLayer', layerId: id, changes: JSON.parse(JSON.stringify(v)) as LayerChange });
    return createCreativeProposal(c, proposalId, ops, 'Apply selected declared DNA attributes: ' + selected.join(', ') + '. Existing creator overrides remain protected.', 'dna');
}
