import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { adStudioApi } from "../../../services/apiClient";
import { buildGatewayProxyUrl } from "../../../lib/authenticatedMediaUrl";
import { getAccessToken } from "../../../services/auth/authService";

interface ExportPanelProps {
  creativeId: string;
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
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
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

export function ExportPanel({ creativeId }: ExportPanelProps) {
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [busy, setBusy] = useState(false);
  const [exports, setExports] = useState<any[]>([]);
  const [lastJob, setLastJob] = useState<any | null>(null);

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
  }, [creativeId]);

  const runExport = async () => {
    setBusy(true);
    setLastJob(null);
    try {
      const job = await adStudioApi.exportCreative(creativeId, {
        exportFormat: format,
        quality: format === "jpeg" ? 90 : undefined,
      });
      setLastJob(job);
      if (job.status === "failed") {
        toast.error(job.errorMessage || "Export failed", {
          description: "Fix unsupported layers (e.g. GROUP) or retry.",
        });
      } else if (job.status === "completed") {
        toast.success(`${format.toUpperCase()} ready`);
        await downloadJob(
          job.id,
          `ad-export.${format === "jpeg" ? "jpg" : "png"}`,
        );
      } else {
        toast.message("Export queued", { description: job.status });
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-border pt-3 mt-3">
      <div className="text-sm font-medium">Export</div>
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
      <Button type="button" size="sm" className="w-full" disabled={busy} onClick={() => void runExport()}>
        {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
        Render & download
      </Button>
      {lastJob?.errorMessage && (
        <p className="text-xs text-destructive">{lastJob.errorMessage}</p>
      )}
      {!!exports.length && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Export history</div>
          {exports.slice(0, 6).map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-2 text-xs rounded-md border border-border px-2 py-1.5">
              <div className="min-w-0">
                <Badge variant="outline" className="mr-1">{job.exportFormat}</Badge>
                <span className="text-muted-foreground">{job.status}</span>
                {job.width && job.height ? (
                  <span className="text-muted-foreground"> · {job.width}×{job.height}</span>
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
                    ).catch((e) => toast.error(e instanceof Error ? e.message : "Download failed"))
                  }
                >
                  Download
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
