import type { AdSceneGraph as AdSceneGraphDto } from "../types";
import type { CreativeBlueprintV1 } from "./creative-blueprint";

export const W86_SYNTHETIC_COMPOSITION_VERSION = "1.0.0" as const;
export const W86_SYNTHETIC_COMPOSITION_ENABLED_DEFAULT = false;

export type W86VariationIntent = "focal" | "atmosphere" | "typography";

export interface W86SyntheticCompositionVariation {
  variationId: string;
  intent: W86VariationIntent;
  label: string;
  sceneGraph: AdSceneGraphDto;
  backgroundSha256: string;
  productLayerId: string;
  previewPngSha256: string | null;
  exportPngSha256: string | null;
  distinctivenessKey: string;
}

export interface W86SyntheticCompositionResultV1 {
  schemaVersion: typeof W86_SYNTHETIC_COMPOSITION_VERSION;
  mode: "syntheticMockComposition";
  featureEnabled: false;
  executionAuthorized: false;
  liveAiGeneration: false;
  paidProviderCalls: 0;
  creativeApproval: "notApproved";
  orchestrator: "content-service/w86-synthetic-composition-v1";
  blueprintId: string;
  blueprintRevision: number;
  brandKitId: string;
  isolationRevisionKey: string;
  isolationApproval: "pendingReview" | "rejected" | "accepted";
  productPreservation: {
    rgbDifferences: number;
    protectedAlphaViolations: number;
    originalHashVerified: true;
  };
  qualityEvidence: {
    isolationBlockers: string[];
    haloAssessment: "humanReviewRequired";
    mockCompositionOnly: true;
  };
  provenance: {
    segmentationProviderId: string;
    imageGenerationProviderId: "w86-mock-image-gen";
    planningMethod: "deterministicVariationPlan";
    compositingMethod: "sourcePixelComposite";
  };
  effectiveBlueprint: CreativeBlueprintV1;
  variations: W86SyntheticCompositionVariation[];
  assets: Array<{
    assetId: string;
    role: string;
    sha256: string;
    provenance:
      | "syntheticFixture"
      | "mockGeneratedBackground"
      | "sourcePreservedProduct";
  }>;
}
