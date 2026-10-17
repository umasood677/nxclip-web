import React from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  EASING_OPTIONS,
  EDITOR_PROPERTIES,
  PROPERTY_LABELS,
  hasAnyAnimation,
  relativeToAbsolute,
  resolveKeyframe,
  type EditorPropertyId,
  type KeyframeSelection,
} from "../lib/motionKeyframeOps";
import type {
  AdAnimatableProperty,
  AdMotionEasing,
  AdMotionLayer,
  AdMotionSceneGraph,
} from "../lib/motionTypes";

type Props = {
  graph: AdMotionSceneGraph;
  layer: AdMotionLayer | null;
  selection: KeyframeSelection | null;
  playheadMs: number;
  onAddKeyframe: (prop: EditorPropertyId) => void;
  onDeleteKeyframe: () => void;
  onDuplicateKeyframe: () => void;
  onChangeValue: (value: number) => void;
  onChangeTime: (relativeMs: number) => void;
  onChangeEasing: (easing: AdMotionEasing) => void;
  onClearLayerAnimation: () => void;
  className?: string;
};

export function MotionInspector({
  graph,
  layer,
  selection,
  playheadMs,
  onAddKeyframe,
  onDeleteKeyframe,
  onDuplicateKeyframe,
  onChangeValue,
  onChangeTime,
  onChangeEasing,
  onClearLayerAnimation,
  className,
}: Props) {
  const resolved = resolveKeyframe(graph, selection);
  const animating = layer ? hasAnyAnimation(layer) : false;

  return (
    <div className={cn("space-y-4 text-sm", className)}>
      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layer
        </h3>
        {layer ? (
          <div className="space-y-1">
            <div className="font-medium truncate">{layer.name || layer.type}</div>
            <div className="text-xs text-muted-foreground capitalize">{layer.type}</div>
            <div className="text-xs text-muted-foreground">
              Animation: {animating ? "Has keyframes" : "None"}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Select a layer track to edit animation.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Transform
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Position X" value={layer?.x} />
          <Field label="Position Y" value={layer?.y} />
          <Field label="Rotation" value={layer?.rotation ?? 0} suffix="°" />
          <Field label="Opacity" value={layer?.opacity ?? 1} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {EDITOR_PROPERTIES.map((prop) => (
            <Button
              key={prop}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={!layer}
              onClick={() => onAddKeyframe(prop)}
              title={`Add ${PROPERTY_LABELS[prop]} keyframe at playhead`}
            >
              <Plus size={12} className="mr-1" />
              {PROPERTY_LABELS[prop]}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Keyframe
        </h3>
        {resolved ? (
          <div className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="text-[11px] text-muted-foreground">
              {labelForCanonical(selection!.property)} · relative{" "}
              {resolved.keyframe.timeMs}ms · abs{" "}
              {Math.round(relativeToAbsolute(resolved.keyframe.timeMs, resolved.layer))}ms
            </div>
            <label className="flex flex-col gap-1 text-xs">
              Time (ms from layer start)
              <input
                type="number"
                className="h-8 rounded-md border border-input bg-background px-2"
                value={resolved.keyframe.timeMs}
                min={0}
                max={Math.max(0, resolved.layer.endMs - resolved.layer.startMs)}
                onChange={(e) => onChangeTime(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Value
              <input
                type="number"
                step={selection?.property === "opacity" ? 0.01 : 1}
                className="h-8 rounded-md border border-input bg-background px-2"
                value={resolved.keyframe.value}
                onChange={(e) => onChangeValue(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Easing
              <select
                className="h-8 rounded-md border border-input bg-background px-2"
                value={resolved.animation.easing ?? "easeOut"}
                onChange={(e) => onChangeEasing(e.target.value as AdMotionEasing)}
              >
                {EASING_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-7" onClick={onDuplicateKeyframe}>
                <Copy size={12} className="mr-1" /> Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-destructive"
                onClick={onDeleteKeyframe}
              >
                <Trash2 size={12} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select a diamond on the timeline, or add a keyframe at the playhead (
            {Math.round(playheadMs)}ms).
          </p>
        )}
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timing
        </h3>
        {layer ? (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Start {(layer.startMs / 1000).toFixed(2)}s</div>
            <div>End {(layer.endMs / 1000).toFixed(2)}s</div>
            <div>Span {((layer.endMs - layer.startMs) / 1000).toFixed(2)}s</div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
        {layer && animating ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            onClick={onClearLayerAnimation}
          >
            Remove layer animation
          </Button>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  suffix,
}: {
  label: string;
  value?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-md border border-border/70 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono tabular-nums">
        {value == null || !Number.isFinite(value) ? "—" : `${value}${suffix ?? ""}`}
      </div>
    </div>
  );
}

function labelForCanonical(property: AdAnimatableProperty): string {
  if (property === "scaleX" || property === "scaleY") return PROPERTY_LABELS.scale;
  if (property === "x") return PROPERTY_LABELS.x;
  if (property === "y") return PROPERTY_LABELS.y;
  if (property === "rotation") return PROPERTY_LABELS.rotation;
  if (property === "opacity") return PROPERTY_LABELS.opacity;
  return property;
}
