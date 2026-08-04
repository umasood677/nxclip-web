/** Shared aspect-ratio helpers for content tiles. */

/**
 * Bounds on the ratio a tile may claim. A single extreme item would otherwise
 * force its whole row to a height that suits nothing else in it.
 */
const MIN_TILE_RATIO = 0.4;
const MAX_TILE_RATIO = 3;

/** Keeps a ratio inside the range the row solver can lay out sensibly. */
export function clampTileRatio(ratio: number): number {
  return Math.min(MAX_TILE_RATIO, Math.max(MIN_TILE_RATIO, ratio));
}

/** Lowercased, whitespace-free, colon-separated form of an API ratio token. */
export function normalizeAspectToken(ratio?: string | null): string {
  return (ratio || "").trim().toLowerCase().replace(/\s+/g, "").replace("/", ":");
}

/**
 * Numeric width/height for a ratio token such as "16:9".
 *
 * Null when the ratio is missing or unparseable, which lets a tile letterbox
 * instead of cropping media whose true shape we do not know. Clamped because a
 * wildly extreme ratio would blow up the row solver.
 */
export function parseAspectRatio(ratio?: string | null): number | null {
  const match = normalizeAspectToken(ratio).match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return clampTileRatio(width / height);
}

/** CSS `aspect-ratio` value for a ratio token, falling back to a square. */
export function cssAspectRatio(ratio?: string | null): string {
  const parsed = parseAspectRatio(ratio);
  if (!parsed) return "1 / 1";
  return normalizeAspectToken(ratio).replace(":", " / ");
}
