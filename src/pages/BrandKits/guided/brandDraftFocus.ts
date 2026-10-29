import type { BrandKitSummary } from "../lib/brandKitTypes";
export type BrandDraftFocus = { key: string; label: string };
export const brandDraftFieldKey = (scope: string, key: string) =>
  `${scope}:${key.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
export function brochureFieldKey(section: string, label: string) {
  const clean = label.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const aliases: Record<string, string> = {
    preferredlanguage: "doSay",
    avoid: "dontSay",
    audience: "targetAudience",
  };
  if (section === "Brand voice")
    return brandDraftFieldKey("voice", aliases[clean] || clean);
  if (section === "Creative guidelines")
    return brandDraftFieldKey(
      "creative",
      clean === "usagerules" ? "freeformGuidelines" : clean,
    );
  return brandDraftFieldKey("brand", clean);
}
/** Focus is UI state only. Empty fields remain visible while being edited, without changing the kit. */
export function brochurePreviewRows(
  section: string,
  rows: [string, string][],
  focus?: BrandDraftFocus | null,
) {
  const result = rows.map(([label, value]) => ({
    key: brochureFieldKey(section, label),
    label,
    value,
  }));
  const scope =
    section === "Brand voice"
      ? "voice:"
      : section === "Creative guidelines"
        ? "creative:"
        : "brand:";
  if (focus?.key.startsWith(scope) && !result.some((r) => r.key === focus.key))
    result.push({ key: focus.key, label: focus.label, value: "Not set yet" });
  return result;
}

export function focusedBrandDraftValue(
  kit: BrandKitSummary,
  focus: BrandDraftFocus,
) {
  const [scope, key] = focus.key.split(":");
  const matches = (k: string) => brandDraftFieldKey(scope, k) === focus.key;
  if (scope === "palette")
    return kit.colors?.find((c) => matches(c.role || ""))?.hex || "Not set yet";
  if (scope === "typography") {
    const t = kit.typography?.find((t) => matches(t.role || ""));
    return t ? [t.family, t.weight].filter(Boolean).join(" · ") : "Not set yet";
  }
  if (scope === "creative" && key === "freeformguidelines")
    return kit.guidelines || "Not set yet";
  const record =
    scope === "voice"
      ? kit.voice
      : scope === "creative"
        ? kit.voice?.creative
        : kit;
  const value = Object.entries(record || {}).find(([k]) => matches(k))?.[1];
  return (
    (Array.isArray(value)
      ? value.join("; ")
      : typeof value === "string"
        ? value
        : "") || "Not set yet"
  );
}
