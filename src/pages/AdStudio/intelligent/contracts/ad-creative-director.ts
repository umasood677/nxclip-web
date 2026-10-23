// Generated from canonical contracts by export-intelligent-ad-studio.cjs.
import { createCreativeProposal, oneRole, roleLayers, type CreativeContext, type CreativeOperation, type CreativeProposal } from './ad-creative-proposals';
export const CREATIVE_COMMANDS = ['increase product prominence', 'decrease product prominence', 'center the product', 'reduce headline size', 'increase headline spacing', 'improve cta placement', 'align text with the product', 'apply approved brand kit colors', 'simplify the composition', 'improve mobile-safe placement'] as const;
export type DirectorResult = {
    status: 'proposed';
    proposal: CreativeProposal;
} | {
    status: 'clarification' | 'unsupported';
    message: string;
    options: string[];
};
export function directCreativeCommand(c: CreativeContext, command: string, proposalId: string): DirectorResult {
    const key = command.trim().toLowerCase().replace(/[.!?]+$/, '');
    if (!CREATIVE_COMMANDS.includes(key as typeof CREATIVE_COMMANDS[number]))
        return { status: key === 'make it luxurious' ? 'clarification' : 'unsupported', message: 'Choose an explicit supported intent. These are deterministic design options, not AI redesigns.', options: key === 'make it luxurious' ? ['reduce headline size', 'increase headline spacing', 'simplify the composition'] : [...CREATIVE_COMMANDS] };
    const ops: CreativeOperation[] = [];
    const change = (layerId: string, changes: Extract<CreativeOperation, {
        kind: 'updateLayer';
    }>['changes']) => ops.push({ kind: 'updateLayer', layerId, changes });
    try {
        switch (key) {
            case 'increase product prominence':
            case 'decrease product prominence': {
                const l = oneRole(c, 'product'), factor = key.startsWith('increase') ? 1.1 : .9, w = l.width * factor, h = l.height * factor;
                change(l.id, { width: w, height: h, x: l.x + (l.width - w) / 2, y: l.y + (l.height - h) / 2 });
                break;
            }
            case 'center the product': {
                const l = oneRole(c, 'product');
                change(l.id, { x: (c.graph.canvas.width - l.width) / 2 });
                break;
            }
            case 'reduce headline size': {
                const l = oneRole(c, 'headline');
                if (l.type !== 'text')
                    throw Error('HEADLINE_MUST_BE_TEXT');
                change(l.id, { fontSize: Math.max(12, (l.fontSize ?? 48) * .9) });
                break;
            }
            case 'increase headline spacing': {
                const l = oneRole(c, 'headline');
                if (l.type !== 'text')
                    throw Error('HEADLINE_MUST_BE_TEXT');
                change(l.id, { letterSpacing: (l.letterSpacing ?? 0) + 1 });
                break;
            }
            case 'improve cta placement': {
                const l = oneRole(c, 'cta'), i = c.safeZone.inset;
                change(l.id, { x: (c.graph.canvas.width - l.width) / 2, y: c.graph.canvas.height * (1 - i.bottom) - l.height });
                break;
            }
            case 'align text with the product': {
                const product = oneRole(c, 'product'), headline = oneRole(c, 'headline');
                change(headline.id, { x: product.x });
                break;
            }
            case 'apply approved brand kit colors': {
                if (c.brand.colors.length < 2)
                    throw Error('APPROVED_PALETTE_REQUIRES_TWO_COLORS');
                ops.push({ kind: 'canvas', changes: { backgroundColor: c.brand.colors[0] } });
                for (const l of [...roleLayers(c, 'headline'), ...roleLayers(c, 'support'), ...roleLayers(c, 'cta')]) {
                    if (l.type === 'text')
                        change(l.id, { color: c.brand.colors[1] });
                    else if (l.type === 'shape')
                        change(l.id, { fill: c.brand.colors[0], textColor: c.brand.colors[1] });
                }
                break;
            }
            case 'simplify the composition': {
                const layers = roleLayers(c, 'decoration');
                if (!layers.length)
                    throw Error('CLARIFY_OPTIONAL_DECORATIONS');
                const essential = new Set(['product', 'headline', 'support', 'cta', 'logo'].flatMap(r => c.roles[r as 'product'] ?? []));
                for (const l of layers) {
                    if (essential.has(l.id))
                        throw Error('AMBIGUOUS_DECORATION_ROLE');
                    change(l.id, { visible: false });
                }
                break;
            }
            case 'improve mobile-safe placement': {
                const i = c.safeZone.inset, w = c.graph.canvas.width, h = c.graph.canvas.height;
                for (const l of c.graph.layers.filter(l => Object.values(c.roles).some(ids => ids?.includes(l.id)) && l.visible !== false)) {
                    if (l.width > w * (1 - i.left - i.right) || l.height > h * (1 - i.top - i.bottom))
                        throw Error('SAFE_ZONE_CANNOT_FIT:' + l.id);
                    change(l.id, { x: Math.max(w * i.left, Math.min(l.x, w * (1 - i.right) - l.width)), y: Math.max(h * i.top, Math.min(l.y, h * (1 - i.bottom) - l.height)) });
                }
                break;
            }
        }
    }
    catch (e) {
        return { status: 'clarification', message: e instanceof Error ? e.message : 'TARGET_UNRESOLVED', options: [] };
    }
    return { status: 'proposed', proposal: createCreativeProposal(c, proposalId, ops, 'Deterministic instruction: ' + key + '. Review affected layers before applying.', 'director') };
}
