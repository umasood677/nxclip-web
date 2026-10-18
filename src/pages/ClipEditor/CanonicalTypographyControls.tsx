import { CANONICAL_FACE_OPTIONS } from '../../lib/clipTypography/canonicalFaces';
import type { CanonicalAuthoringDraft } from '../../lib/clipTypography/canonicalAuthoring';
import { cn } from '../../lib/utils';

const FILL_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#000000', label: 'Black' },
  { hex: '#FFE566', label: 'Yellow' },
  { hex: '#FF4D4D', label: 'Red' },
  { hex: '#4DA3FF', label: 'Blue' },
  { hex: '#00FFAA', label: 'Mint' },
];
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

type Props = {
  draft: CanonicalAuthoringDraft;
  busy?: boolean;
  error?: string | null;
  onChange: (patch: Partial<CanonicalAuthoringDraft>) => void;
};

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="space-y-1 text-[10px] font-bold text-muted-foreground">
      <span className="ml-1">{label}</span>
      <input
        type="number"
        className="h-9 w-full rounded-lg border border-border/50 bg-muted/30 px-2 text-xs text-foreground"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function CanonicalTypographyControls({ draft, busy, error, onChange }: Props) {
  const faceItems = Object.fromEntries(CANONICAL_FACE_OPTIONS.map((f) => [f.id, f.label]));
  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-primary">
        Smart Typography (test)
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Canonical faces + layout engine. Stroke fill is black in v1. Weight/style come from the face.
      </p>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground ml-1">Canonical font</label>
        <Select
          value={draft.faceId}
          onValueChange={(v) => onChange({ faceId: v as CanonicalAuthoringDraft['faceId'] })}
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
      </div>

      <label className="space-y-1 text-[10px] font-bold text-muted-foreground block">
        <span className="ml-1">Caption text</span>
        <textarea
          className="min-h-[64px] w-full rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5 text-xs text-foreground"
          value={draft.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Caption text (use Enter for line breaks)"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Size" value={draft.fontSize} min={8} max={512} onChange={(fontSize) => onChange({ fontSize })} />
        <NumberField
          label="Line height ×"
          value={Number(draft.lineHeightRatio.toFixed(2))}
          min={1}
          max={3}
          step={0.05}
          onChange={(lineHeightRatio) => onChange({ lineHeightRatio })}
        />
        <NumberField label="Tracking" value={draft.letterSpacing} min={0} max={32} onChange={(letterSpacing) => onChange({ letterSpacing })} />
        <NumberField label="Stroke width" value={draft.outline} min={0} max={16} onChange={(outline) => onChange({ outline })} />
        <NumberField label="Shadow" value={draft.shadow} min={0} max={32} onChange={(shadow) => onChange({ shadow })} />
        <NumberField
          label="Safe inset"
          value={Number(draft.safeInset.toFixed(2))}
          min={0.05}
          max={0.2}
          step={0.01}
          onChange={(safeInset) => onChange({ safeInset })}
        />
        <NumberField
          label="Vertical pos"
          value={Number(draft.verticalAnchor.toFixed(2))}
          min={0}
          max={1}
          step={0.01}
          onChange={(verticalAnchor) => onChange({ verticalAnchor })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground ml-1">Align</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              className={cn(
                'h-8 flex-1 rounded-md border text-[10px] font-bold capitalize',
                draft.align === align ? 'border-primary bg-primary/15 text-primary' : 'border-border/50',
              )}
              onClick={() => onChange({ align })}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-muted-foreground ml-1">Fill color</label>
        <div className="flex flex-wrap gap-2 px-1">
          {FILL_COLORS.map((swatch) => {
            const selected = draft.fill.toUpperCase() === swatch.hex.toUpperCase();
            return (
              <button
                key={swatch.hex}
                type="button"
                title={swatch.label}
                aria-label={swatch.label}
                aria-pressed={selected}
                onClick={() => onChange({ fill: swatch.hex })}
                className={cn(
                  'h-7 w-7 rounded-full border-2 shadow-sm transition-transform',
                  selected ? 'border-primary scale-110' : 'border-border hover:scale-105',
                )}
                style={{ backgroundColor: swatch.hex }}
              />
            );
          })}
        </div>
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
