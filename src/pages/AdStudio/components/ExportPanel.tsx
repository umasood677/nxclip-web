import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { adStudioApi } from "../../../services/apiClient";
import { buildGatewayProxyUrl } from "../../../lib/authenticatedMediaUrl";
import { getAccessToken } from "../../../services/auth/authService";
import { collectExportWarnings } from "../lib/exportWarnings";
import type { AdSceneGraph } from "../types";
import { AD_FORMATS } from "../types";

interface ExportPanelProps {
  creativeId: string;
  graph: AdSceneGraph | null;
  dirty?: boolean;
  saving?: boolean;
  ensureSaved?: () => Promise<boolean>;
}

async function downloadJob(jobId: string, fileName: string) {
  const path = `/ad-studio/render-jobs/${jobId}/download`;
  const url = buildGatewayProxyUrl(path);
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Session expired or access denied. Sign in again and retry.");
    }
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function pollJob(
  jobId: string,
  signal: AbortSignal,
  onTick: (job: { status: string; errorMessage?: string }) => void,
): Promise<any> {
  let delay = 600;
  for (let i = 0; i < 40; i++) {
    if (signal.aborted) throw new Error("Export cancelled");
    const job = await adStudioApi.getRenderJob(jobId);
    onTick(job);
    if (job.status === "completed" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(2500, Math.round(delay * 1.25));
  }
  throw new Error("Export timed out — check export history and retry download.");
}

function readCreativeVersion(job: {
  metadata?: Record<string, unknown> | null;
}): number | null {
  const raw = job.metadata?.creativeVersion;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function ExportPanel({
  creativeId,
  graph,
  dirty = false,
  saving = false,
  ensureSaved,
}: ExportPanelProps) {
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [quality, setQuality] = useState(90);
  const [allowPlaceholders, setAllowPlaceholders] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [lastJob, setLastJob] = useState<any | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const warnings = useMemo(
    () => collectExportWarnings(graph, { allowPlaceholders }),
    [graph, allowPlaceholders],
  );
  const blocked = warnings.some((w) => w.blocking);
  const hasPlaceholderRisk = warnings.some(
    (w) => w.code === "missing_logo" || w.code === "missing_assets",
  );

  const dims = graph?.canvas;
  const formatLabel = useMemo(() => {
    if (!dims) return "—";
    const hit = AD_FORMATS.find(
      (f) => f.width === dims.width && f.height === dims.height,
    );
    return hit
      ? `${hit.label} · ${dims.width}×${dims.height}`
      : `${dims.width}×${dims.height}`;
  }, [dims]);

  const refresh = async () => {
    try {
      const listed = await adStudioApi.listExports(creativeId);
      setExports(listed.items ?? []);
    } catch {
      /* ignore empty history */
    }
  };

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [creativeId]);

  const runExport = async () => {
    if (blocked) {
      toast.error(warnings.find((w) => w.blocking)?.message || "Cannot export");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setLastJob(null);
    setStatusText("Starting render…");
    try {
      if (ensureSaved) {
        setStatusText("Saving…");
        const saved = await ensureSaved();
        if (!saved) {
          setStatusText(null);
          return;
        }
        setStatusText("Starting render…");
      }

      let job = await adStudioApi.exportCreative(creativeId, {
        exportFormat: format,
        quality: format === "jpeg" ? quality : undefined,
      });
      setLastJob(job);
      if (job.status === "queued" || job.status === "running" || job.status === "pending") {
        setStatusText(`Status: ${job.status}`);
        job = await pollJob(job.id, ac.signal, (tick) => {
          setStatusText(`Status: ${tick.status}`);
          setLastJob(tick);
        });
      }
      setLastJob(job);
      if (job.status === "failed") {
        toast.error(job.errorMessage || "Export failed", {
          description: "Fix unsupported layers (e.g. GROUP) or retry.",
        });
        setStatusText("Failed");
      } else if (job.status === "completed") {
        const exportedVersion = readCreativeVersion(job);
        toast.success(`${format.toUpperCase()} ready`);
        setStatusText(
          exportedVersion != null
            ? `Completed · creative v${exportedVersion}`
            : "Completed",
        );
        await downloadJob(
          job.id,
          `ad-export.${format === "jpeg" ? "jpg" : "png"}`,
        );
      } else {
        toast.message("Export queued", { description: job.status });
        setStatusText(job.status);
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

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">Export</div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Output: {formatLabel}. Preview is approximate — not claimed as exact parity.
        </p>
      </div>

      <ul className="space-y-1" aria-label="Export preflight warnings">
        {warnings.map((w) => (
          <li
            key={w.code}
            className={`text-[11px] leading-snug ${
              w.blocking ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {w.blocking ? "Blocked: " : "Note: "}
            {w.message}
          </li>
        ))}
      </ul>

      {dirty && !busy ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-500">
          Save required — export will save your latest edits first.
        </p>
      ) : null}

      {hasPlaceholderRisk ? (
        <label className="flex items-start gap-2 text-[11px] leading-snug">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={allowPlaceholders}
            onChange={(e) => setAllowPlaceholders(e.target.checked)}
          />
          <span>
            Allow export with missing image/logo placeholders (server draws slate
            rectangles — not product/brand assets).
          </span>
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Format</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Dimensions</Label>
          <div className="h-9 flex items-center text-xs text-muted-foreground px-1">
            {dims ? `${dims.width}×${dims.height}` : "—"}
          </div>
        </div>
      </div>

      {format === "jpeg" ? (
        <div>
          <Label className="text-xs">JPEG quality ({quality})</Label>
          <input
            type="range"
            min={60}
            max={100}
            step={1}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full mt-1"
          />
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={busy || blocked || saving}
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
            : "Rendering…"
          : "Render & download"}
      </Button>

      {statusText ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusText}
          {lastJob?.id ? ` · job ${String(lastJob.id).slice(0, 8)}…` : ""}
        </p>
      ) : null}

      {lastJob?.errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {lastJob.errorMessage}
        </p>
      )}

      {!!exports.length && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Export history</div>
          {exports.slice(0, 6).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-2 text-xs rounded-md border border-border px-2 py-1.5"
            >
              <div className="min-w-0">
                <Badge variant="outline" className="mr-1">
                  {job.exportFormat}
                </Badge>
                <span className="text-muted-foreground">{job.status}</span>
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
                    void downloadJob(
                      job.id,
                      `ad-export.${job.exportFormat === "jpeg" ? "jpg" : "png"}`,
                    ).catch((e) =>
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
                  title={job.errorMessage}
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
