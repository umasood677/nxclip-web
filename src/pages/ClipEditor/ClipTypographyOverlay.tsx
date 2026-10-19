import { useRef } from 'react';
import { CanonicalCaptionPreview } from './CanonicalCaptionPreview';
import { editorTypography } from '../../lib/clipTypography/editorTypography';
import { cn } from '../../lib/utils';

type PositionPatch = { positionX: number; verticalAnchor: number };

export type TypographyHitLayer = {
  id: string;
  positionX: number;
  verticalAnchor: number;
  startMs: number;
  endMs: number;
  /** Plan font size in layout pixels (e.g. 56 on 1080x1920). */
  fontSize?: number;
  /** Approximate line count for hit height. */
  lineCount?: number;
  text?: string;
};

/** Both editor stages share the same activation/locked/final-render gates. */
export function ClipTypographyOverlay({
  raw,
  timeMs,
  locked,
  finalRender = false,
  enabled,
  aspect = 9 / 16,
  interactive = false,
  layers = [],
  activeLayerId,
  onSelectLayer,
  onPositionChange,
}: {
  raw: unknown;
  timeMs: number;
  locked: boolean;
  finalRender?: boolean;
  enabled?: boolean;
  aspect?: number;
  /** When true, visible text layers are clickable/draggable on the clip. */
  interactive?: boolean;
  layers?: TypographyHitLayer[];
  activeLayerId?: string;
  onSelectLayer?: (layerId: string) => void;
  /** Drag updates for a specific layer (also selects it). */
  onPositionChange?: (layerId: string, patch: PositionPatch) => void;
}) {
  const state = editorTypography(raw, enabled);
  const draggingRef = useRef(false);
  const dragLayerIdRef = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  if (!state.active || locked || finalRender) return null;
  if (state.invalid) {
    return (
      <div role="alert" className="absolute bottom-2 text-xs pointer-events-none">
        Saved typography layout is invalid. Export requires repair.
      </div>
    );
  }
  if (!state.plan) return null;

  const moveToPointer = (layerId: string, clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage || !onPositionChange) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const x = Math.min(0.94, Math.max(0.06, (clientX - rect.left) / rect.width));
    // Pointer maps to baseline Y (glyphs sit above the baseline).
    const y = Math.min(0.94, Math.max(0.06, (clientY - rect.top) / rect.height));
    onPositionChange(layerId, { positionX: x, verticalAnchor: y });
  };

  const visibleLayers = layers.filter((l) => timeMs >= l.startMs && timeMs < l.endMs);
  const planH = Math.max(1, state.plan.height);

  return (
    <div ref={stageRef} className="absolute inset-0 z-20 pointer-events-none">
      <CanonicalCaptionPreview plan={state.plan} timeMs={timeMs} enabled={true} aspect={aspect} />
      {interactive && onPositionChange
        ? visibleLayers.map((layer) => {
            const active = layer.id === activeLayerId;
            const fontSize = Math.max(16, layer.fontSize ?? 56);
            const lines = Math.max(1, layer.lineCount ?? (layer.text?.split('\n').length || 1));
            // Map plan px → % of stage so the ring hugs the rendered glyphs.
            const heightPct = Math.min(28, ((fontSize * lines * 1.35) / planH) * 100);
            const widthPct = Math.min(88, Math.max(28, (String(layer.text || '').length || 8) * 2.2));
            return (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                aria-label={active ? 'Drag caption on clip' : 'Select and drag caption layer'}
                aria-pressed={active}
                className={cn(
                  'absolute z-30 pointer-events-auto -translate-x-1/2',
                  'cursor-grab active:cursor-grabbing select-none touch-none rounded-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active
                    ? 'ring-1 ring-primary/50 bg-primary/5'
                    : 'hover:ring-1 hover:ring-white/30',
                )}
                style={{
                  left: `${layer.positionX * 100}%`,
                  top: `${layer.verticalAnchor * 100}%`,
                  // Baseline at bottom of hit box — matches canvas alphabetic baseline.
                  transform: 'translate(-50%, -100%)',
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  minHeight: '1.25rem',
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectLayer?.(layer.id);
                  draggingRef.current = true;
                  dragLayerIdRef.current = layer.id;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  moveToPointer(layer.id, e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!draggingRef.current || dragLayerIdRef.current !== layer.id) return;
                  e.preventDefault();
                  moveToPointer(layer.id, e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  draggingRef.current = false;
                  dragLayerIdRef.current = null;
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                }}
                onPointerCancel={() => {
                  draggingRef.current = false;
                  dragLayerIdRef.current = null;
                }}
              />
            );
          })
        : null}
    </div>
  );
}
