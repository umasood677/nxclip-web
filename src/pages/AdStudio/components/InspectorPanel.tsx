import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { AD_STUDIO_FONTS } from "../lib/adFonts";
import type { AdSceneLayer } from "../types";

interface InspectorPanelProps {
  layer: AdSceneLayer | null;
  onChange: (patch: Partial<AdSceneLayer>) => void;
}

export function InspectorPanel({ layer, onChange }: InspectorPanelProps) {
  if (!layer) {
    return (
      <p className="text-sm text-muted-foreground p-2">
        Select a layer to edit typography, color, and transform.
      </p>
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
    </div>
  );
}
