export async function waitForClipTranscript(
  fetchItem: () => Promise<{ clipEditSpec?: { transcript?: string } | null }>,
  opts?: {
    attempts?: number;
    delayMs?: number;
    isCancelled?: () => boolean;
    onTick?: (attempt: number, attempts: number) => void;
  },
): Promise<string | null> {
  const attempts = opts?.attempts ?? 12;
  const delayMs = opts?.delayMs ?? 2000;
  for (let i = 0; i < attempts; i++) {
    if (opts?.isCancelled?.()) return null;
    opts?.onTick?.(i, attempts);
    if (i > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (opts?.isCancelled?.()) return null;
    try {
      const item = await fetchItem();
      if (typeof item.clipEditSpec?.transcript === "string") {
        return item.clipEditSpec.transcript;
      }
    } catch {
      /* keep polling */
    }
  }
  return null;
}

export async function waitAtLeast(startedAt: number, minMs: number): Promise<void> {
  const left = minMs - (Date.now() - startedAt);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}
