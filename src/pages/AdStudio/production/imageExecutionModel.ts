import { validPreflightCost } from "../../../lib/aiExecutionPreflight";
import type { WorkspaceCreative } from "../lib/projectWorkspace";
export type AdImageOperation = "generate" | "variation" | "refine";
export type ImageQuote = {
  templateReviewMode?: "approval-page-v1";
  characterSelectionSupported?: true;
  selectedCharacterIds?: string[];
  schemaVersion: "1.0";
  sourceHash: string;
  quoteHash: string;
  catalogId: string;
  provider: "gemini" | "vertex";
  modelId: string;
  estimatedCostUsd: number | null;
  pricingVersion: string;
  imageCount: 1;
  inputScope: "editable-ad-background" | "editable-template-proposal";
  referenceCount: number;
  productLayerCount?: number;
  sourceTreatment?: "original-photo-layer" | "background-only" | "reference-guided-proposal";
  costBasis: "configured-estimate" | "usage-only";
};
export type ImageInput = {
  expectedVersion: number;
  operation: AdImageOperation;
  renderMode?: 'background' | 'template-proposal';
  instruction: string;
  maxEstimatedCostUsd?: number;
  selectedCharacterIds?: string[];
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
    !["editable-ad-background","editable-template-proposal"].includes(q.inputScope) ||
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

/** Explicit selection only; legacy brand context never silently selects a profile. */
export function savedCharacterSelection(source: WorkspaceCreative): string[] {
  return [
    ...new Set(
      source.selectedCharacterIds ??
        source.sceneGraph?.layers
          .filter(
            (l) => l.type === "image" && l.id.startsWith("brand-character-"),
          )
          .map((l) => l.id.slice("brand-character-".length)) ??
        [],
    ),
  ];
}
export function toggleAdCharacter(
  ids: readonly string[],
  id: string,
): string[] {
  if (ids.includes(id)) return ids.filter((value) => value !== id);
  if (ids.length >= 4) throw Error("Select up to four profiles for this ad.");
  return [...ids, id];
}

export function assertCharacterQuote(
  quote: ImageQuote,
  selected: readonly string[],
) {
  if (
    quote.characterSelectionSupported !== true ||
    JSON.stringify(quote.selectedCharacterIds) !== JSON.stringify(selected)
  )
    throw Error(
      "The Content/AI runtime has not verified this model selection. Activate the updated services before generation.",
    );
}

export function imageSourceIssue(creative: WorkspaceCreative): string | null {
  return creative.sceneGraph?.layers.some(l=>l.id.includes(':slotHint:')) ? 'This layout has empty product slots. Complete them in Canvas or start with Product hero before generation.' : null;
}

export function assertImageRenderMode(quote: ImageQuote, mode: 'background' | 'template-proposal') {
  if(quote.inputScope !== (mode === 'template-proposal' ? 'editable-template-proposal' : 'editable-ad-background') || (mode === 'template-proposal' && quote.sourceTreatment !== 'reference-guided-proposal'))throw Error('The active runtime has not verified finished-template proposal support. No generation was started.');
}

export function assertSingleTemplateReview(quote:ImageQuote){
  if(quote.templateReviewMode!=="approval-page-v1")throw Error("Activate the updated Content service before generating this template. No generation was started.");
}
