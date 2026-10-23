import { AD_STUDIO_FONTS } from "./adFonts";
import type { AdSceneGraph } from "../types";

export interface ExportWarning {
  code: string;
  message: string;
  blocking: boolean;
}

export type ExportWarningOptions = {
  /**
   * When false (default), missing logo / non-background image assets block export
   * so we do not silently succeed with slate placeholders.
   * User must explicitly allow placeholders in the Export panel.
   */
  allowPlaceholders?: boolean;
};

const KNOWN_FONT_IDS = new Set<string>(AD_STUDIO_FONTS.map((f) => f.id));
const KNOWN_FONT_FAMILIES = new Set<string>(
  AD_STUDIO_FONTS.map((f) => f.family.toLowerCase()),
);

function isBackgroundLayer(layer: {
  type: string;
  name?: string;
  zIndex?: number;
}): boolean {
  const name = (layer.name ?? "").toLowerCase();
  return name === "background" || name.includes("background");
}

/** Client-side preflight for export — mirrors server reject rules + soft warnings. */
export function collectExportWarnings(
  graph: AdSceneGraph | null,
  options: ExportWarningOptions = {},
): ExportWarning[] {
  const allowPlaceholders = Boolean(options.allowPlaceholders);
  if (!graph) {
    return [{ code: "no_graph", message: "Nothing to export yet.", blocking: true }];
  }
  const warnings: ExportWarning[] = [];
  const groups = graph.layers.filter((l) => l.type === "group" && l.visible !== false);
  if (groups.length) {
    warnings.push({
      code: "group_layers",
      message: `GROUP layers are not supported for export (${groups.map((g) => g.name || g.id).join(", ")}). Ungroup before rendering.`,
      blocking: true,
    });
  }

  const missingAssets = graph.layers.filter(
    (l) =>
      (l.type === "image" || l.type === "logo") &&
      l.visible !== false &&
      !(l as { storageKey?: string }).storageKey &&
      !(l as { assetId?: string }).assetId,
  );

  const missingLogos = missingAssets.filter((l) => l.type === "logo");
  const missingImages = missingAssets.filter(
    (l) => l.type === "image" && !isBackgroundLayer(l),
  );
  const missingBg = missingAssets.filter(
    (l) => l.type === "image" && isBackgroundLayer(l),
  );

  if (missingLogos.length) {
    warnings.push({
      code: "missing_logo",
      message: `${missingLogos.length} logo layer(s) have no asset — with placeholders allowed, export uses bounded slate tiles (not full-bleed).`,
      blocking: !allowPlaceholders,
    });
  }
  if (missingImages.length) {
    warnings.push({
      code: "missing_assets",
      message: `${missingImages.length} product/image layer(s) have no asset — export uses bounded slate placeholders when allowed, never stock imagery.`,
      blocking: !allowPlaceholders,
    });
  }
  if (missingBg.length) {
    warnings.push({
      code: "missing_background_asset",
      message:
        "Unbound full-bleed background image layers are skipped at export; canvas backgroundColor (and brand gradient wash shapes) fill the frame.",
      blocking: false,
    });
  }

  const unknownFonts: string[] = [];
  for (const layer of graph.layers) {
    if (layer.type !== "text" || layer.visible === false) continue;
    const t = layer as { fontId?: string; fontFamily?: string };
    const id = t.fontId;
    const family = t.fontFamily;
    const knownId = id && KNOWN_FONT_IDS.has(id);
    const knownFamily =
      family && KNOWN_FONT_FAMILIES.has(family.toLowerCase());
    if (!knownId && !knownFamily && (id || family)) {
      unknownFonts.push(family || id || "unknown");
    }
  }
  if (unknownFonts.length) {
    const unique = [...new Set(unknownFonts)].slice(0, 4);
    warnings.push({
      code: "unsupported_font",
      message: `Font(s) may fall back on the server: ${unique.join(", ")}.`,
      blocking: false,
    });
  }

  warnings.push({
    code: "shadow_approx",
    message: "Text shadows are approximated on the server (no Gaussian blur).",
    blocking: false,
  });
  warnings.push({
    code: "preview_not_parity",
    message:
      "Editor preview and SceneThumb are not pixel-identical to renderer output.",
    blocking: false,
  });
  return warnings;
}
