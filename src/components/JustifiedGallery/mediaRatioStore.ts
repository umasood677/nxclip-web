import { useSyncExternalStore } from "react";
import { clampTileRatio } from "./aspectRatio";

/**
 * Aspect ratios learned from images as they load.
 *
 * Not every item carries a ratio: uploaded references, in particular, are stored
 * without one, and a gallery that assumes a square for them letterboxes tall
 * media inside a square slot. Once the browser has the image it knows the true
 * shape, so tiles report it here and the gallery re-lays out with the real ratio.
 *
 * The cache lives at module scope so the ratio is only learned once per media,
 * no matter which gallery sees it first or how often the user navigates away.
 */
const ratios = new Map<string, number>();

/** Bounded so a long browsing session cannot grow the cache without limit. */
const MAX_ENTRIES = 4000;

/**
 * Ratios also survive a reload, so returning to a gallery lays it out correctly
 * on the first paint instead of showing squares until the images arrive. Keys
 * include the media revision, so an edited image is measured again.
 */
const STORAGE_KEY = "nxclip.mediaRatios.v1";

const listeners = new Set<() => void>();
let version = 0;
let saveHandle: number | undefined;

function readStorage(): void {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        ratios.set(key, value);
      }
    }
  } catch {
    // Private mode, quota, or corrupt payload: measuring again is harmless.
  }
}

function scheduleSave(): void {
  if (typeof window === "undefined" || saveHandle !== undefined) return;
  saveHandle = window.setTimeout(() => {
    saveHandle = undefined;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(ratios)));
    } catch {
      // Not worth surfacing: the in-memory cache still serves this session.
    }
  }, 1000);
}

if (typeof window !== "undefined") {
  readStorage();
}

/** Ratio previously measured for this media, if any. */
export function getMeasuredRatio(key: string | undefined): number | undefined {
  return key ? ratios.get(key) : undefined;
}

/**
 * Record the true ratio of a loaded image. Keys must identify the media itself
 * (content id plus media revision), never its position in a list, or a reordered
 * gallery would hand one item's ratio to another.
 */
export function reportMediaRatio(
  key: string | undefined,
  naturalWidth: number,
  naturalHeight: number,
): void {
  if (!key || !naturalWidth || !naturalHeight) return;

  const ratio = clampTileRatio(naturalWidth / naturalHeight);
  const previous = ratios.get(key);
  if (previous !== undefined && Math.abs(previous - ratio) < 0.005) return;

  if (previous === undefined && ratios.size >= MAX_ENTRIES) {
    const oldest = ratios.keys().next();
    if (!oldest.done) ratios.delete(oldest.value);
  }

  ratios.set(key, ratio);
  version += 1;
  scheduleSave();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getVersion(): number {
  return version;
}

/** Re-renders the caller whenever any media ratio is discovered. */
export function useMediaRatioVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
