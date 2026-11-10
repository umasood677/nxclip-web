import type { TemplateReferenceSelection } from "../../BrandKits/templates/templateReferenceInput";
import type { WorkspaceCreative } from "./projectWorkspace";
import {
  validateImageQuote,
  type ImageInput,
  type ImageQuote,
} from "../production/imageExecutionModel";
export type CampaignDraftInput = {
  requestId: string;
  conceptId?: string;
  /** A variation always creates a new child creative; the source is never overwritten. */
  sourceCreativeId?: string;
  instruction: string;
  headline: string;
  supportingCopy: string;
  cta: string;
  references: TemplateReferenceSelection[];
};
export interface CampaignImageApi {
  draft: (
    project: string,
    input: CampaignDraftInput,
  ) => Promise<WorkspaceCreative>;
  quote: (id: string, input: ImageInput) => Promise<ImageQuote>;
  execute: (
    id: string,
    input: ImageInput & {
      requestId: string;
      approvedQuoteHash: string;
      allowPaidProvider: boolean;
    },
  ) => Promise<WorkspaceCreative>;
}
/** Explicit invocation only: free brief selection never invokes this orchestrator. */
export async function generateOriginalCampaignAd(
  api: CampaignImageApi,
  projectId: string,
  input: CampaignDraftInput,
  onPrepared: (draft: WorkspaceCreative) => void,
  options: {
    onExecuting?: () => void;
    authorizeQuote?: (quote: ImageQuote) => Promise<boolean>;
  } = {},
) {
  const draft = await api.draft(projectId, input);
  if (
    draft.projectId !== projectId ||
    draft.conceptSnapshot?.purpose !== "ORIGINAL_AI" ||
    !draft.id
  )
    throw Error("Campaign draft could not be verified.");
  onPrepared(draft);
  if (
    draft.sceneGraph?.layers.some((l) => l.id.startsWith("ai-background-"))
  )
    return draft;
  const execution: ImageInput = {
    executionScope: "campaign-photography",
    expectedVersion: draft.currentVersion || 1,
    operation: "generate",
    instruction: input.instruction,
  };
  const quote = validateImageQuote(await api.quote(draft.id, execution));
  if (quote.inputScope !== "editable-campaign-ad")
    throw Error(
      "The running services do not support original campaign photography yet. No image was requested.",
    );
  if (options.authorizeQuote && !(await options.authorizeQuote(quote))) return null;
  options.onExecuting?.();
  const result = await api.execute(draft.id, {
    ...execution,
    requestId: input.requestId,
    approvedQuoteHash: quote.quoteHash,
    allowPaidProvider: true,
  });
  if (
    result.id !== draft.id ||
    result.projectId !== projectId ||
    !result.sceneGraph?.layers.some((l) => l.id.startsWith("ai-background-"))
  )
    throw Error(
      "Generated ad could not be confirmed. Check its saved status before retrying.",
    );
  return result;
}
