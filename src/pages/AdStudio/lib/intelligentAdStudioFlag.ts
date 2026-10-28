/**
 * Local Intelligent Ad Studio panel gate (Creative Director / DNA / Smart Canvas / Campaign Adapt).
 * Default OFF. When ON, UI is labeled LOCAL SYNTHETIC ONLY — not production AI.
 *
 * Env: VITE_INTELLIGENT_AD_STUDIO
 */

const ENABLED_VALUES = new Set(["true", "1", "yes", "on"]);

export function parseIntelligentAdStudioFlag(
  raw: string | undefined | null,
): boolean {
  if (raw == null) return false;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return false;
  return ENABLED_VALUES.has(normalized);
}

export function isIntelligentAdStudioEnabled(
  env: Record<string, unknown> | undefined = typeof import.meta !== "undefined"
    ? (import.meta.env as Record<string, unknown>)
    : undefined,
): boolean {
  const raw = env?.VITE_INTELLIGENT_AD_STUDIO;
  if (
    typeof raw !== "string" &&
    typeof raw !== "number" &&
    typeof raw !== "boolean"
  ) {
    return false;
  }
  if (typeof raw === "boolean") return raw === true;
  return parseIntelligentAdStudioFlag(String(raw));
}

export const INTELLIGENT_AD_STUDIO_ENV_KEY = "VITE_INTELLIGENT_AD_STUDIO" as const;
