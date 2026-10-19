import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  PanelRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { AD_FORMATS } from "../types";
import type { AdBriefFormState } from "../lib/adStudioLabels";
import { ConceptGallery } from "./ConceptGallery";
import {
  ConceptLivePreview,
  type ConceptPreviewState,
} from "./ConceptLivePreview";
import { ProjectDetailsDrawer } from "./ProjectDetailsDrawer";
import type { AdConcept } from "../types";
import { TemplateGallery } from "./TemplateGallery";
import type { AdSceneOutputFormatId, AdStudioTemplateId } from "../canvas/templateCatalog";

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
  conceptsError?: string | null;
  projectId: string | null;
  canCreate: boolean;
  onCreateProject: () => void;
  onGenerateConcepts: () => void;
  onSaveBrief?: () => void | Promise<void>;
  savingBrief?: boolean;
  concepts: AdConcept[];
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
  generationSource: string | null;
  conceptImages?: Record<string, string>;
  creatives: Array<{ id: string; name: string; currentVersion?: number }>;
  onOpenConcept: (conceptId: string) => void;
  onGenerateBackground: (conceptId: string) => void;
  onOpenCreative: (id: string) => void;
  templatesV1Enabled?: boolean;
  onUseTemplate?: (
    templateId: AdStudioTemplateId,
    format: AdSceneOutputFormatId,
  ) => void;
};

/**
 * UX-1 workspace: compact header + optional details drawer.
 * Gallery + live concept preview are the primary focus.
 */
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
  conceptsError,
  projectId,
  canCreate,
  onCreateProject,
  onGenerateConcepts,
  onSaveBrief,
  savingBrief,
  concepts,
  selectedConceptId,
  onSelectConcept,
  generationSource,
  conceptImages,
  creatives,
  onOpenConcept,
  onGenerateBackground,
  onOpenCreative,
  templatesV1Enabled = false,
  onUseTemplate,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(!projectId);
  const selectedBrand = brands.find((b) => b.id === form.brandKitId) ?? null;
  const selectedConcept =
    concepts.find((c) => c.conceptId === selectedConceptId) ?? null;
  const format =
    AD_FORMATS.find((f) => f.id === form.outputFormat) ?? AD_FORMATS[1];

  const previewState: ConceptPreviewState = useMemo(() => {
    if (conceptsLoading) return "loading";
    if (conceptsError) return "error";
    if (!projectId) return "brief";
    if (!concepts.length) return "empty";
    if (selectedConcept) return "selected";
    return "brief";
  }, [
    conceptsLoading,
    conceptsError,
    projectId,
    concepts.length,
    selectedConcept,
  ]);

  return (
    <div className="space-y-4 pb-8">
      {/* Compact project header */}
      <header className="rounded-2xl border border-border glass px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} className="mr-1" /> Home
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate max-w-[220px] sm:max-w-md">
              {form.name.trim() || "Untitled project"}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px]">
                {selectedBrand?.name ?? "No Brand Kit"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {format.label}
              </Badge>
              {projectId ? (
                <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  Ready
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Draft brief
                </Badge>
              )}
              {selectedConcept ? (
                <Badge className="text-[10px] max-w-[160px] truncate">
                  {selectedConcept.title}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDetailsOpen(true)}
          >
            <PanelRight size={14} className="mr-1" />
            Project details
          </Button>
          {!projectId ? (
            <Button
              type="button"
              size="sm"
              disabled={busy || !canCreate}
              onClick={onCreateProject}
            >
              {busy ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Plus size={14} className="mr-1" />
              )}
              Create project
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={onGenerateConcepts}
            >
              {busy || conceptsLoading ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Sparkles size={14} className="mr-1" />
              )}
              {concepts.length ? "Regenerate concepts" : "Generate concepts"}
            </Button>
          )}
        </div>
      </header>

      {!projectId && !canCreate ? (
        <p className="text-xs text-muted-foreground px-1">
          Open Project details to add product, core message, and audience — then
          create the project.
        </p>
      ) : null}

      {/* Primary: gallery + live preview */}
      <div className="grid lg:grid-cols-12 gap-5 min-h-[calc(100vh-220px)]">
        <div className="lg:col-span-7 rounded-2xl border border-border glass p-5 space-y-4 order-2 lg:order-1">
          {templatesV1Enabled && onUseTemplate ? (
            <TemplateGallery
              selectedFormat={form.outputFormat}
              busy={busy}
              onUseTemplate={onUseTemplate}
            />
          ) : null}
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
            onReturnToBrief={() => setDetailsOpen(true)}
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

        <div className="lg:col-span-5 rounded-2xl border border-border glass p-5 flex flex-col sticky top-4 self-start order-1 lg:order-2">
          <ConceptLivePreview
            state={previewState}
            form={form}
            brand={selectedBrand}
            concept={selectedConcept}
            imageUrl={
              selectedConcept
                ? conceptImages?.[selectedConcept.conceptId]
                : null
            }
            errorMessage={conceptsError}
          />
        </div>
      </div>

      <ProjectDetailsDrawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        form={form}
        onChange={onChange}
        brands={brands}
        brandsLoading={brandsLoading}
        brandsError={brandsError}
        onRetryBrands={onRetryBrands}
        onSelectBrand={onSelectBrand}
        onCreateBrand={onCreateBrand}
        onEditBrand={onEditBrand}
        onImportBrand={onImportBrand}
        onSaveBrief={onSaveBrief}
        saving={savingBrief}
        projectReady={!!projectId}
      />
    </div>
  );
}
