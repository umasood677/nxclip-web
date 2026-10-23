// Generated from canonical contracts by export-intelligent-ad-studio.cjs.
import { createCreativeProposal, roleLayers, validateCreativeContext, type CreativeContext, type CreativeProposal } from './ad-creative-proposals';
import type { AdSceneLayerDto } from './ad-scene-graph';
export interface CanvasFinding {
    id: string;
    classification: 'hardConstraint' | 'geometric' | 'heuristic';
    layers: string[];
    detected: string;
    why: string;
    suggestion: string;
    proposal: CreativeProposal | null;
    measurement: 'known' | 'unknown';
}
export const intersects = (a: AdSceneLayerDto, b: AdSceneLayerDto) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function analyzeSmartCanvas(c: CreativeContext): CanvasFinding[] {
    validateCreativeContext(c);
    const findings: CanvasFinding[] = [], w = c.graph.canvas.width, h = c.graph.canvas.height, i = c.safeZone.inset;
    const add = (code: string, layers: string[], classification: CanvasFinding['classification'], detected: string, why: string, suggestion: string, proposal: CreativeProposal | null = null, measurement: CanvasFinding['measurement'] = 'known') => findings.push({ id: code + ':' + layers.join(','), layers, classification, detected, why, suggestion, proposal: proposal?.constraints.valid ? proposal : null, measurement });
    const visible = c.graph.layers.filter(l => l.visible !== false), foreground = visible.filter(l => Object.values(c.roles).some(ids => ids?.includes(l.id)));
    for (const l of visible) {
        if (l.rotation) {
            add('TRANSFORM_UNKNOWN', [l.id], 'heuristic', 'Rotated geometry needs transformed bounds.', 'Axis-aligned checks would overstate certainty.', 'Inspect rotated bounds in the existing canvas.', null, 'unknown');
            continue;
        }
        const out = l.x < 0 || l.y < 0 || l.x + l.width > w || l.y + l.height > h;
        if (out) {
            const fix = l.width <= w && l.height <= h ? createCreativeProposal(c, 'bounds:' + l.id, [{ kind: 'updateLayer', layerId: l.id, changes: { x: Math.max(0, Math.min(l.x, w - l.width)), y: Math.max(0, Math.min(l.y, h - l.height)) } }], 'Move layer fully inside canvas.', 'smartCanvas') : null;
            add('OUT_OF_BOUNDS', [l.id], c.protectedLayerIds.includes(l.id) ? 'hardConstraint' : 'geometric', 'Layer exceeds canvas bounds.', 'Content may be clipped.', 'Move inside canvas or choose a larger format.', fix);
        }
        if (foreground.includes(l) && (l.x < w * i.left || l.y < h * i.top || l.x + l.width > w * (1 - i.right) || l.y + l.height > h * (1 - i.bottom))) {
            const fix = l.width <= w * (1 - i.left - i.right) && l.height <= h * (1 - i.top - i.bottom) ? createCreativeProposal(c, 'safe:' + l.id, [{ kind: 'updateLayer', layerId: l.id, changes: { x: Math.max(w * i.left, Math.min(l.x, w * (1 - i.right) - l.width)), y: Math.max(h * i.top, Math.min(l.y, h * (1 - i.bottom) - l.height)) } }], 'Move within creator-configured safe zone ' + c.safeZone.id + '@' + c.safeZone.version + '.', 'smartCanvas') : null;
            add('SAFE_ZONE', [l.id], 'geometric', 'Outside configured safe zone.', 'Policy is creator-configured, not an official platform specification.', 'Review safe placement.', fix);
        }
    }
    for (const p of roleLayers(c, 'product')) {
        if (p.rotation)
            continue;
        if (p.type === 'image' && p.objectFit !== 'contain')
            add('PRODUCT_CROP', [p.id], 'hardConstraint', 'Product uses a potentially cropping/stretching fit mode.', 'Source identity requires non-destructive display.', 'Resolve source aspect and approve a contain binding; no silent source change.');
        if (p.width * p.height / (w * h) < .12) {
            const factor = 1.1, fix = createCreativeProposal(c, 'prominence:' + p.id, [{ kind: 'updateLayer', layerId: p.id, changes: { width: p.width * factor, height: p.height * factor, x: p.x - p.width * .05, y: p.y - p.height * .05 } }], 'Optionally increase product area by 21%; heuristic prominence threshold.', 'smartCanvas');
            add('WEAK_PROMINENCE', [p.id], 'heuristic', 'Product box is under 12% of canvas.', 'Some briefs benefit from a clearer focal product; this is not an aesthetic error.', 'Review a modest uniform enlargement.', fix);
        }
        for (const t of visible.filter(l => l.type === 'text' && !l.rotation))
            if (intersects(t, p)) {
                const y = p.y - t.height - Math.min(w, h) * .025;
                const moved = { ...t, y };
                const feasible = y >= h * i.top && !foreground.some(other => other.id !== t.id && other.visible !== false && intersects(moved, other));
                const fix = feasible ? createCreativeProposal(c, 'separate:' + t.id, [{ kind: 'updateLayer', layerId: t.id, changes: { y } }], 'Separate text from the protected product box without moving source content.', 'smartCanvas') : null;
                add('TEXT_PRODUCT_OVERLAP', [t.id, p.id], 'geometric', 'Text and protected product boxes overlap.', 'Bounding boxes can overlap transparent pixels; inspect actual content.', 'Review a feasible text-only move or resolve conflicting locks manually.', fix);
            }
    }
    const text = visible.filter(l => l.type === 'text');
    if (text.reduce((n, l) => n + l.width * l.height, 0) / (w * h) > .45)
        add('TEXT_DENSITY', text.map(l => l.id), 'heuristic', 'Text boxes occupy over 45% of canvas (overlaps counted).', 'Box area is a density proxy, not glyph coverage.', 'Consider reducing copy or adjusting spacing.');
    const headline = roleLayers(c, 'headline')[0], cta = roleLayers(c, 'cta')[0];
    if (headline && cta && headline.type === 'text' && (cta.type === 'text' || cta.type === 'shape') && (cta.fontSize ?? 0) >= (headline.fontSize ?? 48)) {
        const fix = createCreativeProposal(c, 'hierarchy:' + cta.id, [{ kind: 'updateLayer', layerId: cta.id, changes: { fontSize: Math.max(12, (headline.fontSize ?? 48) * .55) } }], 'Optionally reduce CTA typography below headline.', 'smartCanvas');
        add('HIERARCHY', [headline.id, cta.id], 'heuristic', 'CTA typography rivals the headline.', 'Intent can justify equal hierarchy.', 'Review smaller CTA typography.', fix);
    }
    for (const l of roleLayers(c, 'logo'))
        if (l.width * l.height / (w * h) > .15) {
            const factor = .8;
            const fix = createCreativeProposal(c, 'logo:' + l.id, [{ kind: 'updateLayer', layerId: l.id, changes: { width: l.width * factor, height: l.height * factor } }], 'Optionally reduce logo size uniformly by 20%.', 'smartCanvas');
            add('LOGO_PROMINENCE', [l.id], 'heuristic', 'Logo occupies over 15% of canvas.', 'Large branding may compete with the product.', 'Review a non-destructive uniform logo reduction.', fix);
        }
    for (let a = 0; a < foreground.length; a++)
        for (let b = a + 1; b < foreground.length; b++) {
            const x = foreground[a]!, y = foreground[b]!;
            if (x.rotation || y.rotation || intersects(x, y))
                continue;
            const dx = Math.max(x.x - y.x - y.width, y.x - x.x - x.width, 0), dy = Math.max(x.y - y.y - y.height, y.y - x.y - x.height, 0);
            if (Math.hypot(dx, dy) < Math.min(w, h) * .015)
                add('CROWDED', [x.id, y.id], 'heuristic', 'Foreground boxes have a narrow gap.', 'Small geometric gaps can feel crowded; paired CTA text/button is intentional.', 'Review spacing; no automatic rearrangement of intentional pairs.');
        }
    for (const t of text) {
        const under = visible.filter(l => l.id !== t.id && intersects(t, l));
        if (t.type !== 'text')
            continue;
        const bg = c.graph.canvas.backgroundColor, color = t.color;
        if (t.rotation || (t.opacity ?? 1) !== 1 || under.length || !/^#[0-9a-f]{6}$/i.test(bg ?? '') || !/^#[0-9a-f]{6}$/i.test(color ?? '')) {
            add('CONTRAST_UNKNOWN', [t.id], 'heuristic', 'Text contrast is not reliably measurable from this graph.', 'Images, transparency or unresolved colors need actual composited pixels.', 'Review rendered output; no fabricated contrast score.', null, 'unknown');
            continue;
        }
        const luminance = (hex: string) => { const rgb = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722; };
        const a = luminance(bg!), b = luminance(color!), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        if (ratio < 4.5) {
            const choices = c.brand.colors.filter(v => { const l = luminance(v); return (Math.max(l, a) + .05) / (Math.min(l, a) + .05) >= 4.5; });
            const fix = choices[0] ? createCreativeProposal(c, 'contrast:' + t.id, [{ kind: 'updateLayer', layerId: t.id, changes: { color: choices[0] } }], 'Use an approved palette color with measurable solid-background contrast.', 'smartCanvas') : null;
            add('LOW_CONTRAST', [t.id], 'geometric', 'Solid-background contrast ratio ' + ratio.toFixed(2) + '.', 'Below the configured advisory threshold 4.5.', 'Choose an approved contrasting text color.', fix);
        }
    }
    return findings;
}
