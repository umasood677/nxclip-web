import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  FolderOpen,
  Lightbulb,
  Loader2,
  Palette,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { FEATURED_EXAMPLES, type FeaturedExample } from "../lib/exampleCreatives";
import { ExampleCreativeThumb } from "./BriefLivePreview";
import { BrandKitPicker } from "./BrandKitPicker";
import { TemplateGallery } from "./TemplateGallery";
import { SceneThumb } from "./SceneThumb";
import type { AdSceneOutputFormatId, AdStudioTemplateId } from "../canvas/templateCatalog";
import type { AdSceneGraph } from "../types";

export type RecentCreative = {
  id: string;
  name: string;
  projectId?: string;
  currentVersion?: number;
  updatedAt?: string;
  parentCreativeId?: string | null;
  variationType?: string | null;
  sceneGraph?: AdSceneGraph | Record<string, unknown> | null;
  status?: string;
};

type Props = {
  projects: Array<{ id: string; name: string; updatedAt?: string; outputFormat?: string | null }>;
  creatives: RecentCreative[];
  brands: BrandKitSummary[];
  brandsLoading: boolean;
  brandsError?: string | null;
  selectedBrandId: string;
  selectedFormat: string;
  deletingProjectId?: string | null;
  onSelectBrand: (id: string) => void;
  onSelectFormat: (formatId: string) => void;
  onStartIdea: () => void;
  onUseExample: (example: FeaturedExample) => void;
  onContinueProject: (projectId: string) => void;
  onDeleteProject: (project: { id: string; name: string }) => void;
  onOpenCreative: (creativeId: string) => void;
  onCreateBrand: () => void;
  onEditBrand: (kit: BrandKitSummary) => void;
  onImportBrand?: () => void;
  onRetryBrands?: () => void;
  templatesV1Enabled?: boolean;
  templateBusy?: boolean;
  onUseTemplate?: (
    templateId: AdStudioTemplateId,
    format: AdSceneOutputFormatId,
  ) => void;
};

export function AdStudioHome({
  projects,
  creatives,
  brands,
  brandsLoading,
  brandsError,
  selectedBrandId,
  selectedFormat,
  deletingProjectId = null,
  onSelectBrand,
  onStartIdea,
  onUseExample,
  onContinueProject,
  onDeleteProject,
  onOpenCreative,
  onCreateBrand,
  onEditBrand,
  onImportBrand,
  onRetryBrands,
  templatesV1Enabled = false,
  templateBusy = false,
  onUseTemplate,
}: Props) {
  const recentProjects = projects.slice(0, 6);
  const recentCreatives = creatives.slice(0, 8);

  return (
    <div className="space-y-8 pb-10 max-w-[100vw] overflow-x-hidden">
      {/* World-of-ads hero — W0A baseline */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border min-h-[min(72vh,560px)]"
        aria-label="Ad Studio"
      >
        <div className="pointer-events-none absolute inset-0 bg-[#0c0d10]">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 70% 40%, rgba(139,30,63,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 15% 80%, rgba(196,165,116,0.18), transparent 50%)",
            }}
          />
          <img
            src="/ad-studio/sample-assets/w0a-model-editorial.jpg"
            alt=""
            className="absolute w-[min(22vw,200px)] aspect-[4/5] object-cover rounded-lg shadow-2xl opacity-90 -rotate-6 top-[12%] left-[6%] border border-white/10"
          />
          <img
            src="/ad-studio/sample-assets/w0a-product-hero.jpg"
            alt=""
            className="absolute w-[min(18vw,168px)] aspect-[4/5] object-cover rounded-lg shadow-2xl opacity-90 rotate-6 top-[16%] right-[8%] border border-white/10"
          />
          <img
            src="/ad-studio/sample-assets/w0a-social-story.jpg"
            alt=""
            className="absolute w-[min(14vw,128px)] aspect-[9/16] object-cover rounded-lg shadow-2xl opacity-85 rotate-3 bottom-[10%] left-[16%] border border-white/10 hidden sm:block"
          />
          <img
            src="/ad-studio/sample-assets/w0a-seasonal.jpg"
            alt=""
            className="absolute w-[min(16vw,148px)] aspect-[4/5] object-cover rounded-lg shadow-2xl opacity-85 -rotate-3 bottom-[8%] right-[14%] border border-white/10"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(12,13,16,0.88) 0%, rgba(12,13,16,0.4) 45%, rgba(12,13,16,0.65) 100%), linear-gradient(180deg, rgba(12,13,16,0.15) 0%, transparent 35%, rgba(12,13,16,0.8) 100%)",
            }}
          />
        </div>
        <div className="relative z-[1] flex flex-col justify-end min-h-[min(72vh,560px)] p-6 sm:p-8 md:p-10">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[0.95] max-w-[12ch]">
            Ad Studio
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/65 max-w-[28ch]">
            Campaigns that look like they belong in the world.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              className="rounded-full bg-white text-neutral-900 hover:bg-white/90"
              onClick={onStartIdea}
            >
              <Lightbulb size={16} className="mr-2" aria-hidden />
              Start from an idea
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-white/5 text-white hover:bg-white/10"
              onClick={onCreateBrand}
            >
              <Palette size={16} className="mr-2" aria-hidden />
              Brand Kit
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="rounded-full text-white/80 hover:text-white hover:bg-white/10"
              asChild
            >
              <Link to="/brands">Manage kits</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border glass p-4 md:p-5">
        <BrandKitPicker
          brands={brands}
          selectedId={selectedBrandId}
          loading={brandsLoading}
          error={brandsError}
          onSelect={onSelectBrand}
          onCreate={onCreateBrand}
          onEdit={onEditBrand}
          onImport={onImportBrand}
          onRetry={onRetryBrands}
        />
      </section>

      {templatesV1Enabled && onUseTemplate ? (
        <TemplateGallery
          selectedFormat={selectedFormat}
          busy={templateBusy}
          onUseTemplate={onUseTemplate}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Example briefs</h2>
          <Badge variant="outline" className="text-[10px]">
            Example
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {FEATURED_EXAMPLES.map((ex) => (
            <ExampleCreativeThumb
              key={ex.id}
              headline={ex.headline}
              supporting={ex.supporting}
              cta={ex.cta}
              theme={ex.theme}
              label={ex.category}
              previewImage={ex.previewImage}
              title={ex.title}
              onClick={() => onUseExample(ex)}
            />
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Recent projects</h2>
          </div>
          {recentProjects.length ? (
            <div className="space-y-2">
              {recentProjects.map((p) => {
                const deleting = deletingProjectId === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-stretch gap-1 rounded-xl border border-border hover:border-primary/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onContinueProject(p.id)}
                      disabled={deleting}
                      className="min-w-0 flex-1 flex items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock3 size={11} />
                          {p.updatedAt
                            ? new Date(p.updatedAt).toLocaleString()
                            : "Open brief & concepts"}
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-auto w-10 shrink-0 rounded-none rounded-r-xl text-muted-foreground hover:text-destructive"
                      disabled={deleting}
                      aria-label={`Delete project ${p.name}`}
                      onClick={() => onDeleteProject({ id: p.id, name: p.name })}
                    >
                      {deleting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No projects yet.
              <div className="mt-3">
                <Button type="button" onClick={onStartIdea}>
                  <Sparkles size={14} className="mr-1" /> Create first project
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Recent creatives</h2>
          </div>
          {recentCreatives.length ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {recentCreatives.map((c) => {
                const graph = c.sceneGraph as AdSceneGraph | null | undefined;
                const badge = c.parentCreativeId
                  ? "Variant"
                  : c.status === "exported"
                    ? "Exported"
                    : "Draft";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenCreative(c.id)}
                    className="rounded-xl border border-border p-2 text-left hover:border-primary/40 transition-colors"
                  >
                    <div className="mb-2 flex justify-center rounded-lg overflow-hidden bg-muted/40 border border-border min-h-[140px] items-center">
                      {graph?.canvas ? (
                        <SceneThumb graph={graph} maxWidth={140} maxHeight={175} />
                      ) : (
                        <div className="aspect-[4/5] w-full max-w-[140px] bg-muted/60 flex items-center justify-center text-[10px] text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="px-1">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {badge} · v{c.currentVersion ?? 1}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Editable creatives appear here after you open a template or concept.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
