import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { adStudioApi } from "../../../services/apiClient";

type VersionItem = {
  id: string;
  version: number;
  changeSummary?: string | null;
  createdAt: string;
};

type Props = {
  animatedId: string;
  currentVersion: number;
  dirty: boolean;
  saving: boolean;
  onRestore: (version: number) => Promise<void>;
};

export function MotionVersionHistoryPanel({
  animatedId,
  currentVersion,
  dirty,
  saving,
  onRestore,
}: Props) {
  const [items, setItems] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adStudioApi.listAnimatedVersions(animatedId);
      const sorted = [...(res.items ?? [])].sort((a, b) => b.version - a.version);
      setItems(sorted.slice(0, 16));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load motion versions");
    } finally {
      setLoading(false);
    }
  }, [animatedId]);

  useEffect(() => {
    void refresh();
  }, [refresh, currentVersion]);

  const restore = async (version: number) => {
    if (saving) {
      toast.message("Wait for the current save to finish before restoring.");
      return;
    }
    const ok = window.confirm(
      dirty
        ? `You have unsaved edits. Restore version ${version}? This creates a new version and replaces the canvas.`
        : `Restore version ${version}? This creates a new version from that snapshot.`,
    );
    if (!ok) return;
    setBusyVersion(version);
    try {
      await onRestore(version);
      toast.success(`Restored from motion v${version}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusyVersion(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-1.5">
          <History size={14} aria-hidden /> Motion history
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Phase 4A version API. Restore appends a new version — history is not rewritten.
      </p>
      {loading && !items.length ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </p>
      ) : null}
      {!loading && !items.length ? (
        <p className="text-xs text-muted-foreground">No motion versions yet — edit and autosave to create one.</p>
      ) : null}
      <ul className="space-y-1.5" aria-label="Motion versions">
        {items.map((v) => (
          <li
            key={v.id}
            className="flex items-start justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">v{v.version}</Badge>
                {v.version === currentVersion ? (
                  <span className="text-muted-foreground">current</span>
                ) : null}
              </div>
              <div className="text-muted-foreground truncate mt-0.5">
                {v.changeSummary || "Saved"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 shrink-0"
              disabled={busyVersion !== null || v.version === currentVersion}
              onClick={() => void restore(v.version)}
            >
              {busyVersion === v.version ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <RotateCcw size={12} className="mr-1" /> Restore
                </>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
