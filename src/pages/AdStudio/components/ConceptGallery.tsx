import React, { useState } from "react";
import { Eye, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import type { AdConcept } from "../types";
import { resolveConceptPalette, resolveConceptVisualStyle } from "../lib/conceptVisual";
import { ConceptMockup } from "./ConceptMockup";

type Props = {
  concepts: AdConcept[];
  brand?: BrandKitSummary | null;
  outputFormat: string;
  generationSource?: string | null;
  busy?: boolean;
  loading?: boolean;
  projectReady: boolean;
  selectedConceptId?: string | null;
  /** Optional real images keyed by conceptId */
  conceptImages?: Record<string, string>;
  onSelect: (conceptId: string) => void;
  onCreateCreative: (conceptId: string) => void;
  onRegenerate: () => void;
  onGenerateBackground?: (conceptId: string) => void;
  onReturnToBrief?: () => void;
};

export function ConceptGallery({
  concepts,
  brand,
  outputFormat,
  generationSource,
  busy,
  loading,
  projectReady,
  selectedConceptId,
  conceptImages,
  onSelect,
  onCreateCreative,
  onRegenerate,
  onGenerateBackground,
  onReturnToBrief,
}: Props) {
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const details = concepts.find((c) => c.conceptId === detailsId) ?? null;
  const detailsStyle = details
    ? resolveConceptVisualStyle(details, brand)
    : null;
  const detailsPalette = details
    ? resolveConceptPalette(details, brand)
    : null;

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading concepts">
        <div className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!projectReady) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Create a project to unlock concept generation.
      </div>
    );
  }

  if (!concepts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          No concepts yet. Generate when your brief feels ready — this uses the existing AI concept workflow.
        </p>
        <Button type="button" onClick={onRegenerate} disabled={busy}>
          {busy ? (
            <Loader2 size={14} className="mr-2 animate-spin" />
          ) : (
            <Sparkles size={14} className="mr-2" />
          )}
          Generate concepts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Concept gallery</h3>
          {generationSource ? (
            <Badge variant="outline" className="text-[10px]">
              {generationSource}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onReturnToBrief ? (
            <Button type="button" size="sm" variant="ghost" onClick={onReturnToBrief}>
              Back to brief
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onRegenerate}
          >
            {busy ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <RotateCcw size={14} className="mr-1" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      <div
        className="grid sm:grid-cols-2 gap-4"
        role="listbox"
        aria-label="Generated advertising concepts"
      >
        {concepts.map((concept) => {
          const selected = selectedConceptId === concept.conceptId;
          const style = resolveConceptVisualStyle(concept, brand);
          const palette = resolveConceptPalette(concept, brand);
          const imageUrl = conceptImages?.[concept.conceptId];

          return (
            <div
              key={concept.conceptId}
              role="option"
              aria-selected={selected}
              tabIndex={0}
              onClick={() => onSelect(concept.conceptId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(concept.conceptId);
                }
              }}
              className={cn(
                "rounded-2xl border bg-card/60 p-3 space-y-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected
                  ? "border-primary shadow-soft-md ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40",
                "motion-safe:transition-shadow",
              )}
            >
              <div className="flex gap-3">
                <ConceptMockup
                  concept={concept}
                  brand={brand}
                  outputFormat={outputFormat}
                  imageUrl={imageUrl}
                  compact
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="text-sm font-semibold leading-snug">
                      {concept.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {concept.creativeDirection}
                    </div>
                  </div>
                  <div className="text-base font-medium leading-snug">
                    {concept.primaryHeadline}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {concept.supportingCopy}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{concept.cta}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {style.moodLabel}
                    </Badge>
                  </div>
                  <div className="flex gap-1" aria-label="Color palette">
                    {palette.colors.slice(0, 4).map((hex) => (
                      <span
                        key={hex}
                        className="h-3.5 w-3.5 rounded-full border border-border"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(concept.conceptId);
                    onCreateCreative(concept.conceptId);
                  }}
                >
                  Create editable creative
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsId(concept.conceptId);
                  }}
                >
                  <Eye size={14} className="mr-1" /> Details
                </Button>
                {onGenerateBackground ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateBackground(concept.conceptId);
                    }}
                  >
                    AI background
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetailsId(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {details && detailsStyle && detailsPalette ? (
            <>
              <DialogHeader>
                <DialogTitle>{details.title}</DialogTitle>
                <DialogDescription>{details.creativeDirection}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <ConceptMockup
                  concept={details}
                  brand={brand}
                  outputFormat={outputFormat}
                  imageUrl={conceptImages?.[details.conceptId]}
                />
                <div className="space-y-3 text-sm min-w-0 flex-1">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Headline
                    </div>
                    <div className="font-medium">{details.primaryHeadline}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Supporting
                    </div>
                    <p>{details.supportingCopy}</p>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Composition
                    </div>
                    <p className="text-muted-foreground">{details.composition}</p>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Mood
                    </div>
                    <p>{detailsStyle.moodLabel}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {detailsPalette.colors.map((hex) => (
                      <span
                        key={hex}
                        className="h-5 w-5 rounded-md border border-border"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                  {details.claimWarnings?.length ? (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      {details.claimWarnings.join(" · ")}
                    </div>
                  ) : null}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailsId(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onCreateCreative(details.conceptId);
                    setDetailsId(null);
                  }}
                >
                  Create editable creative
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
