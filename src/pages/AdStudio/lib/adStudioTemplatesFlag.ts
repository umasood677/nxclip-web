/**
 * Still Ad Studio templates V1 feature gate (UX-2A.2 M3).
 *
 * Env: VITE_AD_STUDIO_TEMPLATES_V1
 * Default: OFF when missing or unrecognized.
 * Production must remain OFF until M4+ approval.
 */

const ENABLED_VALUES = new Set(["true", "1", "yes", "on"]);

export function parseAdStudioTemplatesV1Flag(
  raw: string | undefined | null,
): boolean {
  if (raw == null) return false;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return false;
  return ENABLED_VALUES.has(normalized);
}

/**
 * Runtime gate for Vite builds. Safe when `import.meta.env` is mocked in tests.
 */
export function isAdStudioTemplatesV1Enabled(
  env: Record<string, unknown> | undefined = typeof import.meta !== "undefined"
    ? (import.meta.env as Record<string, unknown>)
    : undefined,
): boolean {
  const raw = env?.VITE_AD_STUDIO_TEMPLATES_V1;
  if (
    typeof raw !== "string" &&
    typeof raw !== "number" &&
    typeof raw !== "boolean"
  ) {
    return false;
  }
  if (typeof raw === "boolean") return raw === true;
  return parseAdStudioTemplatesV1Flag(String(raw));
}

export const AD_STUDIO_TEMPLATES_V1_ENV_KEY =
  "VITE_AD_STUDIO_TEMPLATES_V1" as const;
