/**
 * Animated Ad Studio feature gate (Phase 4B-R1.5).
 *
 * Env: VITE_AD_STUDIO_ANIMATED
 * Default: OFF when missing or unrecognized.
 * Enabled only for explicit truthy tokens (case-insensitive): "true" | "1" | "yes" | "on"
 */

const ENABLED_VALUES = new Set(["true", "1", "yes", "on"]);

/**
 * Parse a raw env string. Missing / empty / arbitrary strings → false.
 */
export function parseAdStudioAnimatedFlag(raw: string | undefined | null): boolean {
  if (raw == null) return false;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return false;
  return ENABLED_VALUES.has(normalized);
}

/**
 * Runtime gate for Vite builds. Safe when `import.meta.env` is mocked in tests.
 */
export function isAdStudioAnimatedEnabled(
  env: Record<string, unknown> | undefined = typeof import.meta !== "undefined"
    ? (import.meta.env as Record<string, unknown>)
    : undefined,
): boolean {
  const raw = env?.VITE_AD_STUDIO_ANIMATED;
  if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "boolean") {
    return false;
  }
  if (typeof raw === "boolean") return raw === true;
  return parseAdStudioAnimatedFlag(String(raw));
}

export const AD_STUDIO_ANIMATED_ENV_KEY = "VITE_AD_STUDIO_ANIMATED" as const;
