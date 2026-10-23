// Generated from canonical contracts by export-intelligent-ad-studio.cjs.
import { cloneCreative, createCreativeProposal, oneRole, previewCreativeOperations, roleLayers, type CreativeContext, type CreativeOperation, type CreativeProposal } from './ad-creative-proposals';
import { AD_SCENE_OUTPUT_FORMAT_IDS, type AdSceneGraphDto, type AdSceneOutputFormatId, type AdSceneTextLayerDto } from './ad-scene-graph';
import { intersects } from './ad-smart-canvas';
export interface CampaignTarget {
    formatId: AdSceneOutputFormatId;
    width: number;
    height: number;
}
export type MeasureCampaignText = (layer: AdSceneTextLayerDto) => {
    height: number;
    maxWidth: number;
    missingGlyphs: readonly string[];
};
export type CampaignAdaptResult = {
    status: 'proposed';
    target: CampaignTarget;
    proposal: CreativeProposal;
    editableGraph: AdSceneGraphDto;
    mode: 'constraintAware' | 'proportional';
    warnings: string[];
} | {
    status: 'conflict';
    target: CampaignTarget;
    conflicts: string[];
    fallback: 'explicitSelectionRequired';
};
/** Dimensions come from the existing host AD_FORMATS/AD_OUTPUT_FORMAT_DIMENSIONS registry. */
export function adaptCreativeCampaign(c: CreativeContext, target: CampaignTarget, id: string, measure: MeasureCampaignText, mode: 'constraintAware' | 'proportional' = 'constraintAware', proportionalFallback?: (graph: AdSceneGraphDto, width: number, height: number) => AdSceneGraphDto): CampaignAdaptResult {
    try {
        if (!AD_SCENE_OUTPUT_FORMAT_IDS.includes(target.formatId) || !Number.isInteger(target.width) || !Number.isInteger(target.height) || target.width < 64 || target.height < 64 || target.width > 4096 || target.height > 4096)
            throw Error('INVALID_CAMPAIGN_TARGET');
        const expected = target.formatId === 'square_1080' ? 1 : target.formatId === 'portrait_1080x1350' ? 4 / 5 : target.formatId === 'vertical_1080x1920' ? 9 / 16 : 16 / 9;
        if (Math.abs(target.width / target.height - expected) > .001)
            throw Error('FORMAT_RATIO_MISMATCH');
        const measured: MeasureCampaignText = layer => { const result = measure(layer); if (!Number.isFinite(result.height) || !Number.isFinite(result.maxWidth) || result.height < 0 || result.maxWidth < 0 || !Array.isArray(result.missingGlyphs)) throw Error('UNQUALIFIED_TEXT_MEASUREMENT'); return result; };
        const ops: CreativeOperation[] = [{ kind: 'canvas', changes: { width: target.width, height: target.height } }], w = target.width, h = target.height, i = c.safeZone.inset, left = w * i.left, top = h * i.top, sw = w * (1 - i.left - i.right), sh = h * (1 - i.top - i.bottom), gap = Math.min(w, h) * .025;
        const add = (layerId: string, changes: Extract<CreativeOperation, {
            kind: 'updateLayer';
        }>['changes']) => ops.push({ kind: 'updateLayer', layerId, changes });
        if (c.graph.layers.some(l => l.rotation || l.type === 'group'))
            throw Error('ROTATED_OR_GROUP_LAYOUT_REQUIRES_CREATOR');
        if (mode === 'proportional') {
            if (!proportionalFallback) throw Error('PROPORTIONAL_FALLBACK_ADAPTER_REQUIRED');
            const adapted = proportionalFallback(cloneCreative(c.graph), w, h);
            if (adapted.layers.length !== c.graph.layers.length) throw Error('INVALID_FALLBACK_GRAPH');
            for (const l of c.graph.layers) {
                const changed = adapted.layers.find(candidate => candidate.id === l.id);
                if (!changed) throw Error('INVALID_FALLBACK_GRAPH');
                const changes: { x: number; y: number; width: number; height: number; fontSize?: number } = {x:changed.x,y:changed.y,width:changed.width,height:changed.height};
                // Existing fallback owns general proportional behavior; add mandatory uniform source protection only.
                if (c.protectedLayerIds.includes(l.id)) {const scale=Math.min(w/c.graph.canvas.width,h/c.graph.canvas.height);changes.width=l.width*scale;changes.height=l.height*scale;}
                if (changed.type==='text') changes.fontSize=changed.fontSize;
                add(l.id,changes);
            }
        }
        else {
            const product = oneRole(c, 'product'), wide = w > h;
            const pw = wide ? sw * .48 : sw * .72, ph = wide ? sh * .75 : sh * .4, scale = Math.min(pw / product.width, ph / product.height);
            const productBox = { x: wide ? left : left + (sw - product.width * scale) / 2, y: wide ? top + (sh - product.height * scale) / 2 : top + sh * .31, width: product.width * scale, height: product.height * scale };
            const textX = wide ? left + sw * .55 : left, textWidth = wide ? sw * .45 : sw;
            add(product.id, productBox);
            const headline = oneRole(c, 'headline'), support = roleLayers(c, 'support'), cta = oneRole(c, 'cta'), logos = roleLayers(c, 'logo');
            if (support.length > 1 || logos.length > 1)
                throw Error('MULTIPLE_TEXT_OR_LOGO_REQUIRES_LAYOUT_ROLE_PLAN');
            const textLayout = (l: typeof headline, x: number, y: number, width: number, maxHeight: number, role: 'headline' | 'support' | 'cta') => {
                if (l.type !== 'text')
                    throw Error('TEXT_ROLE_REQUIRES_TEXT:' + role);
                const initial = l.fontSize ?? (role === 'headline' ? 64 : 32), min = role === 'headline' ? 24 : 16;
                for (let size = initial; size >= min; size -= 1) {
                    const candidate = { ...l, x, y, width, height: maxHeight, fontSize: size };
                    const m = measured(candidate);
                    if (m.missingGlyphs.length === 0 && m.maxWidth <= width + .001 && m.height <= maxHeight + .001) {
                        add(l.id, { x, y, width, height: Math.max(size, m.height), fontSize: size });
                        return Math.max(size, m.height);
                    }
                }
                throw Error('TEXT_CANNOT_FIT:' + l.id);
            };
            const hh = textLayout(headline, textX, top, textWidth, wide ? sh * .25 : sh * .17, 'headline');
            if (support[0])
                textLayout(support[0], textX, top + hh + gap, textWidth, wide ? sh * .2 : sh * .1, 'support');
            const ctaH = sh * .08, ctaY = top + sh - ctaH;
            if (cta.type === 'shape')
                add(cta.id, { x: textX, y: ctaY, width: Math.min(textWidth, w * .38), height: ctaH });
            else
                textLayout(cta, textX, ctaY, textWidth, ctaH, 'cta');
            for (const l of logos) {
                const scale = Math.min(sw * .17 / l.width, sh * .07 / l.height);
                add(l.id, { x: wide ? left : left + sw - l.width * scale, y: wide ? top : top + sh - l.height * scale, width: l.width * scale, height: l.height * scale });
            }
            const handled = new Set([product.id, headline.id, cta.id, ...support.map(l => l.id), ...logos.map(l => l.id)]);
            for (const l of c.graph.layers.filter(l => !handled.has(l.id))) {
                const bg = l.x === 0 && l.y === 0 && l.width === c.graph.canvas.width && l.height === c.graph.canvas.height;
                if (bg)
                    add(l.id, { width: w, height: h });
                else if ((c.roles.decoration ?? []).includes(l.id))
                    add(l.id, { x: left + l.x / c.graph.canvas.width * sw, y: top + l.y / c.graph.canvas.height * sh });
                else if (l.visible !== false)
                    throw Error('UNMAPPED_FOREGROUND_LAYER:' + l.id);
            }
        }
        // Remove exact no-ops so existing locked values do not create false conflicts.
        const cleaned = ops.map(op => { if (op.kind !== 'updateLayer')
            return op; const l = c.graph.layers.find(l => l.id === op.layerId)!; return { ...op, changes: Object.fromEntries(Object.entries(op.changes).filter(([k, v]) => v !== (l as unknown as Record<string, unknown>)[k])) }; }).filter(op => Object.keys(op.changes).length > 0);
        const graph = previewCreativeOperations(c, cleaned);
        const foreground = graph.layers.filter(l => l.visible !== false && Object.values(c.roles).some(ids => ids?.includes(l.id)));
        for (const l of foreground)
            if (l.x < left - .001 || l.y < top - .001 || l.x + l.width > left + sw + .001 || l.y + l.height > top + sh + .001)
                throw Error('TARGET_SAFE_ZONE_CONFLICT:' + l.id);
        for (let a = 0; a < foreground.length; a++)
            for (let b = a + 1; b < foreground.length; b++)
                if (intersects(foreground[a]!, foreground[b]!))
                    throw Error('TARGET_OVERLAP:' + foreground[a]!.id + ':' + foreground[b]!.id);
        for (const l of graph.layers)
            if (l.type === 'text' || l.type === 'shape' && l.text) {
                const textLayer: AdSceneTextLayerDto = l.type === 'text' ? l : { ...l, type: 'text', text: l.text ?? '' };
                const m = measured(textLayer);
                if (m.missingGlyphs.length || m.height > l.height + .001 || m.maxWidth > l.width + .001)
                    throw Error('TARGET_TEXT_OVERFLOW:' + l.id);
            }
        const proposal = createCreativeProposal(c, id, cleaned, 'Create a separate editable ' + target.formatId + ' graph using ' + mode + ' layout and ' + c.safeZone.id + '@' + c.safeZone.version + '.', 'campaignAdapt');
        if (!proposal.constraints.valid)
            throw Error(proposal.constraints.findings.join(';'));
        return { status: 'proposed', target, proposal, editableGraph: cloneCreative(graph), mode, warnings: ['Creator-configured safe policy; no official platform measurements claimed.', 'Source assets unchanged; resampling changes displayed pixels. No byte-equal export claim.'] };
    }
    catch (e) {
        return { status: 'conflict', target, conflicts: [e instanceof Error ? e.message : 'LAYOUT_CONFLICT'], fallback: 'explicitSelectionRequired' };
    }
}
