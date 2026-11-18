import { Link, useSearchParams } from "react-router-dom";
import { brandApi } from "../../../services/apiClient";
import {
  SavedBrandTemplates,
  useSavedBrandTemplates,
} from "./SavedBrandTemplates";
import { homeBannerTemplates, reusableHomeTemplates, scopedHomeProjects } from "../lib/homeEntryFlow";
import { useCreativeAssetUrls } from "../canvas/useCreativeAssetUrls";
import { BrandTemplateScenePreview } from "../../BrandKits/templates/BrandTemplateScenePreview";
import { reviewImageUrls } from "../../BrandKits/templates/reviewMediaLoading";
import { templateImageIds, useTemplateAssetUrls } from "../../BrandKits/templates/useTemplateAssetUrls";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Clock3,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";
import type { FeaturedExample } from "../lib/exampleCreatives";
import { publishedExampleBriefs } from "../lib/publishedExampleBriefs";
import { resolveBrandHomeCatalog } from "../lib/brandHomeCatalog";
import { BrandKitHeaderControl } from "./BrandKitHeaderControl";
import { BrandHomePreview } from "./BrandHomePreview";
import { TemplateGallery, formatChip } from "./TemplateGallery";
import { AD_FORMATS } from "../types";

import type {
  AdSceneOutputFormatId,
  AdStudioTemplateId,
} from "../canvas/templateCatalog";
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
  projects: Array<{
    id: string;
    name: string;
    updatedAt?: string;
    outputFormat?: string | null;
    brandKitId?: string | null;
  }>;
  brands: BrandKitSummary[];
  brandsLoading: boolean;
  brandsError?: string | null;
  selectedBrandId: string;
  selectedFormat: string;
  deletingProjectId?: string | null;
  onSelectBrand: (id: string) => void;
  onSelectFormat: (formatId: string) => void;
  onStartIdea: () => void;
  onUseExample: (example: FeaturedExample, format?: string) => void;
  onContinueProject: (projectId: string) => void;
  onDeleteProject: (project: { id: string; name: string }) => void;
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
  {
    src: "/ad-studio/sample-assets/w0a-model-editorial.jpg",
    cls: "w0a-ads-hero__frame--a",
  },
  {
    src: "/ad-studio/sample-assets/w0a-product-hero.jpg",
    cls: "w0a-ads-hero__frame--b",
  },
  {
    src: "/ad-studio/sample-assets/w0a-social-story.jpg",
    cls: "w0a-ads-hero__frame--c",
  },
  {
    src: "/ad-studio/sample-assets/w0a-seasonal.jpg",
    cls: "w0a-ads-hero__frame--d",
  },
] as const;

const HERO_FRAME_CLS = [
  "w0a-ads-hero__frame--a",
  "w0a-ads-hero__frame--b",
  "w0a-ads-hero__frame--c",
  "w0a-ads-hero__frame--d",
  "w0a-ads-hero__frame--e",
  "w0a-ads-hero__frame--f",
] as const;

export function AdStudioHome({
  projects,
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
  templatesV1Enabled = false,
  templateBusy = false,
  onUseTemplate,
}: Props) {
  const [briefFormats, setBriefFormats] = useState<Record<string, string>>({});
  const [catalogQuery] = useSearchParams();
  const fullCatalog = catalogQuery.get("catalog");
  const templatesOnly = fullCatalog === "templates",
    briefsOnly = fullCatalog === "briefs",
    projectsOnly = fullCatalog === "projects";
  const catalogTitle = templatesOnly ? "Default Templates"
    : briefsOnly ? "Example Brief Library"
    : projectsOnly ? "All Projects" : null;
  const brandProjects = scopedHomeProjects(projects, selectedBrandId);
  const showAllProjects = catalogQuery.get("projects") === "all";
  const scopedProjects = showAllProjects ? projects : brandProjects;
  const recentProjects = projectsOnly ? projects : scopedProjects.slice(0, 10);
  const projectScopeQuery = new URLSearchParams(catalogQuery);
  if (showAllProjects) projectScopeQuery.delete("projects");
  else projectScopeQuery.set("projects", "all");
  const [ownedKit, setOwnedKit] = useState<BrandKitSummary | null>(null);
  const [brandLoadError, setBrandLoadError] = useState("");
  useEffect(() => {
    let active = true;
    setOwnedKit(null);
    setBrandLoadError("");
    if (selectedBrandId)
      void brandApi
        .getKit(selectedBrandId)
        .then((kit) => {
          if (active && kit.id === selectedBrandId) setOwnedKit(kit);
        })
        .catch(() => {
          if (active)
            setBrandLoadError(
              "Brand assets could not load. Select the Brand Kit again to retry.",
            );
        });
    return () => {
      active = false;
    };
  }, [selectedBrandId]);
  const selectedBrand =
    ownedKit?.id === selectedBrandId
      ? ownedKit
      : (brands.find((brand) => brand.id === selectedBrandId) ?? null);
  const brandContext = useMemo(
    () => normalizeBrandContext(selectedBrand),
    [selectedBrand],
  );
  const nativeTemplates = useSavedBrandTemplates(selectedBrandId);
  const homeCatalog = useMemo(
    () => resolveBrandHomeCatalog(selectedBrand),
    [selectedBrand],
  );
  const isNeutral = !selectedBrandId;
  const heroTemplates = templatesOnly || briefsOnly || projectsOnly ? [] : homeBannerTemplates(nativeTemplates.items, selectedBrandId).slice(0, HERO_FRAME_CLS.length);
  const reusable = reusableHomeTemplates(nativeTemplates.items, selectedBrandId);
  const galleryTemplates = reusable.length ? reusable : nativeTemplates.items.filter(template =>
    !template.deletion && (template.state === "suggested" || template.state === "approved"));
  const heroImageIds = templateImageIds(heroTemplates.map(template => template.sceneGraph));
  const galleryImageIds = catalogTitle ? [] : templateImageIds(
    galleryTemplates.slice(0, 6).map(template => template.sceneGraph),
  );
  const assetUrls = useTemplateAssetUrls(selectedBrand, galleryImageIds);
  const heroBrandMedia = useTemplateAssetUrls(selectedBrand, heroImageIds);
  const heroMedia = useCreativeAssetUrls(heroTemplates.flatMap(template =>
    template.provenance.sourceCreativeId ? [template.provenance.sourceCreativeId] : []), heroImageIds);
  const heroUrls = { ...heroBrandMedia, ...heroMedia };
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

  return (
    <div className="ad-studio-w0a" id="ad-studio-home">
      <div className="w0a-shell home">
        {brandLoadError && (
          <p role="alert" className="w0a-note">
            {brandLoadError}
          </p>
        )}
        <header
          hidden={templatesOnly || briefsOnly || projectsOnly}
          className={`w0a-ads-hero${isNeutral ? "" : " w0a-ads-hero--branded"}`}
          aria-label={
            isNeutral ? "Ad Studio" : `${homeCatalog.label} Ad Studio`
          }
          style={heroStyle}
          key={`hero-${homeCatalog.catalogKey}-${selectedBrandId || "neutral"}`}
        >
          <div className="w0a-ads-hero__world" aria-hidden="true">
            {isNeutral && DEFAULT_HERO_FRAMES.map((f) => (
              <div
                key={`${f.cls}-${f.src}`}
                className={`w0a-ads-hero__frame ${f.cls}`}
              >
                <img
                  src={f.src}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_HERO_FRAMES[0].src;
                  }}
                />
              </div>
            ))}
            {!isNeutral && heroTemplates.map((template, index) => reviewImageUrls(template.sceneGraph, heroUrls) !== null && (
              <div key={template.id} className={`w0a-ads-hero__frame ${HERO_FRAME_CLS[index]}`}
                style={{ aspectRatio: `${template.sceneGraph.canvas.width} / ${template.sceneGraph.canvas.height}` }}>
                <BrandTemplateScenePreview graph={template.sceneGraph} assetUrls={heroUrls} size="card" fillCard readablePlaceholder />
              </div>
            ))}
            <div className="w0a-ads-hero__veil" />
          </div>
          <div className="w0a-ads-hero__copy">
            {!isNeutral ? (
              <p className="w0a-ads-hero__kit-label">{homeCatalog.label}</p>
            ) : null}
            <h1 className="w0a-ads-hero__brand">Ad Studio</h1>
            <p className="w0a-ads-hero__line">
              Campaigns that look like they belong in the world.
            </p>
            <div className="w0a-hero-actions">
              <BrandKitHeaderControl
                brands={brands}
                selectedId={selectedBrandId}
                loading={brandsLoading}
                onSelect={onSelectBrand}
              />
              <button
                type="button"
                className="w0a-create-project"
                onClick={onStartIdea}
              >
                <Plus size={16} aria-hidden />
                Create project
              </button>
            </div>
          </div>
        </header>

        <div className={`w0a-home-body${catalogTitle ? " w0a-home-body--catalog" : ""}${templatesOnly ? " w0a-home-body--default-templates" : ""}`}>
          {catalogTitle && <nav className="bo-breadcrumb" aria-label="Breadcrumb">
            <Link to="/create/ad"><ArrowLeft size={15} aria-hidden="true" /> Ad Studio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{catalogTitle}</span>
          </nav>}
          <section
            hidden={templatesOnly || briefsOnly}
            id="ad-studio-projects"
            className="w0a-home-section w0a-home-section--projects-rail"
            aria-label={projectsOnly ? "All Projects" : "Recent projects"}
          >
            {!projectsOnly && <header className="w0a-section-hero w0a-section-hero--compact">
              <p className="w0a-section-hero__eyebrow">Continue</p>
              <h2
                id="ad-studio-projects-heading"
                className="w0a-section-hero__title"
              >
                Recent projects
              </h2>
              {scopedProjects.length > 10 ? (
                <Link className="w0a-link w0a-section-hero__link" to="/create/ad?catalog=projects">All Projects &rarr;</Link>
              ) : (showAllProjects || projects.length > brandProjects.length) && (
                <Link className="w0a-link w0a-section-hero__link" to={{ search: projectScopeQuery.toString() }}>
                  {showAllProjects ? "Show current Brand Kit projects" : "Show all campaigns"}
                </Link>
              )}
            </header>}
            {recentProjects.length ? (
              <div className={projectsOnly ? "w0a-project-grid" : "w0a-project-rail"}>
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
                        title={p.name}
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
                        onClick={() =>
                          onDeleteProject({ id: p.id, name: p.name })
                        }
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
                <p className="w0a-meta mb-3">
                  {projects.length ? "No campaigns in this Brand Kit view." : "No projects yet. Start your first campaign."}
                </p>
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
            hidden={briefsOnly || projectsOnly}
            id="ad-studio-templates"
            className="w0a-home-section w0a-home-section--templates"
            aria-label={templatesOnly ? "Default Templates" : undefined}
            aria-labelledby={templatesOnly ? undefined : "ad-studio-templates-heading"}
          >
            {!templatesOnly && <header className="w0a-section-hero">
              <p className="w0a-section-hero__eyebrow">Gallery</p>
              <h2
                id="ad-studio-templates-heading"
                className="w0a-section-hero__title"
              >
                {isNeutral
                  ? "Template studio"
                  : `${homeCatalog.label} templates`}
              </h2>
              <Link
                className="w0a-link w0a-section-hero__link"
                to={
                  selectedBrandId
                    ? `/brands/${encodeURIComponent(selectedBrandId)}/templates`
                    : "/create/ad?catalog=templates"
                }
              >
                All Templates &rarr;
              </Link>
            </header>}
            {selectedBrandId && !templatesOnly ? (
              <SavedBrandTemplates
                limit={6}
                brandId={selectedBrandId}
                data={nativeTemplates}
                assetUrls={assetUrls}
              />
            ) : templatesV1Enabled && onUseTemplate ? (
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
                limit={templatesOnly ? undefined : 6}
              />
            ) : (
              <p className="w0a-lede">
                Templates unlock when template mode is enabled.
              </p>
            )}
          </section>

          <section
            hidden={templatesOnly || projectsOnly}
            id="ad-studio-briefs"
            className="w0a-home-section w0a-home-section--briefs"
            aria-label="Example Briefs"
            key={`briefs-${homeCatalog.catalogKey}`}
          >
            {!briefsOnly && <header className="w0a-section-hero">
              <p className="w0a-section-hero__eyebrow">Starting points</p>
              <h2
                id="ad-studio-briefs-heading"
                className="w0a-section-hero__title"
              >
                {isNeutral
                  ? "Example briefs"
                  : `${homeCatalog.label} example briefs`}
              </h2>
                <Link
                  className="w0a-link w0a-section-hero__link"
                  to="/create/ad?catalog=briefs"
                >
                  All Example Briefs &rarr;
                </Link>
            </header>}
            {publishedExampleBriefs.length ? (
              <div className="w0a-grid w0a-grid-3">
                {publishedExampleBriefs
                  .slice(0, briefsOnly ? undefined : 6)
                  .map((ex) => {
                    const formatKey = `${selectedBrandId || "default"}/${ex.id}`;
                    const format =
                      briefFormats[formatKey] || ex.briefDefaults.outputFormat || "portrait_1080x1350";
                    const preview =
                      ex.previewImage ||
                      "/ad-studio/sample-assets/w0a-product-hero.jpg";
                    return (
                      <article
                        key={ex.id}
                        className="w0a-card w0a-rel w0a-brief-card"
                      >
                        <BrandHomePreview
                          fallbackSrc={preview}
                          alt=""
                        />
                        <div className="w0a-card-body">
                          <h3>{ex.title}</h3>
                          <div className="w0a-meta">
                            {ex.category} · Illustrative reference
                          </div>
                          <p className="text-[11px] text-[var(--w0a-muted)] mt-1 line-clamp-2">
                            {ex.headline}
                          </p>
                          <div
                            className="w0a-formats"
                            role="group"
                            aria-label={`Aspect ratio for ${ex.title}`}
                          >
                            {AD_FORMATS.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                className={`w0a-chip${format === option.id ? " on" : ""}`}
                                aria-pressed={format === option.id}
                                onClick={() =>
                                  setBriefFormats((current) => ({
                                    ...current,
                                    [formatKey]: option.id,
                                  }))
                                }
                              >
                                {formatChip(option.id)}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="w0a-btn ghost"
                            onClick={() => onUseExample(ex, format)}
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
                No briefs for this kit yet. Neutral templates stay available
                above.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
