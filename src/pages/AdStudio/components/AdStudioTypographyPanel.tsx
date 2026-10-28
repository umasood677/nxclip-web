import { Type } from "lucide-react";
import {
  CANONICAL_EFFECT_COLORS,
  CANONICAL_FILL_COLORS,
  ColorSwatchRow,
} from "../../ClipEditor/CanonicalTypographyControls";
import { AD_STUDIO_FONTS, resolveAdFontFamily } from "../lib/adFonts";
import type { AlignMode } from "../lib/sceneGraph";
import type { AdSceneLayer, AdTextLayer } from "../types";
import { cn } from "../../../lib/utils";
import { Slider } from "../../../components/ui/slider";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

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
        <label className="text-[10px] font-bold text-muted-foreground">
          {label}
        </label>
        <span className="text-[10px] font-mono font-bold text-primary tabular-nums">
          {display}
        </span>
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

const ALIGN_MODES: { mode: AlignMode; label: string }[] = [
  { mode: "left", label: "←" },
  { mode: "center", label: "↔" },
  { mode: "right", label: "→" },
  { mode: "top", label: "↑" },
  { mode: "middle", label: "↕" },
  { mode: "bottom", label: "↓" },
];

type Props = {
  layer: AdSceneLayer | null;
  onChange: (patch: Partial<AdSceneLayer>) => void;
  onAlign?: (mode: AlignMode) => void;
  canvasBackground?: string;
  onCanvasBackground?: (hex: string) => void;
  previewMode?: boolean;
};

function isTextLayer(layer: AdSceneLayer): layer is AdTextLayer {
  return layer.type === "text";
}

/**
 * Image-Studio-parity typography / layer refinement for Ad Canvas.
 * Replaces the former Props tab.
 */
export function AdStudioTypographyPanel({
  layer,
  onChange,
  onAlign,
  canvasBackground,
  onCanvasBackground,
  previewMode,
}: Props) {
  if (previewMode) {
    return (
      <p className="text-xs text-muted-foreground p-1">
        Preview mode — exit preview to edit typography.
      </p>
    );
  }

  const text = layer && isTextLayer(layer) ? layer : null;
  const locked = Boolean(layer?.locked);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
          <Type size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-wider text-primary/60">
            Typography
          </p>
          <p className="text-[13px] font-bold text-foreground leading-snug">
            Text &amp; canvas
          </p>
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
            {text
              ? text.name?.trim() || "Text layer"
              : layer
                ? `${layer.name || layer.type} · select text for fonts`
                : "Select a text layer to refine"}
          </p>
        </div>
      </div>

      {onCanvasBackground ? (
        <div className="space-y-1.5 rounded-lg border border-border/40 bg-muted/10 p-2.5">
          <Label className="text-[10px] font-bold text-muted-foreground">
            Canvas background
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="h-9 w-12 p-1 cursor-pointer"
              value={canvasBackground || "#111827"}
              onChange={(e) => onCanvasBackground(e.target.value)}
              aria-label="Canvas background color"
            />
            <Input
              className="h-9 text-xs font-mono"
              value={canvasBackground || "#111827"}
              onChange={(e) => onCanvasBackground(e.target.value)}
              aria-label="Canvas background hex"
            />
          </div>
        </div>
      ) : null}

      {!layer ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-3">
          <p className="text-[11px] font-medium text-foreground">
            Select a layer on the canvas or in Layers to edit text, opacity, and
            styling.
          </p>
        </div>
      ) : null}

      {layer ? (
        <div className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-2.5">
          <div>
            <Label
              htmlFor="ad-layer-name"
              className="text-[10px] font-bold text-muted-foreground"
            >
              Layer name
            </Label>
            <Input
              id="ad-layer-name"
              className="mt-1 h-8 text-xs bg-background/80"
              value={layer.name ?? ""}
              disabled={locked}
              placeholder="Name only (not ad copy)"
              onChange={(e) => onChange({ name: e.target.value })}
              aria-label="Layer name"
            />
          </div>
          {text ? (
            <div>
              <Label
                htmlFor="ad-layer-caption"
                className="text-[10px] font-bold text-muted-foreground"
              >
                Caption text
              </Label>
              <textarea
                id="ad-layer-caption"
                className="mt-1 min-h-[72px] w-full rounded-md border border-border/50 bg-background/80 px-2.5 py-2 text-xs font-medium text-foreground leading-relaxed focus:outline-none focus:border-primary/50 disabled:opacity-50"
                value={text.text || ""}
                disabled={locked}
                onChange={(e) =>
                  onChange({ text: e.target.value } as Partial<AdTextLayer>)
                }
                placeholder="Ad copy shown on the canvas"
                aria-label="Caption text"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {layer ? (
        <>
          <CharacteristicSlider
            label="Opacity"
            value={Math.round((layer.opacity ?? 1) * 100)}
            display={`${Math.round((layer.opacity ?? 1) * 100)}%`}
            min={0}
            max={100}
            step={1}
            disabled={locked}
            onChange={(pct) => onChange({ opacity: pct / 100 })}
          />

          {onAlign ? (
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground">
                Align to canvas
              </Label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {ALIGN_MODES.map(({ mode, label }) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 w-8 px-0 text-xs"
                    title={mode}
                    disabled={locked}
                    onClick={() => onAlign(mode)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["X", "x", layer.x],
                ["Y", "y", layer.y],
                ["W", "width", layer.width],
                ["H", "height", layer.height],
              ] as const
            ).map(([label, key, val]) => (
              <div key={key}>
                <Label className="text-[10px] font-bold text-muted-foreground">
                  {label}
                </Label>
                <Input
                  type="number"
                  className="h-8 text-xs mt-1"
                  value={val}
                  disabled={locked}
                  onChange={(e) =>
                    onChange({ [key]: Number(e.target.value) } as Partial<AdSceneLayer>)
                  }
                />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {text ? (
        <>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground ml-0.5">
              Font
            </label>
            <select
              className="h-11 w-full rounded-lg border border-border/50 bg-muted/30 px-3 text-xs disabled:opacity-50"
              style={{
                fontFamily: resolveAdFontFamily(text.fontId || text.fontFamily),
              }}
              value={text.fontId || "montserrat"}
              disabled={locked}
              onChange={(e) =>
                onChange({ fontId: e.target.value } as Partial<AdTextLayer>)
              }
              aria-label="Font"
            >
              {AD_STUDIO_FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              Characteristics
            </p>
            <CharacteristicSlider
              label="Size"
              value={text.fontSize ?? 48}
              display={`${Math.round(text.fontSize ?? 48)}px`}
              min={12}
              max={160}
              step={1}
              disabled={locked}
              onChange={(fontSize) =>
                onChange({ fontSize } as Partial<AdTextLayer>)
              }
            />
            <CharacteristicSlider
              label="Weight"
              value={Number(text.fontWeight ?? 700)}
              display={`${Number(text.fontWeight ?? 700)}`}
              min={300}
              max={900}
              step={100}
              disabled={locked}
              onChange={(fontWeight) =>
                onChange({ fontWeight } as Partial<AdTextLayer>)
              }
            />
            <CharacteristicSlider
              label="Line height"
              value={text.lineHeight ?? 1.15}
              display={`${(text.lineHeight ?? 1.15).toFixed(2)}×`}
              min={1}
              max={2.4}
              step={0.05}
              disabled={locked}
              onChange={(lineHeight) =>
                onChange({ lineHeight } as Partial<AdTextLayer>)
              }
            />
            <CharacteristicSlider
              label="Tracking"
              value={text.letterSpacing ?? 0}
              display={`${Math.round(text.letterSpacing ?? 0)}`}
              min={-2}
              max={24}
              step={0.5}
              disabled={locked}
              onChange={(letterSpacing) =>
                onChange({ letterSpacing } as Partial<AdTextLayer>)
              }
            />
            <CharacteristicSlider
              label="Stroke"
              value={text.strokeWidth ?? 0}
              display={`${Math.round(text.strokeWidth ?? 0)}`}
              min={0}
              max={12}
              step={1}
              disabled={locked}
              onChange={(strokeWidth) =>
                onChange({ strokeWidth } as Partial<AdTextLayer>)
              }
            />
            <ColorSwatchRow
              label="Stroke color"
              value={text.strokeColor || "#000000"}
              swatches={CANONICAL_EFFECT_COLORS}
              disabled={locked}
              onChange={(strokeColor) =>
                onChange({ strokeColor } as Partial<AdTextLayer>)
              }
            />
            <CharacteristicSlider
              label="Shadow"
              value={text.shadow?.blur ?? 0}
              display={`${Math.round(text.shadow?.blur ?? 0)}`}
              min={0}
              max={24}
              step={1}
              disabled={locked}
              onChange={(blur) =>
                onChange({
                  shadow: {
                    color: text.shadow?.color ?? "#000000",
                    blur,
                    offsetX: text.shadow?.offsetX ?? 0,
                    offsetY: text.shadow?.offsetY ?? 4,
                  },
                } as Partial<AdTextLayer>)
              }
            />
            <ColorSwatchRow
              label="Shadow color"
              value={text.shadow?.color || "#000000"}
              swatches={CANONICAL_EFFECT_COLORS}
              disabled={locked}
              onChange={(color) =>
                onChange({
                  shadow: {
                    color,
                    blur: text.shadow?.blur ?? 8,
                    offsetX: text.shadow?.offsetX ?? 0,
                    offsetY: text.shadow?.offsetY ?? 4,
                  },
                } as Partial<AdTextLayer>)
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground ml-0.5">
              Align
            </label>
            <div className="flex gap-1.5">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  disabled={locked}
                  className={cn(
                    "h-9 flex-1 rounded-lg border text-[10px] font-bold capitalize transition-colors disabled:opacity-50",
                    text.align === align
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30",
                  )}
                  onClick={() => onChange({ align } as Partial<AdTextLayer>)}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          <ColorSwatchRow
            label="Text color"
            value={text.color || "#FFFFFF"}
            swatches={CANONICAL_FILL_COLORS}
            disabled={locked}
            onChange={(color) => onChange({ color } as Partial<AdTextLayer>)}
          />

          <label className="flex items-center gap-2 text-[11px] font-medium">
            <input
              type="checkbox"
              checked={Boolean(text.uppercase)}
              disabled={locked}
              onChange={(e) =>
                onChange({ uppercase: e.target.checked } as Partial<AdTextLayer>)
              }
            />
            Uppercase
          </label>
        </>
      ) : null}

      {layer?.type === "shape" ? (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] font-bold text-muted-foreground">
              CTA text
            </Label>
            <Input
              className="mt-1 h-9 text-xs"
              value={(layer as { text?: string }).text ?? ""}
              disabled={locked}
              onChange={(e) =>
                onChange({ text: e.target.value } as Partial<AdSceneLayer>)
              }
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-muted-foreground">
              Fill
            </Label>
            <Input
              type="color"
              className="mt-1 h-9 w-full p-1"
              value={(layer as { fill?: string }).fill ?? "#2563eb"}
              disabled={locked}
              onChange={(e) =>
                onChange({ fill: e.target.value } as Partial<AdSceneLayer>)
              }
            />
          </div>
        </div>
      ) : null}

      {(layer?.type === "image" || layer?.type === "logo") && (
        <div>
          <Label className="text-[10px] font-bold text-muted-foreground">
            Object fit
          </Label>
          <select
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={(layer as { objectFit?: string }).objectFit ?? "cover"}
            disabled={locked}
            onChange={(e) =>
              onChange({
                objectFit: e.target.value as "cover" | "contain" | "fill",
              } as Partial<AdSceneLayer>)
            }
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </div>
      )}
    </div>
  );
}
