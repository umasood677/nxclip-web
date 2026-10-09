export type ImageComposition =
  | "auto"
  | "cinematic"
  | "split_scene"
  | "hero"
  | "close_up"
  | "wide"
  | "pov";
// Deployment kill switch: legacy payloads remain available during backend rollback.
export const structuredImagePromptsEnabled =
  import.meta.env?.VITE_IMAGE_PROMPT_CONTEXT !== "false";
export interface ImagePromptContext {
  basePrompt: string;
  contentContext?: {
    title?: string;
    hook?: string;
    category?: string;
    focus?: string[];
    source?: "manual" | "content-calendar" | "suggestion";
  };
  generation?: {
    aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9";
    style?: string;
    lighting?: string;
    composition?: ImageComposition;
    caption?: string;
    referenceImages?: string[];
  };
  enhancement?: { enabled: boolean; enhancedPrompt?: string };
  negativeInstructions?: string[];
  refinement?: { instruction?: string; normalizedInstruction?: string };
}

/** Short calendar briefs remain directly editable/generatable. */
export function parseImageBrief(
  basePrompt: string,
  source: NonNullable<
    ImagePromptContext["contentContext"]
  >["source"] = "manual",
): ImagePromptContext["contentContext"] {
  const segments = basePrompt.split(/\s+[—–]\s+/);
  if (segments.length < 2) return { source };
  return {
    source,
    title: segments[0].slice(0, 200),
    hook: segments[1]?.slice(0, 500),
    category: segments
      .find((s) => /^(Category|Niche):/i.test(s))
      ?.replace(/^(Category|Niche):\s*/i, "")
      .slice(0, 100),
    focus: segments
      .find((s) => /^Focus:/i.test(s))
      ?.replace(/^Focus:\s*/i, "")
      .split(",")
      .map((s) => s.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 12),
  };
}
