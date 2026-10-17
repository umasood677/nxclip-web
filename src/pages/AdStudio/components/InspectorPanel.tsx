import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { AD_STUDIO_FONTS } from "../lib/adFonts";
import type { AlignMode } from "../lib/sceneGraph";
import type { AdSceneLayer } from "../types";

interface InspectorPanelProps {
  layer: AdSceneLayer | null;
  onChange: (patch: Partial<AdSceneLayer>) => void;
  onAlign?: (mode: AlignMode) => void;
  canvasBackground?: string;
  onCanvasBackground?: (hex: string) => void;
}

const ALIGN_MODES: { mode: AlignMode; label: string }[] = [
  { mode: "left", label: "←" },
  { mode: "center", label: "↔" },
  { mode: "right", label: "→" },
  { mode: "top", label: "↑" },
  { mode: "middle", label: "↕" },
  { mode: "bottom", label: "↓" },
];

export function InspectorPanel({
  layer,
  onChange,
  onAlign,
  canvasBackground,
  onCanvasBackground,
}: InspectorPanelProps) {
  if (!layer) {
    return (
      <div className="space-y-3 p-2">
        <p className="text-sm text-muted-foreground">
          Select a layer to edit typography, color, and transform.
        </p>
        {onCanvasBackground ? (
          <div>
            <Label className="text-xs">Canvas background</Label>
            <Input
              type="color"
              value={canvasBackground || "#111827"}
              onChange={(e) => onCanvasBackground(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={layer.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      {onAlign ? (
        <div>
          <Label className="text-xs">Align to canvas</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {ALIGN_MODES.map(({ mode, label }) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-8 px-0 text-xs"
                title={mode}
                disabled={Boolean(layer.locked)}
                onClick={() => onAlign(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X</Label>
          <Input type="number" value={layer.x} onChange={(e) => onChange({ x: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Y</Label>
          <Input type="number" value={layer.y} onChange={(e) => onChange({ y: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">W</Label>
          <Input type="number" value={layer.width} onChange={(e) => onChange({ width: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">H</Label>
          <Input type="number" value={layer.height} onChange={(e) => onChange({ height: Number(e.target.value) })} />
        </div>
      </div>
      {onCanvasBackground ? (
        <div>
          <Label className="text-xs">Canvas background</Label>
          <Input
            type="color"
            value={canvasBackground || "#111827"}
            onChange={(e) => onCanvasBackground(e.target.value)}
          />
        </div>
      ) : null}
      <div>
        <Label className="text-xs">Opacity</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity ?? 1}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label className="text-xs">Rotation</Label>
        <Input
          type="number"
          value={layer.rotation ?? 0}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
        />
      </div>

      {layer.type === "text" && (
        <>
          <div>
            <Label className="text-xs">Text</Label>
            <Input
              value={(layer as any).text ?? ""}
              onChange={(e) => onChange({ text: e.target.value } as any)}
            />
          </div>
          <div>
            <Label className="text-xs">Font</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={(layer as any).fontId ?? "montserrat"}
              onChange={(e) => onChange({ fontId: e.target.value } as any)}
            >
              {AD_STUDIO_FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Size</Label>
              <Input
                type="number"
                value={(layer as any).fontSize ?? 48}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) } as any)}
              />
            </div>
            <div>
              <Label className="text-xs">Weight</Label>
              <Input
                type="number"
                value={Number((layer as any).fontWeight ?? 700)}
                onChange={(e) => onChange({ fontWeight: Number(e.target.value) } as any)}
              />
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                value={(layer as any).color ?? "#ffffff"}
                onChange={(e) => onChange({ color: e.target.value } as any)}
              />
            </div>
            <div>
              <Label className="text-xs">Align</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={(layer as any).align ?? "left"}
                onChange={(e) => onChange({ align: e.target.value } as any)}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Letter spacing</Label>
              <Input
                type="number"
                step={0.5}
                value={(layer as any).letterSpacing ?? 0}
                onChange={(e) => onChange({ letterSpacing: Number(e.target.value) } as any)}
              />
            </div>
            <div>
              <Label className="text-xs">Line height</Label>
              <Input
                type="number"
                step={0.05}
                value={(layer as any).lineHeight ?? 1.15}
                onChange={(e) => onChange({ lineHeight: Number(e.target.value) } as any)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={Boolean((layer as any).uppercase)}
              onChange={(e) => onChange({ uppercase: e.target.checked } as any)}
            />
            Uppercase
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Stroke color</Label>
              <Input
                type="color"
                value={(layer as any).strokeColor ?? "#000000"}
                onChange={(e) => onChange({ strokeColor: e.target.value } as any)}
              />
            </div>
            <div>
              <Label className="text-xs">Stroke width</Label>
              <Input
                type="number"
                value={(layer as any).strokeWidth ?? 0}
                onChange={(e) => onChange({ strokeWidth: Number(e.target.value) } as any)}
              />
            </div>
            <div>
              <Label className="text-xs">Shadow blur</Label>
              <Input
                type="number"
                value={(layer as any).shadow?.blur ?? 0}
                onChange={(e) =>
                  onChange({
                    shadow: {
                      color: (layer as any).shadow?.color ?? "#000000",
                      blur: Number(e.target.value),
                      offsetX: (layer as any).shadow?.offsetX ?? 0,
                      offsetY: (layer as any).shadow?.offsetY ?? 4,
                    },
                  } as any)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Shadow color</Label>
              <Input
                type="color"
                value={(layer as any).shadow?.color ?? "#000000"}
                onChange={(e) =>
                  onChange({
                    shadow: {
                      color: e.target.value,
                      blur: (layer as any).shadow?.blur ?? 8,
                      offsetX: (layer as any).shadow?.offsetX ?? 0,
                      offsetY: (layer as any).shadow?.offsetY ?? 4,
                    },
                  } as any)
                }
              />
            </div>
          </div>
        </>
      )}

      {layer.type === "shape" && (
        <>
          <div>
            <Label className="text-xs">CTA text</Label>
            <Input
              value={(layer as any).text ?? ""}
              onChange={(e) => onChange({ text: e.target.value } as any)}
            />
          </div>
          <div>
            <Label className="text-xs">Fill</Label>
            <Input
              type="color"
              value={(layer as any).fill ?? "#2563eb"}
              onChange={(e) => onChange({ fill: e.target.value } as any)}
            />
          </div>
        </>
      )}

      {(layer.type === "image" || layer.type === "logo") && (
        <div>
          <Label className="text-xs">Object fit</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={(layer as { objectFit?: string }).objectFit ?? "cover"}
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
          <p className="text-[10px] text-muted-foreground mt-1">
            Asset identity stays on Brand Kit — crop/fit only.
          </p>
        </div>
      )}
    </div>
  );
}
