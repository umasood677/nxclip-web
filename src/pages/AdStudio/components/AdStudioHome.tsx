import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  FolderOpen,
  Lightbulb,
  Megaphone,
  Palette,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { AD_FORMATS } from "../types";
import { FEATURED_EXAMPLES, type FeaturedExample } from "../lib/exampleCreatives";
import { ExampleCreativeThumb } from "./BriefLivePreview";
import { BrandKitPicker } from "./BrandKitPicker";

export type RecentCreative = {
  id: string;
  name: string;
  projectId?: string;
  currentVersion?: number;
  updatedAt?: string;
};

type Props = {
  projects: Array<{ id: string; name: string; updatedAt?: string; outputFormat?: string | null }>;
  creatives: RecentCreative[];
  brands: BrandKitSummary[];
  brandsLoading: boolean;
  brandsError?: string | null;
  selectedBrandId: string;
  selectedFormat: string;
  onSelectBrand: (id: string) => void;
  onSelectFormat: (formatId: string) => void;
  onStartIdea: () => void;
  onUseExample: (example: FeaturedExample) => void;
  onContinueProject: (projectId: string) => void;
  onOpenCreative: (creativeId: string) => void;
  onCreateBrand: () => void;
  onEditBrand: (kit: BrandKitSummary) => void;
  onImportBrand?: () => void;
  onRetryBrands?: () => void;
};

export function AdStudioHome({
  projects,
  creatives,
  brands,
  brandsLoading,
  brandsError,
  selectedBrandId,
  selectedFormat,
  onSelectBrand,
  onSelectFormat,
  onStartIdea,
  onUseExample,
  onContinueProject,
  onOpenCreative,
  onCreateBrand,
  onEditBrand,
  onImportBrand,
  onRetryBrands,
}: Props) {
  const recentProjects = projects.slice(0, 6);
  const recentCreatives = creatives.slice(0, 6);

  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border glass p-6 md:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 55%), radial-gradient(ellipse at 100% 100%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 45%)",
          }}
        />
        <div className="relative grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Megaphone size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                Static Ad Studio
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground leading-[1.1]">
              Create advertising that looks intentional — not like a form.
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              Start from an idea or a polished example, attach your Brand Kit, and shape a brief
              with a live sample preview before you generate concepts.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="lg" onClick={onStartIdea}>
                <Lightbulb size={16} className="mr-2" />
                Start from an idea
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={onCreateBrand}>
                <Palette size={16} className="mr-2" />
                Brand Kit
              </Button>
              <Button type="button" size="lg" variant="ghost" asChild>
                <Link to="/brands">Manage kits</Link>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick aspect ratio
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AD_FORMATS.map((f) => {
                  const selected = selectedFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onSelectFormat(f.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-sm border border-border/80 bg-muted/40"
                          style={{
                            width: f.width > f.height ? 28 : f.width === f.height ? 18 : 14,
                            height: f.height > f.width ? 28 : f.width === f.height ? 18 : 18,
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium">{f.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {f.width}×{f.height}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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

      {/* Featured examples */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Start from a template</h2>
            <p className="text-xs text-muted-foreground">
              Professionally designed examples — not your projects, not AI output.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Examples
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {FEATURED_EXAMPLES.map((ex) => (
            <ExampleCreativeThumb
              key={ex.id}
              headline={ex.headline}
              supporting={ex.supporting}
              cta={ex.cta}
              theme={ex.theme}
              label={ex.category}
              onClick={() => onUseExample(ex)}
            />
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent projects */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Continue recent project</h2>
          </div>
          {recentProjects.length ? (
            <div className="space-y-2">
              {recentProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onContinueProject(p.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary/40 transition-colors"
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
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No projects yet. Start from an idea to create your first campaign.
              <div className="mt-3">
                <Button type="button" onClick={onStartIdea}>
                  <Sparkles size={14} className="mr-1" /> Create first project
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Recent creatives */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Recent creatives</h2>
          </div>
          {recentCreatives.length ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {recentCreatives.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenCreative(c.id)}
                  className="rounded-xl border border-border px-3 py-3 text-left hover:border-primary/40 transition-colors"
                >
                  <div className="aspect-[4/5] rounded-lg bg-muted/60 border border-border mb-2 flex items-center justify-center text-[10px] text-muted-foreground">
                    Editable creative
                  </div>
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    v{c.currentVersion ?? 1}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Your editable creatives will appear here after you open a concept in the canvas.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
