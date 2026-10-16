import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { adStudioApi } from "../../../services/apiClient";

type VersionItem = {
  id: string;
  version: number;
  changeSummary?: string | null;
  createdAt: string;
};

type Props = {
  creativeId: string;
  currentVersion: number;
  dirty: boolean;
  onRestored: () => Promise<void> | void;
};

/** Lightweight history/reopen using existing listVersions + restore APIs. */
export function VersionHistoryPanel({
  creativeId,
  currentVersion,
  dirty,
  onRestored,
}: Props) {
  const [items, setItems] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adStudioApi.listCreativeVersions(creativeId);
      const sorted = [...(res.items ?? [])].sort(
        (a, b) => b.version - a.version,
      );
      setItems(sorted.slice(0, 12));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load versions");
    } finally {
      setLoading(false);
    }
  }, [creativeId]);

  useEffect(() => {
    void refresh();
  }, [refresh, currentVersion]);

  const restore = async (version: number) => {
    if (dirty) {
      const ok = window.confirm(
        "You have unsaved edits. Restoring will replace the canvas with a prior version (creates a new version). Continue?",
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `Restore version ${version}? This creates a new version from that snapshot.`,
      );
      if (!ok) return;
    }
    setBusyVersion(version);
    try {
      await adStudioApi.restoreCreativeVersion(creativeId, version);
      toast.success(`Restored from v${version}`);
      await onRestored();
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
          <History size={14} aria-hidden /> Version history
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
        Uses existing save versions. Restore creates a new version — does not rewrite history.
      </p>
      {loading && !items.length ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </p>
      ) : null}
      {!loading && !items.length ? (
        <p className="text-xs text-muted-foreground">No versions recorded yet.</p>
      ) : null}
      <ul className="space-y-1.5" aria-label="Creative versions">
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
              <div className="text-[10px] text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
            {v.version !== currentVersion ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-[11px]"
                disabled={busyVersion !== null}
                onClick={() => void restore(v.version)}
              >
                {busyVersion === v.version ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <RotateCcw size={12} className="mr-1" /> Open
                  </>
                )}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
