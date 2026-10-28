import type { GuidedBrandDraft } from "../guided/guidedBrandModel";
export interface BrandAnalysisQuote {
  schemaVersion: "1.0";
  sourceVersion: number;
  sourceHash: string;
  quoteHash: string;
  catalogId: string;
  provider: "gemini" | "vertex";
  modelId: string;
  estimatedCostUsd: number;
  pricingVersion: string;
  maxOutputTokens: number;
  costBasis: "configured-estimate";
  inputScope: "saved-brand-text-only";
}
export interface BrandAnalysisProposal {
  description: string;
  audience: string;
  tone: string;
  personality: string;
  palette: Array<{
    role: "primary" | "secondary" | "accent" | "background";
    hex: string;
  }>;
  visualStyle: string;
  lighting: string;
  typographyDirection: string;
  rationale: string[];
  warnings: string[];
}
export interface BrandAnalysisResult {
  schemaVersion: "1.0";
  jobId: string;
  sourceHash: string;
  sourceVersion: number;
  provider: "gemini" | "vertex";
  modelId: string;
  generationSource: "ai";
  proposal: BrandAnalysisProposal;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    costBasis: "configured-estimate";
  };
  approvalState: "requires-owner-review";
}
export type AnalysisSelection =
  | "description"
  | "audience"
  | "tone"
  | "personality"
  | "palette"
  | "guidelines";
export const ANALYSIS_SELECTIONS: AnalysisSelection[] = [
  "description",
  "audience",
  "tone",
  "personality",
  "palette",
  "guidelines",
];
export function isBrandAnalysisEnabled(
  env: Record<string, unknown> | undefined = import.meta.env,
) {
  return env?.VITE_AD_STUDIO_BRAND_ANALYSIS_ENABLED === "true";
}
export function applyBrandAnalysisProposal(
  draft: GuidedBrandDraft,
  proposal: BrandAnalysisProposal,
  selected: AnalysisSelection[],
): GuidedBrandDraft {
  if (!selected.length) return draft;
  const next = structuredClone(draft);
  for (const key of ["description", "audience", "tone", "personality"] as const)
    if (selected.includes(key)) next[key] = proposal[key];
  if (selected.includes("palette"))
    for (const color of proposal.palette) {
      const existing = next.colors.find((c) => c.role === color.role);
      if (existing) existing.hex = color.hex;
      else
        next.colors.push({
          role: color.role,
          hex: color.hex,
          name: color.role,
          sortOrder: next.colors.length,
        });
    }
  if (selected.includes("guidelines")) {
    const guidance = [
      proposal.visualStyle &&
        `Proposed visual direction: ${proposal.visualStyle}`,
      proposal.lighting && `Proposed lighting: ${proposal.lighting}`,
      proposal.typographyDirection &&
        `Proposed typography direction: ${proposal.typographyDirection}`,
    ]
      .filter(Boolean)
      .join("\n");
    next.guidelines = [next.guidelines, guidance].filter(Boolean).join("\n\n");
  }
  if (
    next.description.length > 2000 ||
    next.guidelines.length > 20000 ||
    next.colors.length > 32
  )
    throw new Error(
      "Selected suggestions exceed the existing Brand Kit field limits; review those fields manually.",
    );
  next.identityApproved = false;
  next.guidelinesApproved = false;
  return next;
}

export function requireExecutableAnalysisQuote(
  input: unknown,
  sourceVersion: number,
  budget: number,
): BrandAnalysisQuote {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid analysis estimate.");
  const q = input as BrandAnalysisQuote;
  if (
    q.schemaVersion !== "1.0" ||
    q.sourceVersion !== sourceVersion ||
    !["gemini", "vertex"].includes(q.provider) ||
    typeof q.modelId !== "string" ||
    !q.modelId.trim() ||
    !/^([a-f0-9]{64})$/.test(q.quoteHash) ||
    !/^([a-f0-9]{64})$/.test(q.sourceHash) ||
    !Number.isFinite(q.estimatedCostUsd) ||
    q.estimatedCostUsd < 0 ||
    q.estimatedCostUsd > budget ||
    q.costBasis !== "configured-estimate" ||
    q.inputScope !== "saved-brand-text-only" ||
    !Number.isInteger(q.maxOutputTokens) ||
    q.maxOutputTokens < 1 ||
    q.maxOutputTokens > 4096
  )
    throw new Error(
      "Analysis estimate is not executable for this saved source and budget.",
    );
  return q;
}
