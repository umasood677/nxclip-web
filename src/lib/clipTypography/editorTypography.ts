import { CANONICAL_TYPOGRAPHY_ENABLED, validateTypographyLayout, type CanonicalTypographyLayout } from './layoutContract';

/** Disabled projects preserve opaque metadata and continue using legacy overlays. */
export function editorTypography(raw: unknown, enabled: boolean = CANONICAL_TYPOGRAPHY_ENABLED): {
  active: boolean; plan?: CanonicalTypographyLayout; invalid: boolean;
} {
  if (!enabled || raw == null) return { active: false, invalid: false };
  try { return { active: true, plan: validateTypographyLayout(raw), invalid: false }; }
  catch { return { active: true, invalid: true }; }
}

export function typographyExtras(raw: unknown): { canonicalTypography?: unknown } {
  return raw === undefined ? {} : { canonicalTypography: raw };
}
