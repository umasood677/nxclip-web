import type { AdSceneGraph } from "../types";

export const W87_SYNTHETIC_EDITOR_ENABLED_DEFAULT = false;

export type W87VariationIntent = "focal" | "atmosphere" | "typography";

export interface W87SyntheticVariationView {
  variationId: string;
  intent: W87VariationIntent;
  label: string;
  productLayerId: string;
  graph: AdSceneGraph;
  revision: number;
  mockOnly: true;
  backgroundSha256: string;
  distinctivenessKey: string;
}

export interface W87SyntheticEditorViewModel {
  selectedVariationId: string;
  isolationApproval: "pendingReview" | "rejected" | "accepted";
  productPreservationOk: boolean;
  providerGatesReady: boolean;
  mockOnly: true;
  featureEnabled: false;
  executionAuthorized: false;
  variations: W87SyntheticVariationView[];
}

/** Convert a W8.6 composition result into an editor view-model (client-side). */
export function toW87EditorViewModel(input: {
  selectedVariationId?: string;
  isolationApproval: "pendingReview" | "rejected" | "accepted";
  productPreservationOk: boolean;
  providerGatesReady: boolean;
  variations: Array<{
    variationId: string;
    intent: W87VariationIntent;
    label: string;
    productLayerId: string;
    sceneGraph: AdSceneGraph;
    backgroundSha256: string;
    distinctivenessKey: string;
  }>;
}): W87SyntheticEditorViewModel {
  if (input.variations.length !== 3) {
    throw new Error("EXPECTED_THREE_VARIATIONS");
  }
  const selectedVariationId =
    input.selectedVariationId ?? input.variations[0]!.variationId;
  if (!input.variations.some((v) => v.variationId === selectedVariationId)) {
    throw new Error("INVALID_VARIATION_ID");
  }
  return {
    selectedVariationId,
    isolationApproval: input.isolationApproval,
    productPreservationOk: input.productPreservationOk,
    providerGatesReady: input.providerGatesReady,
    mockOnly: true,
    featureEnabled: false,
    executionAuthorized: false,
    variations: input.variations.map((v) => ({
      variationId: v.variationId,
      intent: v.intent,
      label: v.label,
      productLayerId: v.productLayerId,
      graph: structuredClone(v.sceneGraph),
      revision: 0,
      mockOnly: true,
      backgroundSha256: v.backgroundSha256,
      distinctivenessKey: v.distinctivenessKey,
    })),
  };
}

/** Ensure edits to one variation do not share object identity with siblings. */
export function assertVariationGraphIsolation(model: W87SyntheticEditorViewModel): void {
  const graphs = model.variations.map((v) => v.graph);
  for (let i = 0; i < graphs.length; i++) {
    for (let j = i + 1; j < graphs.length; j++) {
      if (graphs[i] === graphs[j]) throw new Error("VARIATION_GRAPH_ALIASING");
      if (graphs[i]!.layers === graphs[j]!.layers) throw new Error("VARIATION_LAYER_ALIASING");
    }
  }
}
