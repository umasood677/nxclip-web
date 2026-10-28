import { validPreflightCost } from "../../../lib/aiExecutionPreflight";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
export type AdImageOperation = "generate" | "variation" | "refine";
export type ImageQuote = {
  schemaVersion: "1.0";
  sourceHash: string;
  quoteHash: string;
  catalogId: string;
  provider: "gemini" | "vertex";
  modelId: string;
  estimatedCostUsd: number | null;
  pricingVersion: string;
  imageCount: 1;
  inputScope: "editable-ad-background";
  referenceCount: number;
  productLayerCount?: number;
  sourceTreatment?: "original-photo-layer" | "background-only";
  costBasis: "configured-estimate" | "usage-only";
};
export type ImageInput = {
  expectedVersion: number;
  operation: AdImageOperation;
  instruction: string;
  maxEstimatedCostUsd?: number;
};
export const realImagesEnabled = (
  env: Record<string, unknown> | undefined = import.meta.env,
) => env?.VITE_AD_STUDIO_REAL_IMAGES_ENABLED === "true";
export function hasGeneratedBackground(creative: WorkspaceCreative) {
  return (
    creative.sceneGraph?.layers.some(
      (l) => l.type === "image" && l.id.startsWith("ai-background-"),
    ) ?? false
  );
}
export function validateImageQuote(q: ImageQuote, budget?: number) {
  if (
    q.schemaVersion !== "1.0" ||
    q.inputScope !== "editable-ad-background" ||
    !validPreflightCost(q, budget) ||
    q.imageCount !== 1 ||
    !["gemini", "vertex"].includes(q.provider) ||
    !q.modelId ||
    !q.catalogId ||
    !q.pricingVersion ||
    !/^[a-f0-9]{64}$/.test(q.sourceHash) ||
    !/^[a-f0-9]{64}$/.test(q.quoteHash)
  )
    throw Error("Image quote is invalid or exceeds the approved estimate.");
  return q;
}
export function verifyGeneratedCreative(
  saved: WorkspaceCreative,
  source: WorkspaceCreative,
) {
  if (
    !saved.id ||
    saved.id === source.id ||
    saved.projectId !== source.projectId ||
    !hasGeneratedBackground(saved)
  )
    throw Error(
      "Generated creative persistence could not be verified. Check the retained request before retrying.",
    );
  return saved;
}
