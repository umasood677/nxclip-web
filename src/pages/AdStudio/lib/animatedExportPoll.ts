/** Animated MP4 export job polling helpers (Phase 4C-B). */

export type AnimatedExportJobLike = {
  status: string;
  progressPercent?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export function isAnimatedExportTerminal(status: string): boolean {
  return TERMINAL.has(status);
}

export function shouldPollAnimatedExport(status: string): boolean {
  return status === "queued" || status === "processing";
}

export function formatAnimatedExportStatus(job: AnimatedExportJobLike): string {
  const base = `Status: ${job.status}`;
  if (
    (job.status === "processing" || job.status === "queued") &&
    typeof job.progressPercent === "number" &&
    Number.isFinite(job.progressPercent)
  ) {
    return `${base} · ${Math.round(job.progressPercent)}%`;
  }
  return base;
}

export function formatAnimatedExportFailure(job: AnimatedExportJobLike): string {
  const parts: string[] = [];
  if (job.errorCode) parts.push(job.errorCode);
  if (job.errorMessage) parts.push(job.errorMessage);
  return parts.join(" — ") || "Export failed";
}

export async function pollAnimatedExport<T extends AnimatedExportJobLike>(
  fetchJob: () => Promise<T>,
  signal: AbortSignal,
  onTick: (job: T) => void,
  opts?: { maxAttempts?: number; initialDelayMs?: number },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 120;
  let delay = opts?.initialDelayMs ?? 600;
  for (let i = 0; i < maxAttempts; i++) {
    if (signal.aborted) throw new Error("Export cancelled");
    const job = await fetchJob();
    onTick(job);
    if (isAnimatedExportTerminal(job.status)) return job;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(2500, Math.round(delay * 1.25));
  }
  throw new Error("Export timed out — check export history and retry download.");
}
