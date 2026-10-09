import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Skeleton } from "../../../components/ui/skeleton";
import { contentApi } from "../../../services/apiClient";
import type { ImagePromptContext } from "../lib/imagePromptContext";
import { describeImageEditError } from "../lib/imageEditError";

export function SmartEnhance({
  context,
  disabled,
  applied,
  onApply,
}: {
  context: ImagePromptContext;
  disabled: boolean;
  applied?: string;
  onApply: (value: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const contextKey = JSON.stringify({
    ...context,
    enhancement: undefined,
    refinement: undefined,
  });
  const latest = useRef(contextKey);
  latest.current = contextKey;
  const enhance = async () => {
    const key = contextKey;
    setPending(true);
    setPreview(null);
    try {
      const result = await contentApi.enhanceImagePrompt({
        ...context,
        enhancement: undefined,
        refinement: undefined,
      });
      if (latest.current !== key) {
        toast.message(
          "Your settings changed. Enhance again using the current settings.",
        );
        return;
      }
      setSnapshot(key);
      setPreview(result.enhancedPrompt);
    } catch (error: unknown) {
      toast.error("Smart Enhance failed. Your original idea is unchanged.", {
        description: describeImageEditError(error),
      });
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={
          disabled ||
          pending ||
          context.basePrompt.trim().length < 3 ||
          context.basePrompt.length > 500
        }
        onClick={() => void enhance()}
      >
        <Sparkles size={12} className="mr-1.5" />
        {pending ? "Enhancing…" : "Enhance"}
      </Button>
      {pending ? <Skeleton className="h-24 w-full rounded-md" /> : null}
      {preview !== null && snapshot === contextKey ? (
        <div className="space-y-2 rounded-md border border-white/10 bg-white/5 p-2">
          <p className="text-[10px] text-muted-foreground">
            Enhanced prompt · edit before applying
          </p>
          <Textarea
            aria-label="Enhanced prompt preview"
            value={preview}
            onChange={(event) => setPreview(event.target.value)}
            className="min-h-24 text-xs"
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={
                disabled || preview.trim().length < 3 || preview.length > 500
              }
              onClick={() => {
                onApply(preview.trim());
                setPreview(null);
              }}
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPreview(null)}
            >
              Cancel
            </Button>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {preview.length}/500
            </span>
          </div>
        </div>
      ) : null}
      {applied && (preview === null || snapshot !== contextKey) ? (
        <div className="space-y-1 rounded-md border border-white/10 bg-white/5 p-2">
          <p className="text-[10px] text-muted-foreground">
            Applied enhancement · original idea preserved above
          </p>
          <p className="text-xs">{applied}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            disabled={disabled}
            onClick={() => onApply("")}
          >
            Use original idea
          </Button>
        </div>
      ) : null}
    </div>
  );
}
