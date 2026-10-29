import type { AdSceneGraph } from "../../AdStudio/types";
import type { WorkspaceProject } from "../../AdStudio/lib/projectWorkspace";
export type BrandTemplateAction =
  | "approve"
  | "reject"
  | "archive"
  | "restore"
  | "save"
  | "duplicate";
/** Versioned wire shape; scene geometry remains the existing AdSceneGraph contract. */
export interface BrandTemplate {
  schemaVersion: 1;
  id: string;
  brandKitId: string;
  ownerUserId: string;
  name: string;
  sourceTemplateId: string;
  sourceIdentityHash: string;
  sourceBrandVersion: number;
  format: string;
  revision: number;
  state: "suggested" | "approved" | "rejected" | "archived";
  saved: boolean;
  sceneGraph: AdSceneGraph;
  sourceAssetIds: string[];
  blockers: string[];
  warnings: string[];
  reuseIssues?: string[];
  provenance: { method: "native-template-engine" | "provider-ai-creative"; catalogVersion: string; sourceCreativeId?:string; sourceProjectId?:string; generatedAssetId?:string; provider?:string; modelId?:string };
}
export function isBrandTemplatesEnabled(
  env: Record<string, unknown> | undefined = import.meta.env,
): boolean {
  return env?.VITE_AD_STUDIO_BRAND_TEMPLATES_ENABLED === "true";
}
export function compatibleTemplateProjects(
  projects: WorkspaceProject[],
  kitId: string,
  format: string,
): WorkspaceProject[] {
  return projects.filter(
    (p) => p.brandKitId === kitId && p.outputFormat === format,
  );
}
export function editTemplateHeadline(
  graph: AdSceneGraph,
  headline: string,
): AdSceneGraph {
  const next = structuredClone(graph);
  const layer = next.layers.find((l) => l.type === "text");
  if (!layer || !("text" in layer))
    throw new Error("This template has no editable headline layer.");
  layer.text = headline;
  return next;
}
export function templateHeadline(graph: AdSceneGraph): string {
  const layer =
    graph.layers.find((l) => l.type === "text" && l.name === "Headline") ??
    graph.layers.find((l) => l.type === "text");
  return layer && "text" in layer && typeof layer.text === "string"
    ? layer.text
    : "";
}
export function canReuseTemplate(template: BrandTemplate): boolean {
  return (
    template.state === "approved" &&
    template.saved &&
    !template.blockers.length &&
    !template.reuseIssues?.length
  );
}

export function applyBrandTemplateCopy(
  graph: AdSceneGraph,
  copy: { primaryHeadline: string; supportingCopy: string; cta: string },
): AdSceneGraph {
  const next = structuredClone(graph);
  for (const item of [
    { name: "Headline", value: copy.primaryHeadline },
    { name: "Supporting copy", value: copy.supportingCopy },
    { name: "CTA button", value: copy.cta },
  ]) {
    const layer = next.layers.find((l) => l.name === item.name && "text" in l);
    if (layer && "text" in layer) layer.text = item.value;
  }
  return next;
}
