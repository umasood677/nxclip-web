import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { adStudioApi } from "../../../services/apiClient";
import { isAdStudioAnimatedEnabled } from "../lib/adStudioAnimatedFlag";
import {
  formatAnimatedExportFailure,
  formatAnimatedExportStatus,
  pollAnimatedExport,
  shouldPollAnimatedExport,
} from "../lib/animatedExportPoll";

type ExportQuality = "draft" | "standard" | "high";

interface AnimatedExportPanelProps {
  animatedId: string;
  motionVersion: number;
  dirty?: boolean;
  saving?: boolean;
  ensureSaved?: () => Promise<boolean>;
}

export function AnimatedExportPanel({
  animatedId,
  motionVersion,
  dirty = false,
  saving = false,
  ensureSaved,
}: AnimatedExportPanelProps) {
  const animatedEnabled = isAdStudioAnimatedEnabled();
  const [quality, setQuality] = useState<ExportQuality>("standard");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [lastJob, setLastJob] = useState<any | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dimsLabel = useMemo(() => {
    const job = lastJob ?? exports[0];
    if (job?.width && job?.height) return `${job.width}×${job.height}`;
    return "—";
  }, [exports, lastJob]);

  const refresh = async () => {
    try {
      const listed = await adStudioApi.listAnimatedExports(animatedId);
      setExports(listed.items ?? []);
    } catch {
      /* ignore empty history */
    }
  };

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [animatedId]);

  const runExport = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setLastJob(null);
    setStatusText("Starting export…");
    try {
      if (ensureSaved) {
        setStatusText("Saving…");
        const saved = await ensureSaved();
        if (!saved) {
          setStatusText(null);
          return;
        }
        setStatusText("Starting export…");
      }

      let job = await adStudioApi.createAnimatedExport(animatedId, {
        quality,
        motionVersion,
        idempotencyKey: crypto.randomUUID(),
      });
      setLastJob(job);
      if (shouldPollAnimatedExport(job.status)) {
        setStatusText(formatAnimatedExportStatus(job));
        job = await pollAnimatedExport(
          () => adStudioApi.getAnimatedExport(animatedId, job.id),
          ac.signal,
          (tick) => {
            setStatusText(formatAnimatedExportStatus(tick));
            setLastJob(tick);
          },
        );
      }
      setLastJob(job);
      if (job.status === "failed") {
        toast.error(formatAnimatedExportFailure(job));
        setStatusText("Failed");
      } else if (job.status === "completed") {
        toast.success("MP4 ready");
        setStatusText(
          job.motionVersion != null
            ? `Completed · motion v${job.motionVersion}`
            : "Completed",
        );
        await adStudioApi.downloadAnimatedExport(job.id, "animated-ad.mp4");
      } else if (job.status === "cancelled") {
        toast.message("Export cancelled");
        setStatusText("Cancelled");
      } else {
        toast.message("Export queued", { description: job.status });
        setStatusText(formatAnimatedExportStatus(job));
      }
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      if (msg !== "Export cancelled") toast.error(msg);
      setStatusText(null);
    } finally {
      setBusy(false);
    }
  };

  const failureDetail =
    lastJob?.status === "failed" ? formatAnimatedExportFailure(lastJob) : null;

  if (!animatedEnabled) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">Export video</div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Renders an MP4 on the server from your saved motion graph. Preview timing is
          approximate — export uses the worker pipeline.
        </p>
      </div>

      {dirty && !busy ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-500">
          Save required — export will save your latest motion edits first.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Quality</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={quality}
            disabled={busy}
            onChange={(e) => setQuality(e.target.value as ExportQuality)}
          >
            <option value="draft">Draft (720p cap)</option>
            <option value="standard">Standard (1080p)</option>
            <option value="high">High (1080p)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Output size</Label>
          <div className="h-9 flex items-center text-xs text-muted-foreground px-1">
            {dimsLabel}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={busy || saving}
        onClick={() => void runExport()}
      >
        {busy ? (
          <Loader2 size={14} className="mr-1 animate-spin" />
        ) : (
          <Download size={14} className="mr-1" />
        )}
        {busy
          ? statusText === "Saving…"
            ? "Saving…"
            : "Exporting…"
          : "Export MP4"}
      </Button>

      {statusText ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusText}
          {lastJob?.id ? ` · job ${String(lastJob.id).slice(0, 8)}…` : ""}
        </p>
      ) : null}

      {failureDetail ? (
        <div className="space-y-2" role="alert">
          <p className="text-xs text-destructive">{failureDetail}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={busy || saving}
            onClick={() => void runExport()}
          >
            <RotateCcw size={14} className="mr-1" /> Retry export
          </Button>
        </div>
      ) : null}

      {!!exports.length && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Recent exports</div>
          {exports.slice(0, 6).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-2 text-xs rounded-md border border-border px-2 py-1.5"
            >
              <div className="min-w-0">
                <Badge variant="outline" className="mr-1">
                  mp4
                </Badge>
                <span className="text-muted-foreground">{job.status}</span>
                {typeof job.progressPercent === "number" &&
                (job.status === "processing" || job.status === "queued") ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {Math.round(job.progressPercent)}%
                  </span>
                ) : null}
                {job.width && job.height ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {job.width}×{job.height}
                  </span>
                ) : null}
              </div>
              {job.status === "completed" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() =>
                    void adStudioApi
                      .downloadAnimatedExport(job.id, "animated-ad.mp4")
                      .catch((e) =>
                      toast.error(e instanceof Error ? e.message : "Download failed"),
                    )
                  }
                >
                  Download
                </Button>
              )}
              {job.status === "failed" && (
                <span
                  className="text-destructive truncate max-w-[8rem]"
                  title={formatAnimatedExportFailure(job)}
                >
                  Failed
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
