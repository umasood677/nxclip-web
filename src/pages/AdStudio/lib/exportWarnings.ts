import type { AdSceneGraph } from "../types";

export interface ExportWarning {
  code: string;
  message: string;
  blocking: boolean;
}

/** Client-side preflight for export — mirrors server reject rules. */
export function collectExportWarnings(graph: AdSceneGraph | null): ExportWarning[] {
  if (!graph) return [{ code: "no_graph", message: "Nothing to export yet.", blocking: true }];
  const warnings: ExportWarning[] = [];
  const groups = graph.layers.filter((l) => l.type === "group" && l.visible !== false);
  if (groups.length) {
    warnings.push({
      code: "group_layers",
      message: `GROUP layers are not supported for export (${groups.map((g) => g.name || g.id).join(", ")}). Ungroup before rendering.`,
      blocking: true,
    });
  }
  warnings.push({
    code: "shadow_approx",
    message: "Text shadows are approximated on the server (no Gaussian blur).",
    blocking: false,
  });
  warnings.push({
    code: "font_diff",
    message: "Server fonts may differ slightly from browser preview.",
    blocking: false,
  });
  return warnings;
}
