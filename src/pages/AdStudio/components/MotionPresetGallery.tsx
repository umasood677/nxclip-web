import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { adStudioApi } from "../../../services/apiClient";
import type { AdMotionPresetSummary, AdMotionSceneGraph } from "../lib/motionTypes";

type Props = {
  graph: AdMotionSceneGraph;
  busy?: boolean;
  reduceMotion?: boolean;
  onApplyPreset: (presetId: string) => Promise<void>;
  onRemoveAllLocal: () => void;
  className?: string;
};

/**
 * Preset gallery — apply goes through the editor so dirty local edits are
 * flushed before the Phase 4A apply-preset API mutates the server graph.
 */
export function MotionPresetGallery({
  graph,
  busy = false,
  reduceMotion = false,
  onApplyPreset,
  onRemoveAllLocal,
  className,
}: Props) {
  const [presets, setPresets] = useState<AdMotionPresetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await adStudioApi.listMotionPresets();
        setPresets((res.items ?? []) as AdMotionPresetSummary[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load motion presets");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const apply = async (presetId: string) => {
    const hasAnim = graph.layers.some((l) =>
      (l.animations ?? []).some((a) => a.keyframes.length),
    );
    if (hasAnim) {
      const ok = window.confirm(
        "Replace existing animation with this preset? Unsaved local edits will be saved first, then the preset is applied on the server.",
      );
      if (!ok) return;
    }
    setBusyId(presetId);
    try {
      await onApplyPreset(presetId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preset apply failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Motion presets
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Phase 4A presets — apply creates editable keyframes after a save flush.
          </p>
        </div>
        {graph.presetId ? (
          <Badge variant="secondary" className="text-[10px] max-w-[9rem] truncate" title={graph.presetId}>
            {graph.presetId}
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 size={14} className="animate-spin" /> Loading presets…
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {presets.map((p) => {
            const active = graph.presetId === p.id;
            const isBusy = busyId === p.id || busy;
            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border p-3 space-y-2 transition-colors",
                  active ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "shrink-0 h-9 w-9 rounded-lg border border-border bg-gradient-to-br from-primary/40 to-transparent",
                      !reduceMotion && "animate-pulse",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={!!busyId || busy}
                  onClick={() => void apply(p.id)}
                >
                  {isBusy && busyId === p.id ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : (
                    <Sparkles size={12} className="mr-1" />
                  )}
                  {active ? "Re-apply" : "Apply"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs text-destructive"
        disabled={busy}
        onClick={onRemoveAllLocal}
      >
        <Trash2 size={12} className="mr-1" /> Remove all animation
      </Button>
    </div>
  );
}
