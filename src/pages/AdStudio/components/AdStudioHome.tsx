import React, { useCallback, useMemo } from "react";
import {
  ArrowRight,
  Clock3,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";
import type { FeaturedExample } from "../lib/exampleCreatives";
import { resolveBrandHomeCatalog } from "../lib/brandHomeCatalog";
import { BrandKitHeaderControl } from "./BrandKitHeaderControl";
import { BrandHomePreview, aspectForFormat } from "./BrandHomePreview";
import { TemplateGallery } from "./TemplateGallery";
import { SceneThumb } from "./SceneThumb";
import {
  AdStudioTopNav,
  scrollAdStudioSection,
  type AdStudioNavId,
} from "./AdStudioTopNav";
import {
  buildBrandAssetUrlMap,
  buildBrandAssetUrlMapByStorageKey,
} from "../canvas/brandAssetUrls";
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

const DEFAULT_HERO_FRAMES = [
  { src: "/ad-studio/sample-assets/w0a-model-editorial.jpg", cls: "w0a-ads-hero__frame--a" },
  { src: "/ad-studio/sample-assets/w0a-product-hero.jpg", cls: "w0a-ads-hero__frame--b" },
  { src: "/ad-studio/sample-assets/w0a-social-story.jpg", cls: "w0a-ads-hero__frame--c" },
  { src: "/ad-studio/sample-assets/w0a-seasonal.jpg", cls: "w0a-ads-hero__frame--d" },
] as const;

const HERO_FRAME_CLS = [
  "w0a-ads-hero__frame--a",
  "w0a-ads-hero__frame--b",
  "w0a-ads-hero__frame--c",
  "w0a-ads-hero__frame--d",
] as const;

/**
 * Hero collage for Home: Brand Kit brief/layout imagery when present,
 * Brand Kit product/model assets as fillers, else Neutral defaults.
 */
function resolveHeroFrames(
  catalog: ReturnType<typeof resolveBrandHomeCatalog>,
  brand: ReturnType<typeof normalizeBrandContext> | null,
): { src: string; cls: string }[] {
  if (catalog.catalogKey === "neutral") {
    return DEFAULT_HERO_FRAMES.map((f) => ({ src: f.src, cls: f.cls }));
  }
  const seen = new Set<string>();
  const srcs: string[] = [];
  const push = (src?: string | null) => {
    const s = (src || "").trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    srcs.push(s);
  };
  for (const ex of catalog.examples) push(ex.previewImage);
  if (brand) {
    push(brand.assets.productUrl);
    push(brand.assets.modelUrl);
  }
  for (const d of DEFAULT_HERO_FRAMES) {
    if (srcs.length >= 4) break;
    push(d.src);
  }
  while (srcs.length < 4) {
    push(DEFAULT_HERO_FRAMES[srcs.length % DEFAULT_HERO_FRAMES.length].src);
  }
  return srcs.slice(0, 4).map((src, i) => ({ src, cls: HERO_FRAME_CLS[i] }));
}

function briefAspect(ex: FeaturedExample) {
  const fmt = ex.briefDefaults.outputFormat || "portrait_1080x1350";
  return aspectForFormat(fmt);
}

export function AdStudioHome({
  projects,
  creatives,
  brands,
  brandsLoading,
  selectedBrandId,
  selectedFormat,
  deletingProjectId = null,
  onSelectBrand,
  onStartIdea,
  onUseExample,
  onContinueProject,
  onDeleteProject,
  onOpenCreative,
  templatesV1Enabled = false,
  templateBusy = false,
  onUseTemplate,
}: Props) {
  const recentProjects = projects.slice(0, 6);
  const recentCreatives = creatives.slice(0, 8);
  const recentCreativeId = recentCreatives[0]?.id ?? null;

  const selectedBrand =
    brands.find((b) => b.id === selectedBrandId) ?? null;
  const brandContext = useMemo(
    () => normalizeBrandContext(selectedBrand),
    [selectedBrand],
  );
  const homeCatalog = useMemo(
    () => resolveBrandHomeCatalog(selectedBrand),
    [selectedBrand],
  );
  const isNeutral = homeCatalog.catalogKey === "neutral";
  const heroFrames = useMemo(
    () => resolveHeroFrames(homeCatalog, brandContext),
    [homeCatalog, brandContext],
  );
  const heroStyle = useMemo(() => {
    if (isNeutral || !brandContext) return undefined;
    const primary = brandContext.colors.primary || "#8b1e3f";
    const secondary = brandContext.colors.secondary || "#0c0d10";
    const accent = brandContext.colors.accent || "#c4a574";
    return {
      ["--w0a-hero-primary" as string]: primary,
      ["--w0a-hero-secondary" as string]: secondary,
      ["--w0a-hero-accent" as string]: accent,
      background: `
        radial-gradient(ellipse 80% 70% at 70% 40%, color-mix(in srgb, ${primary} 42%, transparent), transparent 55%),
        radial-gradient(ellipse 60% 50% at 15% 80%, color-mix(in srgb, ${accent} 28%, transparent), transparent 50%),
        linear-gradient(165deg, ${secondary} 0%, #0c0d10 45%, #10131a 100%)
      `,
    } as React.CSSProperties;
  }, [isNeutral, brandContext]);

  const onSectionNav = useCallback((id: AdStudioNavId) => {
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (id === "concepts") {
      onStartIdea();
      return;
    }
    scrollAdStudioSection(id);
  }, [onStartIdea]);

  return (
    <div className="ad-studio-w0a" id="ad-studio-home">
      <div className="w0a-shell home">
        <AdStudioTopNav
          hideBrand
          active="home"
          onSectionNav={onSectionNav}
          recentCreativeId={recentCreativeId}
          onCreateProject={onStartIdea}
          trailing={
            <BrandKitHeaderControl
              brands={brands}
              selectedId={selectedBrandId}
              loading={brandsLoading}
              onSelect={onSelectBrand}
            />
          }
        />

        <header
          className={`w0a-ads-hero${isNeutral ? "" : " w0a-ads-hero--branded"}`}
          aria-label={isNeutral ? "Ad Studio" : `${homeCatalog.label} Ad Studio`}
          style={heroStyle}
          key={`hero-${homeCatalog.catalogKey}-${selectedBrandId || "neutral"}`}
        >
          <div className="w0a-ads-hero__world" aria-hidden="true">
            {heroFrames.map((f) => (
              <div key={`${f.cls}-${f.src}`} className={`w0a-ads-hero__frame ${f.cls}`}>
                <img
                  src={f.src}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_HERO_FRAMES[0].src;
                  }}
                />
              </div>
            ))}
            <div className="w0a-ads-hero__veil" />
          </div>
          <div className="w0a-ads-hero__copy">
            {!isNeutral && brandContext?.assets.logoUrl ? (
              <img
                className="w0a-ads-hero__kit-logo"
                src={brandContext.assets.logoUrl}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            {!isNeutral ? (
              <p className="w0a-ads-hero__kit-label">{homeCatalog.label}</p>
            ) : null}
            <h1 className="w0a-ads-hero__brand">Ad Studio</h1>
            <p className="w0a-ads-hero__line">
              {isNeutral
                ? "Campaigns that look like they belong in the world."
                : `${homeCatalog.label} templates & example briefs — switch Brand Kit above to reshape this home.`}
            </p>
            <button
              type="button"
              className="w0a-ads-hero__cta"
              onClick={() => scrollAdStudioSection("templates")}
            >
              {isNeutral ? "Enter the gallery" : `Browse ${homeCatalog.label} gallery`}{" "}
              <span>→</span>
            </button>
          </div>
        </header>

        <div className="w0a-home-body">
          <section
            id="ad-studio-projects"
            className="w0a-home-section w0a-home-section--projects-rail"
            aria-labelledby="ad-studio-projects-heading"
          >
            <header className="w0a-section-hero w0a-section-hero--compact">
              <p className="w0a-section-hero__eyebrow">Continue</p>
              <h2 id="ad-studio-projects-heading" className="w0a-section-hero__title">
                Recent projects
              </h2>
            </header>
            {recentProjects.length ? (
              <div className="w0a-project-rail">
                {recentProjects.map((p) => {
                  const deleting = deletingProjectId === p.id;
                  return (
                    <div key={p.id} className="w0a-project-card">
                      <div className="w0a-project-card__icon" aria-hidden>
                        <FolderOpen size={18} />
                      </div>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => onContinueProject(p.id)}
                        className="w0a-project-card__main"
                      >
                        <span className="w0a-project-card__name">{p.name}</span>
                        <span className="w0a-project-card__meta">
                          <Clock3 size={12} />
                          {p.updatedAt
                            ? new Date(p.updatedAt).toLocaleString()
                            : "Open brief & concepts"}
                        </span>
                        <span className="w0a-project-card__cta">
                          Continue <ArrowRight size={14} />
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        aria-label={`Delete project ${p.name}`}
                        onClick={() => onDeleteProject({ id: p.id, name: p.name })}
                        className="w0a-project-card__delete"
                      >
                        {deleting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w0a-project-empty">
                <p className="w0a-meta mb-3">No projects yet — start your first campaign.</p>
                <button
                  type="button"
                  className="w0a-create-project"
                  style={{ margin: "0 auto" }}
                  onClick={onStartIdea}
                >
                  <span className="w0a-create-project__glow" aria-hidden />
                  <Plus size={14} aria-hidden />
                  Create project
                </button>
              </div>
            )}
          </section>

          <section
            id="ad-studio-templates"
            className="w0a-home-section w0a-home-section--templates"
            aria-labelledby="ad-studio-templates-heading"
          >
            <header className="w0a-section-hero">
              <p className="w0a-section-hero__eyebrow">Gallery</p>
              <h2 id="ad-studio-templates-heading" className="w0a-section-hero__title">
                {isNeutral ? "Template studio" : `${homeCatalog.label} templates`}
              </h2>
              <button
                type="button"
                className="w0a-link w0a-section-hero__link"
                onClick={() => scrollAdStudioSection("catalog")}
              >
                View all 10 →
              </button>
            </header>
            <div className="w0a-note">
              {isNeutral
                ? "Each card keeps its layout. Pick 1:1 · 4:5 · 9:16 · 16:9, then Use template — or select a Brand Kit to badge kits on top."
                : `${homeCatalog.label} is badged on each layout (logo · palette · product inset). Layouts stay intact — pick 1:1 · 4:5 · 9:16 · 16:9.`}
            </div>
            {templatesV1Enabled && onUseTemplate ? (
              <TemplateGallery
                key={`templates-${homeCatalog.catalogKey}-${selectedBrandId || "neutral"}`}
                selectedFormat={selectedFormat}
                busy={templateBusy}
                onUseTemplate={onUseTemplate}
                presentation="w0a"
                brandTemplates={homeCatalog.templates}
                catalogLabel={homeCatalog.label}
                brandContext={brandContext}
                catalogKey={homeCatalog.catalogKey}
                hideNote
              />
            ) : (
              <p className="w0a-lede">Templates unlock when template mode is enabled.</p>
            )}
          </section>

          <section
            id="ad-studio-briefs"
            className="w0a-home-section w0a-home-section--briefs"
            aria-labelledby="ad-studio-briefs-heading"
            key={`briefs-${homeCatalog.catalogKey}`}
          >
            <header className="w0a-section-hero">
              <p className="w0a-section-hero__eyebrow">Starting points</p>
              <h2 id="ad-studio-briefs-heading" className="w0a-section-hero__title">
                {isNeutral ? "Example briefs" : `${homeCatalog.label} example briefs`}
              </h2>
              <span className="w0a-section-hero__badge">
                {isNeutral ? "Neutral set" : "Brand Kit set"}
              </span>
            </header>
            <div className="w0a-note">
              {isNeutral
                ? "Ready-made briefs for common campaign types. Open one to seed Concept Gallery — or switch Brand Kit for kit-badged briefs."
                : `${homeCatalog.label} briefs keep their layout art; kit logo, palette, and product inset show on top. Open one to start with this Brand Kit.`}
            </div>
            {homeCatalog.examples.length ? (
              <div className="w0a-grid w0a-grid-3">
                {homeCatalog.examples.map((ex) => {
                  const preview =
                    ex.previewImage ||
                    "/ad-studio/sample-assets/w0a-product-hero.jpg";
                  return (
                    <article key={ex.id} className="w0a-card w0a-rel w0a-brief-card">
                      <span className="w0a-example-tag">Example</span>
                      <BrandHomePreview
                        fallbackSrc={preview}
                        alt=""
                        brand={brandContext}
                        aspect={briefAspect(ex)}
                        headline={ex.headline}
                      />
                      <div className="w0a-card-body">
                        <h3>{ex.title}</h3>
                        <div className="w0a-meta">{ex.category}</div>
                        <p className="text-[11px] text-[var(--w0a-muted)] mt-1 line-clamp-2">
                          {ex.headline}
                        </p>
                        <button
                          type="button"
                          className="w0a-btn ghost"
                          onClick={() => onUseExample(ex)}
                        >
                          Use as starting brief →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="w0a-note">
                No briefs for this kit yet. Neutral templates stay available above.
              </div>
            )}
          </section>

          <section id="ad-studio-library" className="w0a-home-section">
            <div className="w0a-section-title">
              <h2>Recent creatives</h2>
              <span className="w0a-meta">Library</span>
            </div>
            {recentCreatives.length ? (
              <div className="w0a-grid w0a-grid-4">
                {recentCreatives.map((c) => {
                  const graph = c.sceneGraph as AdSceneGraph | null | undefined;
                  const assetUrls = buildBrandAssetUrlMap(selectedBrand);
                  const storageKeyUrls =
                    buildBrandAssetUrlMapByStorageKey(selectedBrand);
                  const badge = c.parentCreativeId
                    ? "Variant"
                    : c.status === "exported"
                      ? "Exported"
                      : "Draft";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="w0a-card"
                      onClick={() => onOpenCreative(c.id)}
                    >
                      <div className="bg-[#222] min-h-[160px] flex items-center justify-center overflow-hidden">
                        {graph?.canvas ? (
                          <SceneThumb
                            graph={graph}
                            maxWidth={220}
                            maxHeight={275}
                            assetUrls={assetUrls}
                            storageKeyUrls={storageKeyUrls}
                          />
                        ) : (
                          <img
                            className="w0a-thumb"
                            src="/ad-studio/sample-assets/w0a-minimal.jpg"
                            alt=""
                          />
                        )}
                      </div>
                      <div className="w0a-card-body">
                        <h3>{c.name}</h3>
                        <div className="w0a-meta">
                          {badge} · v{c.currentVersion ?? 1}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="w0a-lede">
                Editable creatives appear here after you open a template or concept.
              </p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
