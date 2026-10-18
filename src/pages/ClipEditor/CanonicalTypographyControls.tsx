import { Type, Move, Palette, Plus, Trash2, Layers } from 'lucide-react';
import { CANONICAL_FACE_OPTIONS } from '../../lib/clipTypography/canonicalFaces';
import {
  compositionHasMixedFonts,
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
  const faceItems = Object.fromEntries(CANONICAL_FACE_OPTIONS.map((f) => [f.id, f.label]));
  const fillKnown = CANONICAL_FILL_COLORS.some(
    (c) => c.hex.toUpperCase() === active.fill.toUpperCase(),
  );
  const duration = Math.max(1000, Math.round(durationMs));
  const mixedFonts = compositionHasMixedFonts(draft);
  const maxLayers = 8;

  const setActive = (id: string) => onChange({ ...draft, activeLayerId: id });

  const addLayer = () => {
    if (draft.layers.length >= maxLayers) return;
    const layer = createLayerDraft({
      durationMs: duration,
      existingIds: draft.layers.map((l) => l.id),
      seed: {
        text: '',
        verticalAnchor: Math.min(0.9, 0.35 + draft.layers.length * 0.12),
        startMs: Math.min(duration - 800, Math.round(playheadMs)),
        endMs: Math.min(duration, Math.round(playheadMs) + Math.min(2500, duration)),
        faceId: active.faceId,
      },
    });
    onChange({
      ...draft,
      layers: [...draft.layers, layer],
      activeLayerId: layer.id,
    });
  };

  const removeActive = () => {
    if (draft.layers.length <= 1) return;
    const nextLayers = draft.layers.filter((l) => l.id !== active.id);
    onChange({
      ...draft,
      layers: nextLayers,
      activeLayerId: nextLayers[0]!.id,
    });
  };

  const patchTiming = (startMs: number, endMs: number) => {
    const start = Math.min(duration - 1, Math.max(0, Math.round(startMs)));
    const end = Math.min(duration, Math.max(start + 200, Math.round(endMs)));
    onPatchActive({ startMs: start, endMs: end });
  };

  return (
    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
            <Type size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-primary/60">
              Smart Typography
            </p>
            <p className="text-[13px] font-bold text-foreground truncate">Multi-layer captions</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/60 px-2.5 py-1 text-[9px] font-bold text-primary">
          <Move size={11} />
          Drag on preview
        </div>
      </div>

      {/* Layer picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Layers size={12} className="text-primary" />
            Text layers
          </label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {draft.layers.length}/{maxLayers}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {draft.layers.map((layer, index) => {
            const selected = layer.id === active.id;
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-[10px] font-bold"
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
            className="h-8 rounded-lg text-[10px] font-bold text-destructive"
            disabled={draft.layers.length <= 1}
            onClick={removeActive}
            title="Remove active layer"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

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
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Scrub the clip preview — each layer only shows between its appear/hide times. Drag the active
          layer on the preview to place it.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground ml-1">Font</label>
        <Select
          value={active.faceId}
          onValueChange={(v) => onPatchActive({ faceId: v as CanonicalLayerDraft['faceId'] })}
          items={faceItems}
        >
          <SelectTrigger className="h-10 w-full text-xs bg-muted/30 border-border/50 rounded-lg">
            <SelectValue>
              {(value: string | null) =>
                CANONICAL_FACE_OPTIONS.find((f) => f.id === value)?.label ?? 'Font'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CANONICAL_FACE_OPTIONS.map((font) => (
              <SelectItem key={font.id} value={font.id} label={font.label}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mixedFonts ? (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 px-1 leading-relaxed">
            Multiple fonts selected — export v1 burns the first layer&apos;s typeface for all layers.
            Preview uses that typeface until multi-face export ships.
          </p>
        ) : null}
      </div>

      <label className="space-y-1.5 text-[10px] font-bold text-muted-foreground block">
        <span className="ml-1">Caption text</span>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground leading-relaxed focus:outline-none focus:border-primary/50"
          value={active.text}
          onChange={(e) => onPatchActive({ text: e.target.value })}
          placeholder="Type this layer’s caption"
        />
      </label>

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
          label="Stroke"
          value={active.outline}
          display={`${Math.round(active.outline)}`}
          min={0}
          max={12}
          step={1}
          onChange={(outline) => onPatchActive({ outline })}
        />
        <CharacteristicSlider
          label="Shadow"
          value={active.shadow}
          display={`${Math.round(active.shadow)}`}
          min={0}
          max={24}
          step={1}
          onChange={(shadow) => onPatchActive({ shadow })}
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

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Palette size={12} className="text-primary" />
            Text color
          </label>
          <span className="text-[10px] font-mono font-bold text-foreground">{active.fill.toUpperCase()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CANONICAL_FILL_COLORS.map((swatch) => {
            const selected = active.fill.toUpperCase() === swatch.hex.toUpperCase();
            return (
              <button
                key={swatch.hex}
                type="button"
                title={swatch.label}
                aria-label={swatch.label}
                aria-pressed={selected}
                onClick={() => onPatchActive({ fill: swatch.hex })}
                className={cn(
                  'h-8 w-8 rounded-full border-2 shadow-sm transition-transform',
                  selected ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-border/60 hover:scale-105',
                )}
                style={{ backgroundColor: swatch.hex }}
              />
            );
          })}
          <label
            className={cn(
              'relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-primary/40',
              'flex items-center justify-center bg-muted/40 hover:border-primary',
              !fillKnown && 'ring-2 ring-primary/30 border-primary',
            )}
            title="Custom color"
          >
            <span className="text-[9px] font-black text-primary">+</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(active.fill) ? active.fill : '#FFFFFF'}
              onChange={(e) => onPatchActive({ fill: e.target.value.toUpperCase() })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom text color"
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground leading-relaxed">
        Active position:{' '}
        <span className="font-mono font-bold text-foreground">
          {Math.round(active.positionX * 100)}% · {Math.round(active.verticalAnchor * 100)}%
        </span>
      </div>

      {busy ? <p className="text-[10px] text-muted-foreground">Updating layout…</p> : null}
      {error ? (
        <p role="alert" className="text-[10px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
