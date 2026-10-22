import type { ProductHeroSliceResultV1 } from "./product-hero-slice";
import type { AdSceneGraph, AdTextLayer } from "../types";
import { sanitizeSceneGraphForClient } from "../canvas/sanitizeSceneGraph";
import { updateLayer } from "../lib/sceneGraph";

export function productHeroSlicePreview(result: ProductHeroSliceResultV1): {
  graph: AdSceneGraph;
  label: string;
  assetIds: string[];
} {
  if (
    result.schemaVersion !== "1.0.0" ||
    result.mode !== "localTechnicalFixture" ||
    result.creativeApproval !== "notApproved" ||
    result.liveAiGeneration !== false ||
    result.providerCalls !== 0 ||
    result.creditTransactions !== 0 ||
    !["template:product-hero", "exampleBrief:ex-zoe-artisan"].includes(
      result.entryPoint.kind + ":" + result.entryPoint.id,
    )
  )
    throw new Error("Not an authorized local product-hero result");
  const graph = sanitizeSceneGraphForClient(structuredClone(result.sceneGraph));
  if (!graph) throw new Error("Invalid local scene");
  for (const name of ["Headline", "Supporting", "CTA"]) {
    if (
      !graph.layers.some(
        (l) =>
          l.type === "text" &&
          l.name === name &&
          typeof (l as { text?: string }).text === "string",
      )
    )
      throw new Error("Required editable text layer missing: " + name);
  }
  const assetIds = [
    ...new Set(
      graph.layers
        .filter((l) => l.type === "image" || l.type === "logo")
        .map((l) => (l as { assetId?: string }).assetId),
    ),
  ];
  if (
    assetIds.some((id) => !id || !result.assets.some((a) => a.assetId === id))
  )
    throw new Error("Missing local asset manifest entry");
  return {
    graph,
    label:
      "Temporary local test fixture — deterministic assembly, no live AI, human review pending.",
    assetIds: assetIds as string[],
  };
}
export function editProductHeroHeadline(
  graph: AdSceneGraph,
  text: string,
): AdSceneGraph {
  if (!text.trim() || text.length > 80)
    throw new Error(
      "Enter 1–80 headline characters; rerun export validation after edits.",
    );
  const headline = graph.layers.find(
    (l) => l.type === "text" && l.name === "Headline",
  ) as AdTextLayer | undefined;
  if (!headline || headline.locked)
    throw new Error("Editable headline unavailable");
  return updateLayer(graph, headline.id, { text });
}
