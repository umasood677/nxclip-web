import type { AdConcept } from "../types";
export type ConceptQuote = {
  schemaVersion: "1.0";
  sourceHash: string;
  quoteHash: string;
  catalogId: string;
  provider: "gemini" | "vertex";
  modelId: string;
  conceptCount: number;
  maxOutputTokens: number;
  estimatedCostUsd: number;
  pricingVersion: string;
  inputScope: "saved-campaign-text-only";
  costBasis: "configured-estimate";
};
export type QuotedConceptResult = {
  concepts: AdConcept[];
  generationSource: "ai";
  provider: string;
  jobId: string;
  modelId?: string;
  executionCreatedAt?: string;
  warnings?: string[];
};
export function realConceptsEnabled(
  env: Record<string, unknown> | undefined = import.meta.env,
) {
  return env?.VITE_AD_STUDIO_REAL_CONCEPTS_ENABLED === "true";
}
export function validateConceptQuote(
  quote: ConceptQuote,
  budget: number,
): ConceptQuote {
  if (
    quote.schemaVersion !== "1.0" ||
    quote.inputScope !== "saved-campaign-text-only" ||
    quote.costBasis !== "configured-estimate" ||
    !["gemini", "vertex"].includes(quote.provider) ||
    !quote.modelId ||
    !quote.catalogId ||
    !quote.pricingVersion ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > 1 ||
    !Number.isFinite(quote.estimatedCostUsd) ||
    quote.estimatedCostUsd < 0 ||
    quote.estimatedCostUsd > budget ||
    !Number.isInteger(quote.conceptCount) ||
    quote.conceptCount < 3 ||
    quote.conceptCount > 5 ||
    !Number.isInteger(quote.maxOutputTokens) ||
    quote.maxOutputTokens < 1 ||
    quote.maxOutputTokens > 6000 ||
    !/^[a-f0-9]{64}$/.test(quote.quoteHash) ||
    !/^[a-f0-9]{64}$/.test(quote.sourceHash)
  )
    throw Error(
      "The concept quote could not be verified. Request a fresh estimate.",
    );
  return quote;
}
export function requireAiConceptResult(value: QuotedConceptResult) {
  if (
    value.generationSource !== "ai" ||
    !value.jobId ||
    !Array.isArray(value.concepts) ||
    value.concepts.length < 3 ||
    value.concepts.length > 5 ||
    value.concepts.some((c) => !c.conceptId || !c.primaryHeadline) ||
    new Set(value.concepts.map((c) => c.conceptId)).size !==
      value.concepts.length
  )
    throw Error(
      "A retained validated AI concept batch is required; no heuristic result is substituted.",
    );
  return value;
}
