import React from "react";
import { ImageOff, LayoutTemplate, Loader2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import type { AdBriefFormState } from "../lib/adStudioLabels";
import { ConceptTemplatePreview } from "../canvas/ConceptTemplatePreview";
import { resolveConceptVisualStyle } from "../lib/conceptVisual";
import type { AdConcept } from "../types";
import { BriefLivePreview } from "./BriefLivePreview";

export type ConceptPreviewState =
  | "loading"
  | "empty"
  | "error"
  | "brief"
  | "selected";

type Props = {
  state: ConceptPreviewState;
  form: AdBriefFormState;
  brand?: BrandKitSummary | null;
  concept?: AdConcept | null;
  imageUrl?: string | null;
  errorMessage?: string | null;
  className?: string;
};

/**
 * Large workspace preview: selected concept mockup, brief sample, or status.
 * Deterministic only — no paid generation.
 */
export function ConceptLivePreview({
  state,
  form,
  brand,
  concept,
  imageUrl,
  errorMessage,
  className,
}: Props) {
  if (state === "loading") {
    return (
      <StatusFrame
        className={className}
        badge="Loading"
        title="Loading concepts"
        body="Fetching saved concepts for this project…"
        icon={<Loader2 className="animate-spin text-muted-foreground" size={28} />}
      />
    );
  }

  if (state === "error") {
    return (
      <StatusFrame
        className={className}
        badge="Error"
        title="Could not load concepts"
        body={errorMessage || "Try regenerating concepts or reopening the project."}
        icon={<ImageOff className="text-muted-foreground" size={28} />}
      />
    );
  }

  if (state === "empty") {
    return (
      <StatusFrame
        className={className}
        badge="Empty"
        title="No concepts yet"
        body="Generate concepts when your brief is ready. The live preview will appear here."
        icon={<LayoutTemplate className="text-muted-foreground" size={28} />}
      />
    );
  }

  if (state === "selected" && concept) {
    const style = resolveConceptVisualStyle(concept, brand);
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 w-full min-h-[480px] justify-center",
          className,
        )}
        data-preview-state="selected"
        data-selected-concept={concept.conceptId}
      >
        <div className="flex flex-wrap items-center gap-2 self-stretch justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className="text-[10px] uppercase tracking-wide shrink-0">
              Live preview
            </Badge>
            <span className="text-sm font-semibold truncate">{concept.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px]">
              {style.layoutLabel}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {style.moodLabel}
            </Badge>
          </div>
        </div>
        <ConceptTemplatePreview
          concept={concept}
          brand={brand}
          outputFormat={form.outputFormat}
          imageUrl={imageUrl}
          hero
        />
        <div className="w-full max-w-md space-y-1 text-center sm:text-left">
          <p className="text-base font-medium leading-snug">
            {concept.primaryHeadline}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {concept.supportingCopy}
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            CTA · {concept.cta}
          </p>
        </div>
      </div>
    );
  }

  // brief sample — project exists but nothing selected / pre-generation
  return (
    <div
      className={cn("w-full min-h-[480px] flex items-center justify-center", className)}
      data-preview-state="brief"
    >
      <BriefLivePreview form={form} brand={brand} />
    </div>
  );
}

function StatusFrame({
  className,
  badge,
  title,
  body,
  icon,
}: {
  className?: string;
  badge: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 min-h-[480px] text-center px-6",
        className,
      )}
      data-preview-state={badge.toLowerCase()}
    >
      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
        {badge}
      </Badge>
      {icon}
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
