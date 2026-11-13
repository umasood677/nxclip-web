import type { AdBriefFormState } from "../lib/adStudioLabels";
import { validPreflightCost } from "../../../lib/aiExecutionPreflight";
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
  estimatedCostUsd: number | null;
  pricingVersion: string;
  inputScope: "saved-campaign-text-only";
  costBasis: "configured-estimate" | "usage-only";
};
/**
 * Campaign planning is an application capability.  Unlike artwork generation,
 * it does not expose a customer quote, budget, or authorization token in the
 * normal campaign journey.  Durable request ids still protect against
 * duplicate provider calls.
 */
export type PlanningInput = {
  planningAction: "brief" | "directions";
  planningFeedback?: string;
  conceptCount: 3;
};
export type QuotedConceptResult = {
  campaignStrategy?: {
    developedConcept?: AdBriefFormState["developedConcept"];
    creativeGuardrails?: string;
    advertisingObjective?: string;
    productOrService: string; targetAudience: string; coreMessage: string;
    desiredTone: string; creativeDirection: string; assumptions: string[];
    headline?: string; supportingCopy?: string; cta?: string;
  };
  concepts: AdConcept[];
  generationSource: "ai";
  provider: string;
  jobId: string;
  modelId?: string;
  executionCreatedAt?: string;
  warnings?: string[];
};
/** Only strategy fields may replace the existing draft. */
export function applyCampaignStrategy(
  draft: AdBriefFormState,
  strategy: NonNullable<QuotedConceptResult["campaignStrategy"]>,
): AdBriefFormState {
  const explicitCopy = copyExplicitlyRequestedIn(draft.campaignIdea ?? "");
  return {
    ...draft,
    developedConcept: strategy.developedConcept ?? draft.developedConcept,
    advertisingObjective: strategy.advertisingObjective ?? draft.advertisingObjective,
    creativeGuardrails: strategy.creativeGuardrails ?? draft.creativeGuardrails,
    productOrService: normalizeAdvertisingSubject(strategy.productOrService),
    targetAudience: strategy.targetAudience,
    coreMessage: strategy.coreMessage,
    desiredTone: strategy.desiredTone,
    creativeDirection: strategy.creativeDirection,
    // A campaign owner's explicitly requested copy always wins over a planning
    // suggestion.  Older retained planning responses did not include these
    // fields, so recover labelled copy from the original campaign idea.
    headline: explicitCopy.headline || draft.headline?.trim() || strategy.headline?.trim() || "",
    supportingCopy: explicitCopy.supportingCopy || draft.supportingCopy?.trim() || strategy.supportingCopy?.trim() || "",
    cta: explicitCopy.cta || draft.cta?.trim() || strategy.cta?.trim() || "",
    planningAssumptions: strategy.assumptions,
  };
}

/**
 * Campaign names are often prefixed with a test or UAT marker.  They are not
 * part of the advertised subject, even when an older planning response copied
 * that marker into productOrService.  Keep ordinary product names unchanged.
 */
function normalizeAdvertisingSubject(value: string) {
  return value
    .trim()
    .replace(/^(?:uat|test|campaign)\s*(?:\d+|[a-z0-9_-]+)?\s*[—–:-]\s*/i, "")
    .trim();
}

function copyExplicitlyRequestedIn(idea: string) {
  const match = (labels: string[]) => {
    const label = labels.map((item) => item.replace(/\s+/g, "\\s+")).join("|");
    const quoted = new RegExp(`(?:${label})\\s*(?::|is|=)?\\s*[\\"“]([^\\"”\\n]{1,500})[\\"”]`, "i").exec(idea)?.[1];
    if (quoted?.trim()) return quoted.trim();
    return new RegExp(`(?:${label})\\s*:\\s*([^\\n]{1,500})`, "i").exec(idea)?.[1]?.trim() ?? "";
  };
  return {
    headline: match(["headline"]),
    supportingCopy: match(["supporting copy"]),
    cta: match(["cta", "call to action"]),
  };
}

export function realConceptsEnabled(
  env: Record<string, unknown> | undefined = import.meta.env,
) {
  return env?.VITE_AD_STUDIO_REAL_CONCEPTS_ENABLED === "true";
}
export function validateConceptQuote(
  quote: ConceptQuote,
  budget?: number,
): ConceptQuote {
  if (
    quote.schemaVersion !== "1.0" ||
    quote.inputScope !== "saved-campaign-text-only" ||
    !validPreflightCost(quote, budget) ||
    !["gemini", "vertex"].includes(quote.provider) ||
    !quote.modelId ||
    !quote.catalogId ||
    !quote.pricingVersion ||
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
