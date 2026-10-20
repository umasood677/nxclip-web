import { useEffect, useRef, useState } from 'react';
import { Type, Palette, Plus, Trash2, Layers, Copy, ClipboardPaste } from 'lucide-react';
import { CANONICAL_FACE_OPTIONS } from '../../lib/clipTypography/canonicalFaces';
import { canonicalBrowserFamily } from '../../lib/clipTypography/canonicalLayout';
import {
  createLayerDraft,
  getActiveLayer,
  type CanonicalCompositionDraft,
  type CanonicalLayerDraft,
} from '../../lib/clipTypography/canonicalAuthoring';
import { cn } from '../../lib/utils';
import { Slider } from '../../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';

export const CANONICAL_FILL_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#F8FAFC', label: 'Snow' },
  { hex: '#FFE600', label: 'Yellow' },
  { hex: '#FFE566', label: 'Gold' },
  { hex: '#FF8A3D', label: 'Orange' },
  { hex: '#FF3B3B', label: 'Red' },
  { hex: '#FF4D9E', label: 'Pink' },
  { hex: '#C084FC', label: 'Violet' },
  { hex: '#4DA3FF', label: 'Blue' },
  { hex: '#00E5FF', label: 'Cyan' },
  { hex: '#00FFAA', label: 'Mint' },
  { hex: '#B8FF3C', label: 'Lime' },
  { hex: '#111111', label: 'Black' },
  { hex: '#1E293B', label: 'Slate' },
  { hex: '#78716C', label: 'Stone' },
  { hex: '#A8A29E', label: 'Warm gray' },
];

const EFFECT_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#000000', label: 'Black' },
  { hex: '#111111', label: 'Near black' },
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#1E293B', label: 'Slate' },
  { hex: '#78716C', label: 'Stone' },
  { hex: '#FF3B3B', label: 'Red' },
  { hex: '#4DA3FF', label: 'Blue' },
  { hex: '#FFE600', label: 'Yellow' },
];

const LAYER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#ef4444', '#14b8a6'];

type Props = {
  draft: CanonicalCompositionDraft;
  /** Polished clip duration in ms (trim window). */
  durationMs: number;
  /** Current playhead in ms from clip start (for timeline marker). */
  playheadMs?: number;
  busy?: boolean;
  error?: string | null;
  onChange: (next: CanonicalCompositionDraft) => void;
  onPatchActive: (patch: Partial<CanonicalLayerDraft>) => void;
};

function CharacteristicSlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-[10px] font-bold text-muted-foreground">{label}</label>
        <span className="text-[10px] font-mono font-bold text-primary tabular-nums">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? Number(v[0]) : Number(v);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-full"
      />
    </div>
  );
}

function ColorSwatchRow({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches: Array<{ hex: string; label: string }>;
}) {
  const known = swatches.some((c) => c.hex.toUpperCase() === value.toUpperCase());
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
          <Palette size={12} className="text-primary" />
          {label}
        </label>
        <span className="text-[10px] font-mono font-bold text-foreground">{value.toUpperCase()}</span>
      </div>
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
        {swatches.map((swatch) => {
          const selected = value.toUpperCase() === swatch.hex.toUpperCase();
          return (
            <button
              key={swatch.hex}
              type="button"
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={selected}
              onClick={() => onChange(swatch.hex)}
              className={cn(
                'h-6 w-6 shrink-0 rounded-full border-2 shadow-sm transition-transform',
                selected ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-border/60 hover:scale-105',
              )}
              style={{ backgroundColor: swatch.hex }}
            />
          );
        })}
        <label
          className={cn(
            'relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-primary/40',
            'flex items-center justify-center bg-muted/40 hover:border-primary',
            !known && 'ring-2 ring-primary/30 border-primary',
          )}
          title="Custom color"
        >
          <span className="text-[9px] font-black text-primary">+</span>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`Custom ${label.toLowerCase()}`}
          />
        </label>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem.toFixed(1).padStart(4, '0')}`;
}

export function CanonicalTypographyControls({
  draft,
  durationMs,
  playheadMs = 0,
  busy,
  error,
  onChange,
  onPatchActive,
}: Props) {
  const active = getActiveLayer(draft);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const faceItems = Object.fromEntries(CANONICAL_FACE_OPTIONS.map((f) => [f.id, f.label]));
  const duration = Math.max(1000, Math.round(durationMs));
  const maxLayers = 8;

  useEffect(() => {
    if (active && !active.text.trim()) {
      textInputRef.current?.focus();
    }
  }, [active?.id, active?.text]);

  // Warm browser faces so the font menu renders each name in its own typeface.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      try {
        const { loadCanonicalLayoutFont, prepareCanonicalLayout } = await import(
          '../../lib/clipTypography/canonicalLayout'
        );
        if (cancelled) return;
        // Load the active face fully; remaining faces get CSS family names as soft preview.
        const probe = await prepareCanonicalLayout({
          faceId: active.faceId,
          width: 320,
          height: 180,
          layers: [
            {
              id: 'probe',
              startMs: 0,
              endMs: 1000,
              fontSize: 24,
              lineHeight: 28,
              letterSpacing: 0,
              align: 'left',
              fill: '#FFFFFF',
              outline: 0,
              shadow: 0,
              text: 'Aa',
              left: 8,
              firstBaseline: 40,
              maxWidth: 280,
            },
          ],
        });
        await loadCanonicalLayoutFont(probe);
      } catch {
        /* preview still works with system fallback until a layer is authored */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.faceId]);

  const [layerClipboard, setLayerClipboard] = useState<CanonicalLayerDraft | null>(null);

  const setActive = (id: string) => onChange({ ...draft, activeLayerId: id });

  const addLayer = () => {
    if (draft.layers.length >= maxLayers) return;
    const layer = createLayerDraft({
      durationMs: duration,
      existingIds: draft.layers.map((l) => l.id),
      seed: {
        text: '',
        // Stack new layers in the lower third so they clear the center play control.
        verticalAnchor: Math.min(0.9, 0.78 + draft.layers.length * 0.05),
        startMs: Math.min(duration - 800, Math.round(playheadMs)),
        endMs: Math.min(duration, Math.round(playheadMs) + Math.min(2500, duration)),
        faceId: active?.faceId,
        outlineColor: active?.outlineColor,
        shadowColor: active?.shadowColor,
      },
    });
    onChange({
      ...draft,
      layers: [...draft.layers, layer],
      activeLayerId: layer.id,
    });
  };

  const copyActive = () => {
    if (!active) return;
    setLayerClipboard({ ...active });
  };

  const pasteLayer = () => {
    const clip = layerClipboard;
    if (!clip || draft.layers.length >= maxLayers) return;
    const { id: _omitId, ...style } = clip;
    const span = Math.max(800, (clip.endMs ?? 0) - (clip.startMs ?? 0));
    const layer = createLayerDraft({
      durationMs: duration,
      existingIds: draft.layers.map((l) => l.id),
      seed: {
        ...style,
        verticalAnchor: Math.min(0.92, (clip.verticalAnchor ?? 0.82) + 0.05),
        startMs: Math.min(duration - 800, Math.round(playheadMs)),
        endMs: Math.min(duration, Math.round(playheadMs) + span),
      },
    });
    onChange({
      ...draft,
      layers: [...draft.layers, layer],
      activeLayerId: layer.id,
    });
  };

  const removeActive = () => {
    if (!active || draft.layers.length < 1) return;
    const nextLayers = draft.layers.filter((l) => l.id !== active.id);
    onChange({
      ...draft,
      layers: nextLayers,
      activeLayerId: nextLayers[0]?.id ?? '',
    });
  };

  const patchTiming = (startMs: number, endMs: number) => {
    const start = Math.min(duration - 1, Math.max(0, Math.round(startMs)));
    const end = Math.min(duration, Math.max(start + 200, Math.round(endMs)));
    onPatchActive({ startMs: start, endMs: end });
  };

  return (
    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
          <Type size={15} />
        </div>
        <div className="min-w-0 flex-1 leading-none space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/60">
            Smart Typography
          </p>
          <p className="text-[12px] font-bold text-foreground">
            Multi-layer captions
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 min-w-0">
            <Layers size={12} className="text-primary shrink-0" />
            Text layers
          </label>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground mr-1">
              {draft.layers.length}/{maxLayers}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-[10px] font-bold px-2.5"
              disabled={draft.layers.length >= maxLayers}
              onClick={addLayer}
            >
              <Plus size={12} className="mr-1" />
              Add text
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-lg p-0"
              disabled={!active}
              onClick={copyActive}
              title="Copy selected text layer"
              aria-label="Copy selected text layer"
            >
              <Copy size={14} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-lg p-0"
              disabled={!layerClipboard || draft.layers.length >= maxLayers}
              onClick={pasteLayer}
              title="Paste text layer"
              aria-label="Paste text layer"
            >
              <ClipboardPaste size={14} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-lg p-0 text-destructive"
              disabled={!active}
              onClick={removeActive}
              title="Remove selected layer"
              aria-label="Remove selected layer"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        {draft.layers.length ? (
          <div className="flex flex-wrap gap-1.5">
            {draft.layers.map((layer, index) => {
              const selected = layer.id === active?.id;
              const color = LAYER_COLORS[index % LAYER_COLORS.length]!;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setActive(layer.id)}
                  className={cn(
                    'h-8 max-w-[9rem] truncate rounded-lg border px-2.5 text-[10px] font-bold transition-colors',
                    selected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30',
                  )}
                  style={selected ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                  title={layer.text || `Layer ${index + 1}`}
                >
                  {layer.text.trim() ? layer.text.trim().slice(0, 18) : `Layer ${index + 1}`}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground px-0.5">
            No text layers yet. Tap Add text to create one.
          </p>
        )}
      </div>

      {active ? (
      <>
      <label className="space-y-1 text-[10px] font-bold text-muted-foreground block">
        <span className="ml-1">Text</span>
        <textarea
          ref={textInputRef}
          rows={2}
          className="h-[3.25rem] max-h-[3.25rem] min-h-0 w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm font-medium text-foreground leading-snug focus:outline-none focus:border-primary/50"
          value={active.text}
          onChange={(e) => onPatchActive({ text: e.target.value })}
          placeholder="Type the words drawn on this clip…"
        />
      </label>

      {/* Timeline */}
      <div className="space-y-2 rounded-xl border border-border/40 bg-background/50 p-3">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Timeline placement
          </p>
          <span className="text-[10px] font-mono text-muted-foreground">{formatTime(duration)}</span>
        </div>
        <div className="relative space-y-1.5">
          {draft.layers.map((layer, index) => {
            const color = LAYER_COLORS[index % LAYER_COLORS.length]!;
            const left = (layer.startMs / duration) * 100;
            const width = Math.max(2, ((layer.endMs - layer.startMs) / duration) * 100);
            const selected = layer.id === active.id;
            return (
              <button
                key={layer.id}
                type="button"
                className={cn(
                  'relative h-7 w-full overflow-hidden rounded-md bg-muted/40',
                  selected && 'ring-1 ring-primary/50',
                )}
                onClick={() => setActive(layer.id)}
                aria-label={`Select layer ${index + 1} on timeline`}
              >
                <span
                  className="absolute top-0.5 bottom-0.5 rounded-sm"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: color,
                    opacity: selected ? 0.95 : 0.55,
                  }}
                />
                <span className="pointer-events-none absolute inset-0 flex items-center px-2 text-[9px] font-bold text-foreground/80">
                  {formatTime(layer.startMs)} – {formatTime(layer.endMs)}
                </span>
              </button>
            );
          })}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary z-10"
            style={{ left: `${Math.min(100, Math.max(0, (playheadMs / duration) * 100))}%` }}
            aria-hidden
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <CharacteristicSlider
            label="Appear at"
            value={active.startMs}
            display={formatTime(active.startMs)}
            min={0}
            max={Math.max(0, duration - 200)}
            step={50}
            onChange={(startMs) => patchTiming(startMs, Math.max(active.endMs, startMs + 200))}
          />
          <CharacteristicSlider
            label="Hide at"
            value={active.endMs}
            display={formatTime(active.endMs)}
            min={200}
            max={duration}
            step={50}
            onChange={(endMs) => patchTiming(Math.min(active.startMs, endMs - 200), endMs)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground ml-1">Font</label>
        <Select
          value={active.faceId}
          onValueChange={(v) => onPatchActive({ faceId: v as CanonicalLayerDraft['faceId'] })}
          items={faceItems}
        >
          <SelectTrigger className="h-11 w-full text-xs bg-muted/30 border-border/50 rounded-lg">
            <SelectValue>
              {(value: string | null) => {
                const font = CANONICAL_FACE_OPTIONS.find((f) => f.id === value);
                if (!font) return 'Font';
                return (
                  <span
                    className="truncate"
                    style={{
                      fontFamily: `"${canonicalBrowserFamily(font.id)}", system-ui, sans-serif`,
                      fontWeight: font.weight,
                      fontStyle: font.style === 'italic' ? 'italic' : 'normal',
                    }}
                  >
                    {font.label}
                  </span>
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CANONICAL_FACE_OPTIONS.map((font) => (
              <SelectItem key={font.id} value={font.id} label={font.label}>
                <span
                  style={{
                    fontFamily: `"${canonicalBrowserFamily(font.id)}", system-ui, sans-serif`,
                    fontWeight: font.weight,
                    fontStyle: font.style === 'italic' ? 'italic' : 'normal',
                    fontSize: '14px',
                  }}
                >
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          Characteristics
        </p>
        <CharacteristicSlider
          label="Size"
          value={active.fontSize}
          display={`${Math.round(active.fontSize)} px`}
          min={16}
          max={160}
          step={1}
          onChange={(fontSize) => onPatchActive({ fontSize })}
        />
        <CharacteristicSlider
          label="Line height"
          value={active.lineHeightRatio}
          display={`${active.lineHeightRatio.toFixed(2)}×`}
          min={1}
          max={2.4}
          step={0.05}
          onChange={(lineHeightRatio) => onPatchActive({ lineHeightRatio })}
        />
        <CharacteristicSlider
          label="Tracking"
          value={active.letterSpacing}
          display={`${Math.round(active.letterSpacing)}`}
          min={0}
          max={24}
          step={0.5}
          onChange={(letterSpacing) => onPatchActive({ letterSpacing })}
        />
        <CharacteristicSlider
          label="Stroke width"
          value={active.outline}
          display={`${Math.round(active.outline)}`}
          min={0}
          max={12}
          step={1}
          onChange={(outline) => onPatchActive({ outline })}
        />
        <ColorSwatchRow
          label="Stroke color"
          value={active.outlineColor || '#000000'}
          swatches={EFFECT_COLORS}
          onChange={(outlineColor) => onPatchActive({ outlineColor })}
        />
        <CharacteristicSlider
          label="Shadow size"
          value={active.shadow}
          display={`${Math.round(active.shadow)}`}
          min={0}
          max={24}
          step={1}
          onChange={(shadow) => onPatchActive({ shadow })}
        />
        <ColorSwatchRow
          label="Shadow color"
          value={active.shadowColor || '#000000'}
          swatches={EFFECT_COLORS}
          onChange={(shadowColor) => onPatchActive({ shadowColor })}
        />
        <CharacteristicSlider
          label="Safe margin"
          value={draft.safeInset}
          display={`${Math.round(draft.safeInset * 100)}%`}
          min={0.05}
          max={0.18}
          step={0.01}
          onChange={(safeInset) => onChange({ ...draft, safeInset })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground ml-1">Align</label>
        <div className="flex gap-1.5">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              className={cn(
                'h-9 flex-1 rounded-lg border text-[10px] font-bold capitalize transition-colors',
                active.align === align
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30',
              )}
              onClick={() => onPatchActive({ align })}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <ColorSwatchRow
        label="Text color"
        value={active.fill}
        swatches={CANONICAL_FILL_COLORS}
        onChange={(fill) => onPatchActive({ fill })}
      />

      {busy ? <p className="text-[10px] text-muted-foreground">Updating layout…</p> : null}
      {error ? (
        <p role="alert" className="text-[10px] text-destructive">
          {error}
        </p>
      ) : null}
      </>
      ) : null}
    </div>
  );
}
