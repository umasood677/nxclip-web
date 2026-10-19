import {
  Type,
  Palette,
  Plus,
  Trash2,
  Layers,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { CANONICAL_FACE_OPTIONS } from '../../../lib/clipTypography/canonicalFaces';
import { CANONICAL_FILL_COLORS } from '../../ClipEditor/CanonicalTypographyControls';
import {
  cssFamilyForFaceId,
  faceIdToEditFontId,
  resolveLayerFaceId,
  studioFontFamily,
} from '../lib/imageStudioTypography';
import type { ImageEditTextLayer } from '../types';
import { cn } from '../../../lib/utils';
import { Slider } from '../../../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';

const LAYER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#ef4444', '#14b8a6'];
const LEGACY_FONTS = [
  { id: 'impact' as const, label: 'Anton (Impact style)' },
  { id: 'inter' as const, label: 'Inter' },
  { id: 'montserrat' as const, label: 'Montserrat' },
];

function CharacteristicSlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  disabled?: boolean;
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
        disabled={disabled}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? Number(v[0]) : Number(v);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-full"
      />
    </div>
  );
}

type Props = {
  editLayers: ImageEditTextLayer[];
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string) => void;
  onAddTextLayer?: () => void;
  onUpdateSelectedLayer?: (patch: Partial<ImageEditTextLayer>) => void;
  onRemoveSelectedLayer?: () => void;
  onToggleLayerVisible?: (id: string) => void;
  onMoveLayer?: (id: string, direction: 'up' | 'down') => void;
  onApplyCompose?: () => void;
  isApplyingCompose?: boolean;
  hasComposedText?: boolean;
  toolsLocked?: boolean;
  /** When true, offer the full 15-face Smart Typography catalog. */
  useCanonicalFaces?: boolean;
};

export function ImageStudioTypographyControls({
  editLayers,
  selectedLayerId,
  onSelectLayer,
  onAddTextLayer,
  onUpdateSelectedLayer,
  onRemoveSelectedLayer,
  onToggleLayerVisible,
  onMoveLayer,
  onApplyCompose,
  isApplyingCompose,
  hasComposedText = false,
  toolsLocked,
  useCanonicalFaces = false,
}: Props) {
  const textLayers = editLayers.filter((l) => l.type === 'text');
  const selected =
    editLayers.find((l) => l.id === selectedLayerId && l.type === 'text') ||
    textLayers[0];
  const fill = selected?.color || '#FFFFFF';
  const fillKnown = CANONICAL_FILL_COLORS.some(
    (c) => c.hex.toUpperCase() === fill.toUpperCase(),
  );
  const faceItems = Object.fromEntries(CANONICAL_FACE_OPTIONS.map((f) => [f.id, f.label]));
  const activeFaceId = selected ? resolveLayerFaceId(selected) : undefined;
  const maxLayers = 24;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
          <Type size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/60">
            Smart Typography
          </p>
          <p className="text-[13px] font-bold text-foreground leading-snug">
            Text &amp; layers
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <Label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Layers size={12} className="text-primary" />
            Layers
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {textLayers.length}/{maxLayers - 1}
          </span>
        </div>

        <div className="space-y-2">
          {editLayers.map((layer, index) => {
            const isSelected = layer.id === selected?.id;
            const color = LAYER_COLORS[index % LAYER_COLORS.length]!;
            const label =
              layer.type === 'base'
                ? 'Background'
                : (layer.text || '').trim() || `Layer ${index}`;
            return (
              <div
                key={layer.id}
                className={cn(
                  'rounded-lg border px-2 py-2 flex items-center gap-1.5',
                  isSelected && layer.type === 'text'
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-border/50 bg-muted/10',
                )}
                style={
                  isSelected && layer.type === 'text'
                    ? { boxShadow: `inset 3px 0 0 ${color}` }
                    : undefined
                }
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left text-[11px] font-medium truncate"
                  onClick={() => {
                    if (layer.type === 'text') onSelectLayer?.(layer.id);
                  }}
                  disabled={toolsLocked && layer.type === 'text'}
                  title={label}
                >
                  {label}
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onToggleLayerVisible?.(layer.id)}
                  disabled={toolsLocked}
                  aria-label={layer.visible !== false ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                {layer.type === 'text' ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => onMoveLayer?.(layer.id, 'up')}
                      disabled={toolsLocked}
                      aria-label="Move layer up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => onMoveLayer?.(layer.id, 'down')}
                      disabled={toolsLocked}
                      aria-label="Move layer down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-[10px] font-bold"
            disabled={toolsLocked || editLayers.length >= maxLayers}
            onClick={onAddTextLayer}
          >
            <Plus size={12} className="mr-1" />
            Add text
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-[10px] font-bold text-destructive"
            disabled={toolsLocked || !selected || textLayers.length < 1}
            onClick={onRemoveSelectedLayer}
            title="Remove selected text layer"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {selected ? (
        <>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground ml-1">Font</label>
            {useCanonicalFaces ? (
              <Select
                value={activeFaceId}
                onValueChange={(v) =>
                  onUpdateSelectedLayer?.({
                    faceId: v,
                    fontId: faceIdToEditFontId(v),
                  })
                }
                items={faceItems}
                disabled={toolsLocked}
              >
                <SelectTrigger className="h-11 w-full text-xs bg-muted/30 border-border/50 rounded-lg">
                  <SelectValue>
                    {(value: string | null) => {
                      const font = CANONICAL_FACE_OPTIONS.find((f) => f.id === value);
                      if (!font) return 'Font';
                      const css = cssFamilyForFaceId(font.id);
                      return (
                        <span
                          className="truncate"
                          style={{
                            fontFamily: css.family,
                            fontWeight: css.weight,
                            fontStyle: css.style === 'italic' ? 'italic' : 'normal',
                          }}
                        >
                          {font.label}
                        </span>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CANONICAL_FACE_OPTIONS.map((font) => {
                    const css = cssFamilyForFaceId(font.id);
                    return (
                      <SelectItem key={font.id} value={font.id} label={font.label}>
                        <span
                          style={{
                            fontFamily: css.family,
                            fontWeight: css.weight,
                            fontStyle: css.style === 'italic' ? 'italic' : 'normal',
                            fontSize: '14px',
                          }}
                        >
                          {font.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={selected.fontId || 'impact'}
                onValueChange={(value) =>
                  onUpdateSelectedLayer?.({
                    fontId: value as 'impact' | 'inter' | 'montserrat',
                    faceId: undefined,
                  })
                }
                disabled={toolsLocked}
              >
                <SelectTrigger className="h-11 w-full text-xs bg-muted/30 border-border/50 rounded-lg">
                  <SelectValue>
                    {(value: string | null) => {
                      const font = LEGACY_FONTS.find((f) => f.id === value);
                      return (
                        <span style={{ fontFamily: studioFontFamily(value as 'impact' | 'inter' | 'montserrat') }}>
                          {font?.label ?? 'Font'}
                        </span>
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LEGACY_FONTS.map((font) => (
                    <SelectItem key={font.id} value={font.id} label={font.label}>
                      <span style={{ fontFamily: studioFontFamily(font.id), fontSize: '14px' }}>
                        {font.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {useCanonicalFaces ? (
              <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
                Preview and Apply to Image use the same typeface. Apply text only burns layers;
                use the footer Apply to Image when Adjust is ready too.
              </p>
            ) : null}
          </div>

          <label className="space-y-1.5 text-[10px] font-bold text-muted-foreground block">
            <span className="ml-1">Caption text</span>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground leading-relaxed focus:outline-none focus:border-primary/50 disabled:opacity-50"
              value={selected.text || ''}
              onChange={(e) => onUpdateSelectedLayer?.({ text: e.target.value })}
              placeholder="Type this layer’s caption"
              disabled={toolsLocked}
            />
          </label>

          <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              Characteristics
            </p>
            <CharacteristicSlider
              label="Size"
              value={selected.fontSizePct ?? 8}
              display={`${selected.fontSizePct ?? 8}%`}
              min={2}
              max={24}
              step={1}
              disabled={toolsLocked}
              onChange={(fontSizePct) => onUpdateSelectedLayer?.({ fontSizePct })}
            />
            <CharacteristicSlider
              label="Line height"
              value={selected.lineHeightRatio ?? 1.15}
              display={`${(selected.lineHeightRatio ?? 1.15).toFixed(2)}×`}
              min={1}
              max={2.4}
              step={0.05}
              disabled={toolsLocked}
              onChange={(lineHeightRatio) => onUpdateSelectedLayer?.({ lineHeightRatio })}
            />
            <CharacteristicSlider
              label="Tracking"
              value={selected.letterSpacing ?? 0}
              display={`${Math.round(selected.letterSpacing ?? 0)}`}
              min={0}
              max={24}
              step={0.5}
              disabled={toolsLocked}
              onChange={(letterSpacing) => onUpdateSelectedLayer?.({ letterSpacing })}
            />
            <CharacteristicSlider
              label="Stroke"
              value={selected.outline ?? 2}
              display={`${Math.round(selected.outline ?? 2)}`}
              min={0}
              max={12}
              step={1}
              disabled={toolsLocked}
              onChange={(outline) => onUpdateSelectedLayer?.({ outline })}
            />
            <CharacteristicSlider
              label="Shadow"
              value={selected.shadow ?? 4}
              display={`${Math.round(selected.shadow ?? 4)}`}
              min={0}
              max={24}
              step={1}
              disabled={toolsLocked}
              onChange={(shadow) => onUpdateSelectedLayer?.({ shadow })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground ml-1">Align</label>
            <div className="flex gap-1.5">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  disabled={toolsLocked}
                  className={cn(
                    'h-9 flex-1 rounded-lg border text-[10px] font-bold capitalize transition-colors disabled:opacity-50',
                    selected.align === align
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30',
                  )}
                  onClick={() => onUpdateSelectedLayer?.({ align })}
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
              <span className="text-[10px] font-mono font-bold text-foreground">
                {fill.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CANONICAL_FILL_COLORS.map((swatch) => {
                const selectedSwatch = fill.toUpperCase() === swatch.hex.toUpperCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={swatch.label}
                    aria-label={swatch.label}
                    aria-pressed={selectedSwatch}
                    disabled={toolsLocked}
                    onClick={() => onUpdateSelectedLayer?.({ color: swatch.hex })}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 shadow-sm transition-transform disabled:opacity-50',
                      selectedSwatch
                        ? 'border-primary scale-110 ring-2 ring-primary/30'
                        : 'border-border/60 hover:scale-105',
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
                  toolsLocked && 'pointer-events-none opacity-50',
                )}
                title="Custom color"
              >
                <span className="text-[9px] font-black text-primary">+</span>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(fill) ? fill : '#FFFFFF'}
                  onChange={(e) =>
                    onUpdateSelectedLayer?.({ color: e.target.value.toUpperCase() })
                  }
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Custom text color"
                  disabled={toolsLocked}
                />
              </label>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <label className="text-[10px] font-bold text-muted-foreground">Stroke color</label>
              <input
                type="color"
                value={selected.strokeColor || '#000000'}
                onChange={(e) =>
                  onUpdateSelectedLayer?.({ strokeColor: e.target.value })
                }
                className="h-8 w-12 cursor-pointer rounded border border-border/50 bg-muted/30 p-1"
                disabled={toolsLocked}
                aria-label="Stroke color"
              />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed px-0.5">
            Drag text on the preview to place it. Apply text only burns typography; Apply to Image
            in the footer burns Adjust + Typography together.
          </p>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Add a text layer to start. Layers stay editable until you apply them to the image.
        </p>
      )}

      {(selected || hasComposedText || textLayers.length > 0) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[10px] h-9 font-bold"
          onClick={onApplyCompose}
          disabled={toolsLocked || isApplyingCompose}
          title="Burn text layers only"
        >
          {isApplyingCompose ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
          Apply text only
        </Button>
      )}
    </div>
  );
}
