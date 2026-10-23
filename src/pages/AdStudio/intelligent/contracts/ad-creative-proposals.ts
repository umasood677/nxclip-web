// Generated from canonical contracts by export-intelligent-ad-studio.cjs.
import { validateAdSceneGraphDto, type AdSceneGraphDto, type AdSceneLayerDto } from './ad-scene-graph';
export const INTELLIGENT_AD_STUDIO_ENABLED_DEFAULT = false;
export const CREATIVE_PROPOSAL_VERSION = '1.0.0' as const;
export type CreativeRole = 'product' | 'headline' | 'support' | 'cta' | 'logo' | 'decoration';
export type CreativeAttribute = 'palette' | 'typography' | 'productPosition' | 'productScale' | 'hierarchy' | 'logoPlacement' | 'spacing' | 'mood' | 'lighting';
export type LayerChange = Partial<Pick<AdSceneLayerDto, 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'visible'>> & {
    fontSize?: number;
    letterSpacing?: number;
    lineHeight?: number;
    fontFamily?: string;
    fontId?: string;
    fontWeight?: number | string;
    color?: string;
    fill?: string;
    textColor?: string;
};
export type CreativeOperation = {
    kind: 'updateLayer';
    layerId: string;
    changes: LayerChange;
} | {
    kind: 'metadata';
    changes: {
        mood?: string;
        lighting?: string;
    };
} | {
    kind: 'canvas';
    changes: {
        width?: number;
        height?: number;
        backgroundColor?: string;
    };
};
export interface SafeZonePolicy {
    id: string;
    version: string;
    source: 'creatorConfigured';
    inset: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
export interface CreativeContext {
    ownerId: string;
    projectId: string;
    variationId: string;
    revision: number;
    graph: AdSceneGraphDto;
    roles: Partial<Record<CreativeRole, string[]>>;
    /** Supplied by an authoritative host asset resolver, never browser self-attestation. */
    authorizedAssetIds: string[];
    protectedLayerIds: string[];
    locks: CreativeAttribute[];
    creatorOverrides: Record<string, string[]>;
    brand: {
        kitId: string;
        version: number;
        colors: string[];
        fontFamilies: string[];
        fontIds?: Record<string, string>;
    };
    safeZone: SafeZonePolicy;
    metadata?: {
        mood?: string;
        lighting?: string;
        blueprintId?: string;
        blueprintRevision?: number;
    };
}
export interface CreativeProposal {
    schemaVersion: typeof CREATIVE_PROPOSAL_VERSION;
    proposalId: string;
    projectId: string;
    variationId: string;
    ownerId: string;
    sourceRevision: number;
    sceneGraphVersion: string;
    sourceSnapshot: string;
    policySnapshot: string;
    affectedLayerIds: string[];
    operations: CreativeOperation[];
    explanation: string;
    constraints: {
        valid: boolean;
        findings: string[];
    };
    approval: 'pending' | 'accepted' | 'rejected';
    provenance: {
        feature: 'director' | 'dna' | 'smartCanvas' | 'campaignAdapt';
        method: 'deterministic';
        version: '1.0.0';
    };
    reversible: {
        before: AdSceneGraphDto;
        after: AdSceneGraphDto;
    };
}
export const cloneCreative = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
/** Full canonical payload rather than a collision-prone short hash. Not an authentication token. */
export function creativeSnapshot(value: unknown): string {
    if (Array.isArray(value))
        return '[' + value.map(creativeSnapshot).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + creativeSnapshot(v)).join(',') + '}';
    return JSON.stringify(value) ?? 'null';
}
export function validateCreativeContext(c: CreativeContext): void {
    validateAdSceneGraphDto(c.graph);
    if (!c.ownerId || !c.projectId || !c.variationId || !Number.isInteger(c.revision) || c.revision < 0)
        throw Error('INVALID_CONTEXT');
    if (!/^1(?:\.|$)/.test(c.graph.schemaVersion))
        throw Error('UNSUPPORTED_SCENE_VERSION');
    if (!c.brand.kitId || !Number.isInteger(c.brand.version) || !Array.isArray(c.brand.colors) || c.brand.colors.some(v => !/^#[0-9a-f]{6}$/i.test(v)) || !Array.isArray(c.brand.fontFamilies))
        throw Error('INVALID_BRAND_POLICY');
    const ids = new Set(c.graph.layers.map(l => l.id));
    for (const list of [...Object.values(c.roles), c.protectedLayerIds])
        for (const id of list ?? [])
            if (!ids.has(id))
                throw Error('INVALID_ROLE_LAYER:' + id);
    for (const l of c.graph.layers) {
        for (const key of ['x', 'y', 'width', 'height', 'zIndex'] as const)
            if (typeof l[key] !== 'number' || !Number.isFinite(l[key]))
                throw Error('INVALID_GEOMETRY');
        if (l.width <= 0 || l.height <= 0 || l.type === 'group')
            throw Error('UNSUPPORTED_OR_INVALID_LAYER');
        if (l.type === 'image' || l.type === 'logo') {
            if (!l.assetId || !c.authorizedAssetIds.includes(l.assetId))
                throw Error('UNAUTHORIZED_ASSET_REFERENCE');
        }
    }
    for (const id of [...(c.roles.product ?? []), ...(c.roles.logo ?? [])])
        if (!c.protectedLayerIds.includes(id))
            throw Error('MISSING_MANDATORY_SOURCE_PROTECTION');
    const i = c.safeZone.inset;
    if (!c.safeZone.id || !c.safeZone.version || c.safeZone.source !== 'creatorConfigured' || Object.values(i).some(v => !Number.isFinite(v) || v < 0 || v >= .5) || i.left + i.right >= 1 || i.top + i.bottom >= 1)
        throw Error('INVALID_SAFE_ZONE');
}
export function creativePolicySnapshot(c: CreativeContext): string {
    const policy: Partial<CreativeContext> = cloneCreative(c);
    delete policy.graph;
    delete policy.revision;
    return creativeSnapshot(policy);
}
export function roleLayers(c: CreativeContext, role: CreativeRole): AdSceneLayerDto[] {
    return (c.roles[role] ?? []).map(id => c.graph.layers.find(l => l.id === id)!).filter(l => l.visible !== false);
}
export function oneRole(c: CreativeContext, role: CreativeRole): AdSceneLayerDto {
    const layers = roleLayers(c, role);
    if (layers.length !== 1)
        throw Error('CLARIFY_ROLE:' + role);
    return layers[0]!;
}
export function attributesForChange(c: CreativeContext, id: string, keys: string[]): CreativeAttribute[] {
    const has = (role: CreativeRole) => (c.roles[role] ?? []).includes(id), out = new Set<CreativeAttribute>();
    if (keys.some(k => ['color', 'fill', 'textColor'].includes(k)))
        out.add('palette');
    if (keys.some(k => ['fontFamily', 'fontId', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing'].includes(k)))
        out.add('typography');
    if (has('product') && keys.some(k => ['x', 'y'].includes(k)))
        out.add('productPosition');
    if (has('product') && keys.some(k => ['width', 'height'].includes(k)))
        out.add('productScale');
    if (has('logo') && keys.some(k => ['x', 'y', 'width', 'height'].includes(k)))
        out.add('logoPlacement');
    if (keys.includes('zIndex') || keys.includes('visible') || keys.includes('fontSize') && (has('headline') || has('support') || has('cta')) || keys.some(k => ['width', 'height'].includes(k)) && has('product'))
        out.add('hierarchy');
    if (keys.some(k => ['x', 'y', 'width', 'height', 'letterSpacing', 'lineHeight'].includes(k)))
        out.add('spacing');
    return [...out];
}
const NUMERIC = new Set(['x', 'y', 'width', 'height', 'zIndex', 'fontSize', 'letterSpacing', 'lineHeight']);
const ALLOWED = new Set([...NUMERIC, 'fontFamily', 'fontId', 'fontWeight', 'color', 'fill', 'textColor', 'visible']);
function hex(value: unknown): boolean { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
export function previewCreativeOperations(c: CreativeContext, operations: readonly CreativeOperation[]): AdSceneGraphDto {
    validateCreativeContext(c);
    if (!Array.isArray(operations) || operations.length === 0 || operations.length > 160)
        throw Error('INVALID_OPERATIONS');
    const graph = cloneCreative(c.graph), seen = new Set<string>();
    for (const op of operations) {
        if (!op || !op.changes || typeof op.changes !== 'object')
            throw Error('INVALID_OPERATION');
        if (op.kind === 'metadata') {
            for (const [k, v] of Object.entries(op.changes)) {
                if (!['mood', 'lighting'].includes(k) || typeof v !== 'string' || v.length > 2000 || seen.has('metadata.' + k))
                    throw Error('INVALID_METADATA');
                if (c.locks.includes(k as CreativeAttribute))
                    throw Error('DNA_LOCK:' + k);
                seen.add('metadata.' + k);
                graph.creativeMetadata = { ...graph.creativeMetadata, [k]: v };
            }
            continue;
        }
        if (op.kind === 'canvas') {
            for (const [k, v] of Object.entries(op.changes)) {
                if (!['width', 'height', 'backgroundColor'].includes(k) || seen.has('canvas.' + k))
                    throw Error('INVALID_CANVAS_OPERATION');
                seen.add('canvas.' + k);
                if (k === 'backgroundColor') {
                    if (c.locks.includes('palette'))
                        throw Error('DNA_LOCK:palette');
                    if (!hex(v) || !c.brand.colors.includes(String(v)))
                        throw Error('UNAPPROVED_BRAND_COLOR');
                }
                else if (typeof v !== 'number' || !Number.isInteger(v) || v < 64 || v > 4096)
                    throw Error('INVALID_CANVAS_SIZE');
            }
            Object.assign(graph.canvas, op.changes);
            continue;
        }
        if (op.kind !== 'updateLayer')
            throw Error('INVALID_OPERATION');
        const layer = graph.layers.find(l => l.id === op.layerId);
        if (!layer)
            throw Error('INVALID_LAYER_REFERENCE');
        const keys = Object.keys(op.changes);
        if (!keys.length)
            throw Error('EMPTY_OPERATION');
        const protectedSource = c.protectedLayerIds.includes(layer.id);
        if (layer.locked && !protectedSource)
            throw Error('LAYER_LOCKED:' + layer.id);
        for (const [k, v] of Object.entries(op.changes)) {
            if (!ALLOWED.has(k) || seen.has(layer.id + '.' + k))
                throw Error('INVALID_LAYER_OPERATION');
            seen.add(layer.id + '.' + k);
            if (protectedSource && !['x', 'y', 'width', 'height'].includes(k))
                throw Error('PROTECTED_SOURCE_MUTATION');
            if (NUMERIC.has(k) && (typeof v !== 'number' || !Number.isFinite(v)))
                throw Error('INVALID_NUMBER');
            if (['width', 'height', 'fontSize', 'lineHeight'].includes(k) && Number(v) <= 0)
                throw Error('INVALID_SIZE');
            if (k === 'visible' && typeof v !== 'boolean')
                throw Error('INVALID_VISIBILITY');
            if (['color', 'fill', 'textColor'].includes(k) && (!hex(v) || !c.brand.colors.includes(String(v))))
                throw Error('UNAPPROVED_BRAND_COLOR');
            if (k === 'fontFamily' && (typeof v !== 'string' || !c.brand.fontFamilies.includes(v)))
                throw Error('UNAPPROVED_BRAND_FONT');
            if (k === 'fontId')
                throw Error('FONT_ID_MAPPING_REQUIRED');
            if (k === 'fontWeight' && !((typeof v === 'number' && Number.isFinite(v) && v >= 100 && v <= 900) || (typeof v === 'string' && /^[1-9]00$/.test(v))))
                throw Error('INVALID_FONT_WEIGHT');
            if (['letterSpacing', 'lineHeight', 'fontWeight', 'color'].includes(k) && layer.type !== 'text')
                throw Error('INVALID_TEXT_PROPERTY');
            if (['fontFamily', 'fontSize'].includes(k) && layer.type !== 'text' && layer.type !== 'shape')
                throw Error('INVALID_TYPOGRAPHY_PROPERTY');
            if (['fill', 'textColor'].includes(k) && layer.type !== 'shape')
                throw Error('INVALID_SHAPE_PROPERTY');
            if ((c.creatorOverrides[layer.id] ?? []).includes(k))
                throw Error('CREATOR_OVERRIDE:' + layer.id + '.' + k);
        }
        for (const attr of attributesForChange(c, layer.id, keys))
            if (c.locks.includes(attr))
                throw Error('DNA_LOCK:' + attr);
        const oldFamily = (layer.type === 'text' || layer.type === 'shape') ? layer.fontFamily : undefined;
        Object.assign(layer, op.changes);
        if (op.changes.fontFamily && op.changes.fontFamily !== oldFamily && layer.type === 'text' && layer.fontId) {
            const resolved = c.brand.fontIds?.[op.changes.fontFamily];
            if (!resolved)
                throw Error('FONT_ID_MAPPING_REQUIRED');
            layer.fontId = resolved;
        }
    }
    for (const id of c.protectedLayerIds) {
        const before = c.graph.layers.find(l => l.id === id)!, after = graph.layers.find(l => l.id === id)!;
        if (before.type !== 'image' && before.type !== 'logo')
            throw Error('INVALID_PROTECTED_SOURCE');
        if (after.type !== 'image' && after.type !== 'logo')
            throw Error('PROTECTED_SOURCE_MUTATION');
        if (before.assetId !== after.assetId || before.storageKey !== after.storageKey || before.objectFit !== after.objectFit)
            throw Error('PROTECTED_SOURCE_MUTATION');
        if (before.objectFit !== 'contain')
            throw Error('PROTECTED_SOURCE_REQUIRES_CONTAIN');
        if (Math.abs(before.width / before.height - after.width / after.height) > 1e-6)
            throw Error('DESTRUCTIVE_PRODUCT_SCALE');
        if (after.x < 0 || after.y < 0 || after.x + after.width > graph.canvas.width + .001 || after.y + after.height > graph.canvas.height + .001)
            throw Error('PRODUCT_CLIPPING');
    }
    validateCreativeContext({ ...c, graph });
    return graph;
}
export function createCreativeProposal(c: CreativeContext, id: string, operations: CreativeOperation[], explanation: string, feature: CreativeProposal['provenance']['feature']): CreativeProposal {
    if (!id || id.length > 200 || !explanation.trim() || explanation.length > 5000 || !['director', 'dna', 'smartCanvas', 'campaignAdapt'].includes(feature))
        throw Error('INVALID_PROPOSAL');
    let after = cloneCreative(c.graph);
    const findings: string[] = [];
    try {
        after = previewCreativeOperations(c, operations);
    }
    catch (e) {
        findings.push(e instanceof Error ? e.message : 'CONSTRAINT_ERROR');
    }
    return { schemaVersion: CREATIVE_PROPOSAL_VERSION, proposalId: id, projectId: c.projectId, variationId: c.variationId, ownerId: c.ownerId, sourceRevision: c.revision, sceneGraphVersion: c.graph.schemaVersion, sourceSnapshot: creativeSnapshot(c.graph), policySnapshot: creativePolicySnapshot(c), affectedLayerIds: [...new Set(operations.flatMap(o => o.kind === 'updateLayer' ? [o.layerId] : []))], operations: cloneCreative(operations), explanation, constraints: { valid: findings.length === 0, findings }, approval: 'pending', provenance: { feature, method: 'deterministic', version: '1.0.0' }, reversible: { before: cloneCreative(c.graph), after } };
}
/** Host-owned review registry. It stores proposals, not graph history. No API/auth boundary is exposed. */
export function createCreativeReviewGate(getContext: () => CreativeContext, commit: (graph: AdSceneGraphDto, metadata: CreativeContext['metadata'], proposal: CreativeProposal) => void) {
    const issued = new Map<string, CreativeProposal>();
    return {
        register(p: CreativeProposal): CreativeProposal {
            const c = getContext();
            if (issued.has(p.proposalId))
                throw Error('DUPLICATE_PROPOSAL');
            const expected = createCreativeProposal(c, p.proposalId, p.operations, p.explanation, p.provenance.feature);
            if (creativeSnapshot(expected) !== creativeSnapshot(p))
                throw Error('INVALID_OR_STALE_PROPOSAL');
            issued.set(p.proposalId, cloneCreative(p));
            return cloneCreative(p);
        },
        review(id: string, decision: 'approve' | 'reject', actorId: string): CreativeProposal {
            const p = issued.get(id), c = getContext();
            if (!p || p.approval !== 'pending')
                throw Error('UNKNOWN_OR_REVIEWED_PROPOSAL');
            if (actorId !== c.ownerId || p.ownerId !== c.ownerId || p.projectId !== c.projectId || p.variationId !== c.variationId)
                throw Error('UNAUTHORIZED_PROPOSAL');
            if (decision !== 'approve' && decision !== 'reject')
                throw Error('EXPLICIT_DECISION_REQUIRED');
            if (decision === 'reject') {
                p.approval = 'rejected';
                return cloneCreative(p);
            }
            if (p.sourceRevision !== c.revision || p.sourceSnapshot !== creativeSnapshot(c.graph) || p.policySnapshot !== creativePolicySnapshot(c))
                throw Error('STALE_PROPOSAL');
            if (!p.constraints.valid)
                throw Error('PROPOSAL_CONSTRAINTS_FAILED');
            const next = previewCreativeOperations(c, p.operations);
            const metadata = c.metadata ? cloneCreative(c.metadata) : undefined; // Declared graph metadata travels in existing history, not an out-of-band override.
            commit(cloneCreative(next), metadata, cloneCreative(p));
            p.approval = 'accepted';
            return cloneCreative(p);
        }
    };
}
