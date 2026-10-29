import { BrandHomePreview } from "../components/BrandHomePreview";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";
import { buildBrandAssetUrlMapByStorageKey } from "../canvas/brandAssetUrls";
import {
  SavedBrandTemplates,
  useSavedBrandTemplates,
} from "../components/SavedBrandTemplates";
import { Plus as CreatePlus } from "lucide-react";
import { ProductionImageGeneration } from "./ProductionImageGeneration";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, FolderOpen, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "../../../components/common/EmptyState";
import { Skeleton } from "../../../components/ui/skeleton";
import { SceneStage } from "../canvas/SceneStage";
import { TemplateGallery } from "../components/TemplateGallery";
import { ProjectCreativeGallery } from "../components/ProjectCreativeGallery";
import { ExportPanel } from "../components/ExportPanel";
import { composeTemplatePreview } from "../canvas/composeTemplateScene";
import { TEMPLATE_CATALOG_V1 } from "../canvas/templateCatalog";
import { AD_FORMATS, type AdConcept } from "../types";
import {
  creativeEditorPath,
  exampleBriefForm,
  projectBriefForm,
} from "../lib/projectWorkspace";
import {
  EXPERIENCE_TITLES,
  parseExperienceScreen,
  projectExperiencePath,
  type AdStudioExperienceScreen,
} from "./experienceRoutes";
import type { AdProjectWorkspaceController } from "./useAdProjectWorkspace";
import { characterReviewIssues } from "../../BrandKits/guided/brandCharacterModel";
import { ProductionCreativeDirector } from "./ProductionCreativeDirector";
import { ProductionCreativeExtensions } from "./ProductionCreativeExtensions";
import "../uxPreview/preview.css";
import "../uxPreview/roadmap.css";
import "../styles/production-theme.css";
import "../../BrandKits/guided/guidedBrand.css";

/** Approved presentation over the existing project controller; no second editor or persistence engine. */
export default function ProductionProjectWorkspace({
  controller: c,
}: {
  controller: AdProjectWorkspaceController;
}) {
  const storageKeyUrls = useMemo(
    () =>
      buildBrandAssetUrlMapByStorageKey(
        c.brand
          ? {
              ...c.brand,
              assets: c.brand.assets?.map((asset) => ({
                ...asset,
                readUrl: c.assetUrls[asset.id] || null,
              })),
            }
          : null,
      ),
    [c.brand, c.assetUrls],
  );
  const [query] = useSearchParams(),
    screen = parseExperienceScreen(query.get("view")),
    title = useRef<HTMLHeadingElement>(null);
  const savedBrandTemplates = useSavedBrandTemplates(
    screen === "templates" ? c.project?.brandKitId || "" : "",
  );
  const brandVisual = useMemo(
    () =>
      c.brand
        ? normalizeBrandContext({
            ...c.brand,
            assets: c.brand.assets?.map((a) => ({
              ...a,
              readUrl: c.assetUrls[a.id] || null,
            })),
          })
        : null,
    [c.brand, c.assetUrls],
  );
  const [comparison, setComparison] = useState<string[]>([]);
  const concept =
    c.concepts.find((item) => item.conceptId === query.get("concept")) ||
    c.concepts.find((item) => item.conceptId === c.selectedConceptId) ||
    c.concepts[0];
  const creative = c.creatives.find(
    (item) => item.id === query.get("creative"),
  );
  const template = TEMPLATE_CATALOG_V1.find(
    (item) => item.templateId === query.get("template"),
  );
  const go = (
    next: AdStudioExperienceScreen,
    selection?: {
      conceptId?: string;
      creativeId?: string;
      templateId?: string;
    },
  ) => c.navigate(projectExperiencePath(c.projectId, next, selection));
  useEffect(() => {
    title.current?.focus();
  }, [screen]);
  useEffect(() => {
    if (screen === "brief") c.setCompose(true);
  }, [screen, c.setCompose]);
  const bindingBrand = useMemo(() => {
    if (!c.brand) return null;
    const approved = new Set(c.brand.voice?.studio?.approvedAssetIds ?? []);
    const modelRefs = new Set(
      (c.brand.voice?.studio?.characters ?? [])
        .filter(
          (profile) =>
            profile.status === "approved" &&
            profile.permissions.scopes.includes("ad-studio") &&
            !characterReviewIssues(profile, c.brand!.assets ?? []).length,
        )
        .flatMap((profile) => profile.referenceAssetIds),
    );
    return {
      ...c.brand,
      assets: (c.brand.assets ?? []).filter(
        (a) =>
          approved.has(a.id) &&
          a.status === "ready" &&
          (a.role !== "brand_model" || modelRefs.has(a.id)),
      ),
    };
  }, [c.brand]);
  const templatePreview = useMemo(() => {
    if (!template) return null;
    const input: AdConcept = {
      conceptId: "native-preview",
      title: template.name,
      creativeDirection: c.form.creativeDirection || "",
      primaryHeadline: c.form.coreMessage,
      supportingCopy: c.form.productOrService,
      cta: c.form.cta,
      visualPrompt: "",
      composition: "",
      templateId: template.templateId,
      colorRecommendations: [],
      typographyRecommendations: [],
      platformSuitability: [],
    };
    return composeTemplatePreview({
      concept: input,
      brand: bindingBrand,
      outputFormat: c.form.outputFormat,
    });
  }, [template, bindingBrand, c.form]);
  if (c.loading)
    return (
      <main
        className="xp-root nxclip-production bp-guided-root"
        aria-busy="true"
      >
        <div className="xp-main">
          <Skeleton className="h-16 w-2/3" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </main>
    );
  if (!c.project)
    return (
      <EmptyState
        title="Project unavailable"
        description={c.error || "The owned project could not be opened."}
        actionLabel="Retry"
        onAction={() => void c.load()}
      />
    );
  const project = c.project;
  const editBrief = () => {
    if (!c.compose) {
      const restored = projectBriefForm(project);
      c.setForm(restored);
      c.setSavedForm(JSON.stringify(restored));
    }
    c.setCompose(true);
    go("brief");
  };
  const saveBrief = () =>
    void c.run(async () => {
      await c.saveBrief({ allowCampaignIdeaEdit: true });
      toast.success("Working Brief saved");
    });
  const field = (
    label: string,
    key:
      | "campaignIdea"
      | "exampleObjective"
      | "creativeDirection"
      | "productCategory"
      | "productOrService"
      | "coreMessage"
      | "targetAudience"
      | "desiredTone"
      | "cta"
      | "name",
    multiline = false,
  ) => (
    <label className="xp-field">
      {label}
      {multiline ? (
        <textarea
          value={c.form[key] || ""}
          maxLength={key === "campaignIdea" ? 4000 : 2000}
          onChange={(e) =>
            c.setForm((old) => ({
              ...old,
              [key]: e.target.value,
              brandKitId: project.brandKitId ?? "",
            }))
          }
        />
      ) : (
        <input
          value={c.form[key] || ""}
          maxLength={key === "name" ? 160 : 500}
          onChange={(e) =>
            c.setForm((old) => ({
              ...old,
              [key]: e.target.value,
              brandKitId: project.brandKitId ?? "",
            }))
          }
        />
      )}
    </label>
  );
  const generateDirections = async () => {
    if (await c.generateConcepts()) go("concepts");
  };
  const selectConcept = (id: string) => {
    c.setSelectedConceptId(id);
    go("detail", { conceptId: id });
  };
  const savedPreview = creative ? (
    <SceneStage
      graph={creative.sceneGraph}
      assetUrls={c.assetUrls}
      size="hero"
      showSafeArea
    />
  ) : (
    <EmptyState
      title="Choose a saved creative"
      description="Your project gallery contains the actual persisted advertisements. No demonstration creative is substituted."
      actionLabel="Open workspace"
      onAction={() => go("workspace")}
    />
  );
  const concepts = (
    <>
      {!c.concepts.length ? (
        <EmptyState
          title="Your creative direction starts with a brief"
          description="Save your Working Brief and generate campaign directions. Concepts are planning proposals; image generation is a separate step. Provider provenance is shown on each result."
          actionLabel={
            c.busy ? "Generating directions..." : "Generate from Working Brief"
          }
          onAction={() => {
            if (!c.busy) void generateDirections();
          }}
        />
      ) : (
        <div className="xp-gallery">
          {c.concepts.map((item) => (
            <article className="xp-creative" key={item.conceptId}>
              {item.sceneGraph ? (
                <SceneStage graph={item.sceneGraph} assetUrls={c.assetUrls} />
              ) : (
                <div className="xp-panel">
                  <span className="xp-kicker">
                    CREATIVE DIRECTION / VISUAL NOT GENERATED
                  </span>
                  <h2>{item.primaryHeadline}</h2>
                  <p>{item.creativeDirection}</p>
                </div>
              )}
              <div className="xp-card-copy">
                <span className="xp-status">
                  {c.source || "Saved concept; provenance not supplied"}
                </span>
                <h3>{item.title}</h3>
                <p>{item.supportingCopy}</p>
                <button
                  className="xp-primary"
                  onClick={() => selectConcept(item.conceptId)}
                >
                  Review concept <ArrowRight size={14} />
                </button>
                <label className="xp-check">
                  <input
                    type="checkbox"
                    checked={comparison.includes(item.conceptId)}
                    onChange={(e) =>
                      setComparison((current) =>
                        e.target.checked
                          ? [...current, item.conceptId]
                          : current.filter((id) => id !== item.conceptId),
                      )
                    }
                  />
                  Compare direction
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
  return (
    <div className="xp-root nxclip-production bp-guided-root">
      <main className="xp-main">
        <div className="xp-page-heading">
          <div>
            <div className="xp-inline xp-breadcrumb">
              <button
                onClick={() => go("workspace")}
                aria-label="Back to project"
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                {project.brandKitName || c.brand?.name || "DEFAULT BRAND"} /{" "}
                {project.name}
              </span>
            </div>
            <h1 tabIndex={-1} ref={title}>
              {EXPERIENCE_TITLES[screen] || "Your Ad Studio workspace."}
            </h1>
          </div>
          <button className="xp-secondary" onClick={() => go("workspace")}>
            <FolderOpen size={15} /> Workspace
          </button>
        </div>
        <nav className="bp-workspace-nav" aria-label="Campaign workspace">
          <button className="xp-secondary" onClick={editBrief}>
            Working Brief
          </button>
          <button className="xp-secondary" onClick={() => go("templates")}>
            Visual Templates
          </button>
          <button className="xp-secondary" onClick={() => go("concepts")}>
            Concept Gallery
          </button>
          <button className="xp-secondary" onClick={() => go("director")}>
            Creative Director
          </button>
          {project.brandKitId && (
            <Link
              className="xp-secondary"
              to={"/brands/" + project.brandKitId + "/guided?step=ready"}
            >
              Brand intelligence
            </Link>
          )}
        </nav>
        {project.brandKitId && c.brand && (
          <section
            className="bp-campaign-brand"
            aria-label="Campaign Brand Kit"
          >
            <div>
              {brandVisual?.assets.logoUrl && (
                <img src={brandVisual.assets.logoUrl} alt="" />
              )}
              <strong>{c.brand.name}</strong>
              <small>
                Version {c.brand.version || 1} / {c.brand.assets?.length || 0}{" "}
                uploaded assets / {bindingBrand?.assets?.length || 0} approved
                sources
              </small>
            </div>
            <div className="bp-brand-swatches">
              {(c.brand.colors || []).slice(0, 5).map((color, i) => (
                <span
                  key={i}
                  title={`${color.role}: ${color.hex}`}
                  style={{ background: color.hex }}
                />
              ))}
            </div>
            <Link
              className="xp-secondary"
              to={`/brands/${encodeURIComponent(c.brand.id)}/guided?step=ready`}
            >
              Review Brand Kit
            </Link>
          </section>
        )}
        {c.error && (
          <p className="xp-notice" role="alert">
            {c.error}
          </p>
        )}
        {c.conceptError && (
          <p className="xp-notice" role="status">
            {c.conceptError}
          </p>
        )}
        {c.draftDirty && (
          <p className="xp-status">
            Unsaved Working Brief changes are retained across project screens.
          </p>
        )}
        {c.busy && (
          <div role="status" className="xp-notice">
            <Skeleton className="h-10 w-full" />
            Waiting for the actual application response…
          </div>
        )}
        {(screen === "workspace" || screen === "campaign-manager") && (
          <>
            <div className="xp-campaign-summary">
              <div>
                <span className="xp-kicker">CAMPAIGN IDEA</span>
                <h2>
                  {project.brief?.campaignIdea ||
                    project.brief?.coreMessage ||
                    "Your campaign, ready for a point of view."}
                </h2>
                <p>{project.brief?.productOrService}</p>
              </div>
              <div>
                <span className="xp-status">
                  Saved project · {project.status || "draft"}
                </span>
                <p>
                  {c.creatives.length} saved static creatives
                  <br />
                  {project.brandKitName || c.brand?.name || "Default Brand"}
                </p>
              </div>
            </div>
            <div className="xp-actions">
              <button className="xp-primary" onClick={editBrief}>
                <CreatePlus
                  size={15}
                  aria-hidden="true"
                  className="inline-block mr-1.5 shrink-0"
                />
                Create with AI / review brief <Sparkles size={15} />
              </button>
              <button className="xp-secondary" onClick={() => go("templates")}>
                <CreatePlus
                  size={15}
                  aria-hidden="true"
                  className="inline-block mr-1.5 shrink-0"
                />
                Create from a visual template
              </button>
              <button className="xp-secondary" onClick={() => go("assets")}>
                Review product and brand assets
              </button>
            </div>
            <ProjectCreativeGallery
              presentation="m2b"
              creatives={c.creatives}
              assetUrls={c.assetUrls}
              storageKeyUrls={storageKeyUrls}
              onOpen={(id) => {
                if (c.confirmLeave()) c.navigate(creativeEditorPath(id));
              }}
              onPreview={(id) => go("preview", { creativeId: id })}
              onExport={(item) => go("export", { creativeId: item.id })}
              onCreate={editBrief}
            />
          </>
        )}
        {screen === "brief" && (
          <div className="xp-split">
            <section className="xp-panel">
              <span className="xp-kicker">
                CAMPAIGN CONFIGURATION / WORKING CREATIVE BRIEF
              </span>
              {field("Project name", "name")}
              {field("Campaign idea", "campaignIdea", true)}
              {field(
                "Creative objective / Example objective",
                "exampleObjective",
                true,
              )}
              {field("Product or service", "productOrService")}
              {field("Advertising message", "coreMessage", true)}
              {field("Audience", "targetAudience")}
              {field("Creative direction", "creativeDirection", true)}
              <div className="xp-form-grid">
                {field("Product category", "productCategory")}
                {field("Desired tone", "desiredTone")}
                <label className="xp-field">
                  Call to action
                  <input
                    list="campaign-cta-options"
                    value={c.form.cta}
                    onChange={(e) =>
                      c.setForm((old) => ({ ...old, cta: e.target.value }))
                    }
                  />
                  <datalist id="campaign-cta-options">
                    {[
                      "Learn more",
                      "Shop now",
                      "Discover the collection",
                      "Book now",
                      "Get started",
                      "Sign up",
                      "Contact us",
                    ].map((label) => (
                      <option key={label} value={label} />
                    ))}
                  </datalist>
                  <small>Choose a suggestion or enter your own.</small>
                </label>
                <label className="xp-field">
                  Format
                  <select
                    value={c.form.outputFormat}
                    onChange={(e) =>
                      c.setForm((old) => ({
                        ...old,
                        outputFormat: e.target.value,
                      }))
                    }
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="xp-notice">
                Project Brand is locked:{" "}
                {project.brandKitName || c.brand?.name || "Default Brand"}.
                Optional source associations and existing metadata are preserved
                by the current save contract.
              </p>
              <div className="xp-actions">
                <button
                  className="xp-secondary"
                  disabled={c.busy}
                  onClick={saveBrief}
                >
                  Save Working Brief
                </button>
                <button
                  className="xp-primary"
                  disabled={c.busy}
                  onClick={() => go("preflight")}
                >
                  Review generation readiness →
                </button>
              </div>
            </section>
            <aside className="xp-panel">
              <h2>Start from an Example Brief.</h2>
              <p>
                These existing creative briefs provide strategy; they are
                distinct from visual templates and category studies.
              </p>
              <div className="bp-brief-options">
                {c.catalog.examples.map((example) => (
                  <button
                    className="xp-asset-choice"
                    key={example.id}
                    onClick={() => {
                      c.setForm(exampleBriefForm(project, example));
                      c.setCompose(true);
                    }}
                  >
                    <div className="bp-brief-thumbnail">
                      <BrandHomePreview
                        brand={brandVisual}
                        fallbackSrc={
                          example.previewImage ||
                          "/ad-studio/sample-assets/w0a-product-hero.jpg"
                        }
                        aspect="portrait"
                        alt={example.title}
                        headline={example.headline}
                      />
                    </div>
                    <span>
                      <strong>{example.title}</strong>
                      <small>
                        {example.exampleObjective || example.supporting}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
        {screen === "templates" && (
          <>
            <p className="xp-lede">
              Choose an existing editable template, then bind your explicitly
              reviewed brand assets. Catalog reference previews are not
              generated advertisements.
            </p>
            {project.brandKitId ? (
              <SavedBrandTemplates
                brandId={project.brandKitId}
                data={savedBrandTemplates}
                assetUrls={c.assetUrls}
                project={project}
              />
            ) : (
              <TemplateGallery
                selectedFormat={c.form.outputFormat}
                busy={c.busy}
                hideHeader
                onUseTemplate={(id, format) => {
                  c.setForm((old) => ({ ...old, outputFormat: format }));
                  go("template", { templateId: id });
                }}
              />
            )}
            {project.brandKitId && (
              <Link
                className="xp-secondary"
                to={"/brands/" + project.brandKitId + "/templates"}
              >
                My Brand Templates →
              </Link>
            )}
          </>
        )}
        {screen === "template" &&
          (template ? (
            <div className="xp-split">
              <section className="xp-panel">
                <SceneStage
                  graph={templatePreview?.sceneGraph}
                  assetUrls={c.assetUrls}
                  size="hero"
                  blockedMessage={
                    templatePreview?.status === "blocked"
                      ? "Required approved sources are missing."
                      : null
                  }
                />
              </section>
              <section className="xp-panel">
                <span className="xp-status">
                  Native editable template · no AI image generation
                </span>
                <h2>{template.name}</h2>
                <p>{templatePreview?.warnings.join(" ")}</p>
                <p>
                  Only reviewed ready assets may be used in this production
                  journey. Product pixels are referenced; identity isolation
                  quality is a separate gate.
                </p>
                <button className="xp-secondary" onClick={() => go("assets")}>
                  Review Brand Kit / assets
                </button>
                <button
                  className="xp-primary"
                  disabled={
                    c.busy ||
                    !c.templatesEnabled ||
                    templatePreview?.status !== "ready" ||
                    c.draftDirty
                  }
                  onClick={() =>
                    c.openTemplate(
                      template.templateId,
                      c.form.outputFormat as Parameters<
                        typeof c.openTemplate
                      >[1],
                    )
                  }
                >
                  <CreatePlus
                    size={15}
                    aria-hidden="true"
                    className="inline-block mr-1.5 shrink-0"
                  />
                  Create Editable Creative →
                </button>
                {!c.templatesEnabled && (
                  <p className="xp-notice">
                    The existing template engine gate is disabled in this
                    environment.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <EmptyState
              title="Choose a visual template"
              description="Select a template from the existing catalog."
              actionLabel="Open templates"
              onAction={() => go("templates")}
            />
          ))}
        {screen === "assets" && (
          <div className="xp-split">
            <section className="xp-panel">
              <h2>Original sources. Clear permission.</h2>
              {!c.brand ? (
                <EmptyState
                  title="Default Brand project"
                  description="No previous Brand Kit is inherited. Use the existing project configuration or create a new Brand Project to bind a kit."
                />
              ) : !c.brand.assets?.length ? (
                <EmptyState
                  title="No uploaded brand assets"
                  description="Use the existing Brand Kit asset manager to upload and review sources."
                />
              ) : (
                c.brand.assets.map((asset) => (
                  <div className="xp-asset-choice" key={asset.id}>
                    {c.assetUrls[asset.id] &&
                      asset.mimeType?.startsWith("image/") !== false && (
                        <img
                          className="bp-source-thumb"
                          src={c.assetUrls[asset.id]}
                          alt={asset.label || asset.role || "Brand source"}
                        />
                      )}
                    <span>
                      <strong>
                        {asset.label || asset.fileName || asset.role}
                      </strong>
                      <small>
                        {asset.role} · {asset.status} ·{" "}
                        {c.brand?.voice?.studio?.approvedAssetIds?.includes(
                          asset.id,
                        )
                          ? "Owner-reviewed source"
                          : "Not approved for this journey"}
                      </small>
                    </span>
                  </div>
                ))
              )}
              {project.brandKitId && (
                <Link
                  className="xp-primary"
                  to={"/brands/" + project.brandKitId + "/guided?step=assets"}
                >
                  Manage source assets and permissions →
                </Link>
              )}
            </section>
            <aside className="xp-panel">
              <h2>Keep identity independent.</h2>
              <p>
                No source photograph is regenerated by this inventory view.
                Model/mascot usage requires scoped permission; ready status
                alone does not authorize creative use.
              </p>
              <button className="xp-secondary" onClick={() => go("preflight")}>
                Check readiness →
              </button>
            </aside>
          </div>
        )}
        {(screen === "concepts" || screen === "compare") && (
          <>
            <div className="xp-section-heading">
              <p className="xp-lede">
                Compare direction before committing to a creative. Unrendered
                concepts are shown as strategy, with no illustrative image
                presented as live AI output. Select “Compare direction” on at
                least two cards to enable comparison.
              </p>
              <button
                className="xp-secondary"
                disabled={screen === "concepts" && comparison.length < 2}
                title={
                  comparison.length < 2
                    ? "Select at least two concept directions below"
                    : "Compare selected concepts"
                }
                onClick={() =>
                  go(screen === "concepts" ? "compare" : "concepts")
                }
              >
                {screen === "concepts" ? "Compare directions" : "All concepts"}
              </button>
            </div>
            {screen === "compare" && comparison.length > 0 ? (
              <div className="xp-gallery">
                {c.concepts
                  .filter((item) => comparison.includes(item.conceptId))
                  .map((item) => (
                    <article className="xp-panel" key={item.conceptId}>
                      <h2>{item.title}</h2>
                      <p>{item.primaryHeadline}</p>
                      <p>{item.creativeDirection}</p>
                      <button
                        className="xp-primary"
                        onClick={() => selectConcept(item.conceptId)}
                      >
                        Select direction →
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              concepts
            )}
          </>
        )}
        {screen === "detail" &&
          (concept ? (
            <div className="xp-split">
              <section className="xp-panel">
                {concept.sceneGraph ? (
                  <SceneStage
                    graph={concept.sceneGraph}
                    assetUrls={c.assetUrls}
                    size="hero"
                  />
                ) : (
                  <EmptyState
                    title="Visual not generated"
                    description="This saved concept is a creative plan. Create an editable native creative or use a separately approved image-generation path."
                  />
                )}
              </section>
              <section className="xp-panel">
                <span className="xp-status">{c.source || "Saved concept"}</span>
                <h2>{concept.title}</h2>
                <p>{concept.creativeDirection}</p>
                <div className="xp-notice">
                  <strong>Your working direction</strong>
                  <p>{c.form.creativeDirection}</p>
                  <p>Audience: {c.form.targetAudience}</p>
                </div>
                <dl className="xp-spec">
                  <dt>Headline</dt>
                  <dd>{concept.primaryHeadline}</dd>
                  <dt>Supporting copy</dt>
                  <dd>{concept.supportingCopy}</dd>
                  <dt>CTA</dt>
                  <dd>{concept.cta}</dd>
                  <dt>Composition</dt>
                  <dd>{concept.composition}</dd>
                </dl>
                {concept.claimWarnings?.map((text) => (
                  <p className="xp-notice" key={text}>
                    {text}
                  </p>
                ))}
                <div className="xp-actions">
                  <button
                    className="xp-primary"
                    disabled={c.busy || c.draftDirty}
                    onClick={() => c.openConcept(concept.conceptId)}
                  >
                    <CreatePlus
                      size={15}
                      aria-hidden="true"
                      className="inline-block mr-1.5 shrink-0"
                    />
                    Create Editable Creative →
                  </button>
                  <button
                    className="xp-secondary"
                    onClick={() => go("compare")}
                  >
                    Compare
                  </button>
                </div>
              </section>
            </div>
          ) : (
            concepts
          ))}
        {(screen === "preview" || screen === "composition") && (
          <div className="xp-split">
            <section className="xp-panel">{savedPreview}</section>
            <section className="xp-panel">
              <span className="xp-status">
                {creative
                  ? "Persisted editable creative"
                  : "No selected creative"}
              </span>
              <h2>{creative?.name || "Select a creative"}</h2>
              <p>
                Product, text, logo and background remain separate saved scene
                layers when present in the actual graph.
              </p>
              <div className="xp-actions">
                <button
                  className="xp-primary"
                  disabled={!creative}
                  onClick={() => {
                    if (creative && c.confirmLeave())
                      c.navigate(creativeEditorPath(creative.id));
                  }}
                >
                  Edit in existing Canvas →
                </button>
                <button
                  className="xp-secondary"
                  disabled={!creative}
                  onClick={() =>
                    creative && go("export", { creativeId: creative.id })
                  }
                >
                  Export
                </button>
                <button
                  className="xp-primary"
                  disabled={!creative}
                  onClick={() =>
                    creative && go("visual-lab", { creativeId: creative.id })
                  }
                >
                  <CreatePlus
                    size={15}
                    aria-hidden="true"
                    className="inline-block mr-1.5 shrink-0"
                  />
                  Create or refine AI background
                </button>
                <button
                  className="xp-secondary"
                  disabled={!creative}
                  onClick={() =>
                    creative && go("variation-lab", { creativeId: creative.id })
                  }
                >
                  Explore AI visual variations
                </button>
                <button
                  className="xp-secondary"
                  disabled={!creative}
                  onClick={() =>
                    creative && go("formats", { creativeId: creative.id })
                  }
                >
                  Adapt placements
                </button>
                <button
                  className="xp-secondary"
                  disabled={!creative}
                  onClick={() =>
                    creative && go("variations", { creativeId: creative.id })
                  }
                >
                  Explore native variations
                </button>
                <button
                  className="xp-secondary"
                  onClick={() => go("workspace")}
                >
                  Project gallery
                </button>
              </div>
            </section>
          </div>
        )}
        {["formats", "adaptation", "variations"].includes(screen) &&
          (creative ? (
            <ProductionCreativeExtensions
              key={creative.id + screen}
              creative={creative}
              projectId={project.id}
              assetUrls={c.assetUrls}
              mode={
                screen === "formats" || screen === "adaptation"
                  ? "formats"
                  : "variations"
              }
              onSaved={(saved) => {
                void c.load();
                go("preview", { creativeId: saved.id });
              }}
              onOpen={(id) => {
                if (c.confirmLeave()) c.navigate(creativeEditorPath(id));
              }}
            />
          ) : (
            savedPreview
          ))}
        {["visual-lab", "variation-lab"].includes(screen) &&
          (creative ? (
            <ProductionImageGeneration
              key={creative.id + screen}
              source={creative}
              brand={c.brand}
              assetUrls={c.assetUrls}
              initialOperation={
                screen === "variation-lab" ? "variation" : "generate"
              }
              onSaved={async (saved) => {
                await c.load();
                go("preview", { creativeId: saved.id });
              }}
            />
          ) : (
            savedPreview
          ))}
        {screen === "export" &&
          (creative ? (
            <div className="xp-split">
              <section className="xp-panel">{savedPreview}</section>
              <section className="xp-panel">
                <ExportPanel
                  creativeId={creative.id}
                  graph={creative.sceneGraph ?? null}
                />
              </section>
            </div>
          ) : (
            savedPreview
          ))}
        {(screen === "director" || screen === "progress") && (
          <ProductionCreativeDirector
            key={project.id}
            project={project}
            dirty={c.draftDirty}
            onSaved={async () => {
              await c.load();
            }}
            onReview={() => go("concepts")}
          />
        )}
        {screen === "preflight" && (
          <div className="xp-split">
            <section className="xp-panel">
              <h2>Your campaign readiness</h2>
              <p>
                Review what is saved and what still needs your decision before
                creating an advertisement.
              </p>
              <div className="bp-readiness-grid">
                <article>
                  <strong>Campaign project</strong>
                  <span>Saved / authorized account access</span>
                  <small>{project.name}</small>
                </article>
                <article>
                  <strong>Brand identity</strong>
                  <span>{c.brand?.name || "Default Brand"}</span>
                  <small>
                    {c.brand?.voice?.studio?.identityApproved
                      ? "Identity reviewed"
                      : c.brand
                        ? "Identity review required in Brand Kit"
                        : "No previous kit inherited"}
                  </small>
                </article>
                <article>
                  <strong>Creative sources</strong>
                  <span>
                    {bindingBrand?.assets?.length || 0} approved ready sources
                  </span>
                  <small>
                    Uploaded files require a separate usage decision. Human
                    models require likeness permission.
                  </small>
                </article>
                <article>
                  <strong>Working Brief</strong>
                  <span>
                    {c.draftDirty ? "Unsaved changes" : "Saved brief"}
                  </span>
                  <small>
                    Generating concepts saves and verifies the brief first. A
                    failed save stops the request.
                  </small>
                </article>
                <article>
                  <strong>Creative directions</strong>
                  <span>{c.concepts.length} saved concepts</span>
                  <small>
                    Concepts are strategy proposals; image generation is a
                    separate, explicitly initiated operation.
                  </small>
                </article>
              </div>
              <button className="xp-primary" onClick={() => go("templates")}>
                Use an existing native template →
              </button>
              <button
                className="xp-primary"
                disabled={c.busy}
                onClick={() => void generateDirections()}
              >
                Save brief & generate concepts
              </button>
              <p className="xp-notice">
                Concept planning uses the configured provider and displays its
                provenance. A heuristic direction is not an AI-generated image.
                Source approvals remain required for image and template
                execution.
              </p>
            </section>
            <aside className="xp-panel">
              <h2>Save before generation.</h2>
              <p>
                Save failures stop generation through the shared project
                controller. Existing optional fields, Brand Kit locks,
                product/reference associations and Example Brief context remain
                intact.
              </p>
              <button
                className="xp-secondary"
                disabled={c.busy}
                onClick={saveBrief}
              >
                Save Working Brief
              </button>
            </aside>
          </div>
        )}
        {![
          "workspace",
          "campaign-manager",
          "brief",
          "templates",
          "template",
          "assets",
          "concepts",
          "compare",
          "detail",
          "preview",
          "composition",
          "export",
          "preflight",
          "formats",
          "adaptation",
          "variations",
          "variation-lab",
          "visual-lab",
          "director",
          "progress",
        ].includes(screen) && (
          <EmptyState
            title="This production workflow is not activated yet"
            description="The approved screen remains in the UX baseline. Its real orchestration and verification gates are still being integrated; no simulated output or invented performance data is displayed."
            actionLabel="Back to project"
            onAction={() => go("workspace")}
          />
        )}
      </main>
    </div>
  );
}
