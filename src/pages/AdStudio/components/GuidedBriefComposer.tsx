import React, { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { AD_FORMATS } from "../types";
import {
  AD_CTA_SUGGESTIONS,
  AD_OBJECTIVES,
  AD_PLATFORMS,
  type AdBriefFormState,
} from "../lib/adStudioLabels";
import { BriefLivePreview } from "./BriefLivePreview";
import { BrandKitPicker } from "./BrandKitPicker";
import { ConceptGallery } from "./ConceptGallery";
import type { AdConcept } from "../types";

type Props = {
  form: AdBriefFormState;
  onChange: (patch: Partial<AdBriefFormState>) => void;
  brands: BrandKitSummary[];
  brandsLoading: boolean;
  brandsError: string | null;
  onRetryBrands: () => void;
  onSelectBrand: (id: string) => void;
  onCreateBrand: () => void;
  onEditBrand: (kit: BrandKitSummary) => void;
  onImportBrand?: () => void;
  onBack: () => void;
  busy: boolean;
  conceptsLoading?: boolean;
  projectId: string | null;
  canCreate: boolean;
  onCreateProject: () => void;
  onGenerateConcepts: () => void;
  concepts: AdConcept[];
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
  generationSource: string | null;
  conceptImages?: Record<string, string>;
  creatives: Array<{ id: string; name: string; currentVersion?: number }>;
  onOpenConcept: (conceptId: string) => void;
  onGenerateBackground: (conceptId: string) => void;
  onOpenCreative: (id: string) => void;
};

function ChoiceChip({
  selected,
  title,
  hint,
  onClick,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 shadow-soft"
          : "border-border hover:border-primary/35 bg-card/40",
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
    </button>
  );
}

export function GuidedBriefComposer({
  form,
  onChange,
  brands,
  brandsLoading,
  brandsError,
  onRetryBrands,
  onSelectBrand,
  onCreateBrand,
  onEditBrand,
  onImportBrand,
  onBack,
  busy,
  conceptsLoading,
  projectId,
  canCreate,
  onCreateProject,
  onGenerateConcepts,
  concepts,
  selectedConceptId,
  onSelectConcept,
  generationSource,
  conceptImages,
  creatives,
  onOpenConcept,
  onGenerateBackground,
  onOpenCreative,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedBrand = brands.find((b) => b.id === form.brandKitId) ?? null;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} className="mr-1" /> Home
        </Button>
        {projectId ? (
          <Badge variant="outline" className="text-[11px]">
            Project ready · generate concepts when set
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px]">
            Guided brief
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-5 min-h-[calc(100vh-200px)]">
        {/* Left: progressive brief */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-border glass p-5 space-y-5">
            <div>
              <Label className="text-base font-semibold">What would you like to advertise?</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Lead with the product or offer. Everything else builds around this.
              </p>
              <Textarea
                value={form.productOrService}
                onChange={(e) => onChange({ productOrService: e.target.value })}
                rows={2}
                placeholder="e.g. Wireless noise-cancelling headphones for professionals"
                className="text-base"
              />
            </div>

            <div>
              <Label>Core message</Label>
              <Input
                value={form.coreMessage}
                onChange={(e) => onChange({ coreMessage: e.target.value })}
                placeholder="The line your audience should remember"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Who is this for?</Label>
              <Input
                value={form.targetAudience}
                onChange={(e) => onChange({ targetAudience: e.target.value })}
                placeholder="e.g. Busy professionals aged 25–45"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Campaign objective</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {AD_OBJECTIVES.map((o) => (
                  <ChoiceChip
                    key={o.value}
                    selected={form.advertisingObjective === o.value}
                    title={o.label}
                    hint={o.hint}
                    onClick={() => onChange({ advertisingObjective: o.value })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Target platform</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {AD_PLATFORMS.map((p) => (
                  <ChoiceChip
                    key={p.value}
                    selected={form.platform === p.value}
                    title={p.label}
                    hint={p.hint}
                    onClick={() => onChange({ platform: p.value })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Aspect ratio</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AD_FORMATS.map((f) => (
                  <ChoiceChip
                    key={f.id}
                    selected={form.outputFormat === f.id}
                    title={f.label}
                    hint={`${f.width}×${f.height}`}
                    onClick={() => onChange({ outputFormat: f.id })}
                  />
                ))}
              </div>
            </div>

            <BrandKitPicker
              brands={brands}
              selectedId={form.brandKitId}
              loading={brandsLoading}
              error={brandsError}
              onSelect={onSelectBrand}
              onCreate={onCreateBrand}
              onEdit={onEditBrand}
              onImport={onImportBrand}
              onRetry={onRetryBrands}
            />

            <div>
              <Label>Call to action</Label>
              <Input
                className="mt-1.5"
                value={form.cta}
                onChange={(e) => onChange({ cta: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {AD_CTA_SUGGESTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "text-[11px] rounded-full border px-2.5 py-1",
                      form.cta === c
                        ? "border-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => onChange({ cta: c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              More details (tone, project name)
            </button>

            {showAdvanced && (
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                <div>
                  <Label>Project name</Label>
                  <Input
                    className="mt-1"
                    value={form.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tone</Label>
                  <Input
                    className="mt-1"
                    value={form.desiredTone}
                    onChange={(e) => onChange({ desiredTone: e.target.value })}
                    placeholder="confident, calm, playful…"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="button"
                size="lg"
                disabled={busy || !canCreate}
                onClick={onCreateProject}
              >
                {busy ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Plus size={16} className="mr-2" />
                )}
                {projectId ? "Create another project" : "Create project"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={busy || !projectId}
                onClick={onGenerateConcepts}
              >
                <Sparkles size={16} className="mr-2" />
                Generate concepts
              </Button>
              {!canCreate && (
                <p className="text-[11px] text-muted-foreground">
                  Add product, core message, and audience to create a project.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: live preview + concepts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-border glass p-5 flex flex-col items-center justify-center min-h-[480px]">
            <BriefLivePreview form={form} brand={selectedBrand} />
          </div>

          <div className="rounded-2xl border border-border glass p-5 space-y-4">
            <ConceptGallery
              concepts={concepts}
              brand={selectedBrand}
              outputFormat={form.outputFormat}
              generationSource={generationSource}
              busy={busy}
              loading={conceptsLoading}
              projectReady={!!projectId}
              selectedConceptId={selectedConceptId}
              conceptImages={conceptImages}
              onSelect={onSelectConcept}
              onCreateCreative={onOpenConcept}
              onRegenerate={onGenerateConcepts}
              onGenerateBackground={onGenerateBackground}
            />

            {!!creatives.length && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Saved creatives
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {creatives.map((cr) => (
                    <button
                      key={cr.id}
                      type="button"
                      className="text-left rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40"
                      onClick={() => onOpenCreative(cr.id)}
                    >
                      {cr.name}
                      <span className="block text-xs text-muted-foreground">
                        v{cr.currentVersion ?? 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
