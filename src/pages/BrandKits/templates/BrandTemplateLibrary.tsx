import { composeTemplatePreview } from "../../AdStudio/canvas/composeTemplateScene";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Check, Copy, Archive, Palette, X } from "lucide-react";
import {
  brandApi,
  brandTemplateApi,
  adStudioApi,
} from "../../../services/apiClient";
import { EmptyState } from "../../../components/common/EmptyState";
import { Skeleton } from "../../../components/ui/skeleton";
import { SceneStage } from "../../AdStudio/canvas/SceneStage";
import { TemplateGallery } from "../../AdStudio/components/TemplateGallery";
import {
  TEMPLATE_CATALOG_V1,
  type AdStudioTemplateId,
} from "../../AdStudio/canvas/templateCatalog";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import { AD_FORMATS } from "../../AdStudio/types";
import {
  creativeEditorPath,
  createProjectTemplate,
  type WorkspaceProject,
} from "../../AdStudio/lib/projectWorkspace";
import type { BrandKitSummary } from "../lib/brandKitTypes";
import {
  canReuseTemplate,
  applyBrandTemplateCopy,
  compatibleTemplateProjects,
  isBrandTemplatesEnabled,
  templateHeadline,
  type BrandTemplate,
  type BrandTemplateAction,
} from "./brandTemplateModel";
import "../../AdStudio/uxPreview/preview.css";
import "../../AdStudio/uxPreview/roadmap.css";
import "../../AdStudio/styles/production-theme.css";
import "../guided/guidedBrand.css";

type Draft = {
  name: string;
  templateId: string;
  format: string;
  primaryHeadline: string;
  supportingCopy: string;
  cta: string;
};
function draftFor(record: BrandTemplate): Draft {
  const text = (name: string) => {
    const layer = record.sceneGraph.layers.find((l) => l.name === name);
    return layer && "text" in layer && typeof layer.text === "string"
      ? layer.text
      : "";
  };
  return {
    name: record.name,
    templateId: record.sourceTemplateId,
    format: record.format,
    primaryHeadline: templateHeadline(record.sceneGraph),
    supportingCopy: text("Supporting copy"),
    cta: text("CTA button"),
  };
}
export default function BrandTemplateLibrary() {
  const { brandId = "", templateId } = useParams(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const enabled = isBrandTemplatesEnabled(),
    tab = params.get("tab") === "default" ? "default" : "brand";
  const [kit, setKit] = useState<BrandKitSummary | null>(null),
    [items, setItems] = useState<BrandTemplate[]>([]),
    [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [format, setFormat] = useState("square_1080"),
    [projectId, setProjectId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null),
    [selectedDefault, setSelectedDefault] = useState<{
      id: AdStudioTemplateId;
      format: string;
    } | null>(null);
  const requestVersion = useRef(0),
    activeBrand = useRef(brandId);
  activeBrand.current = brandId;
  const selected = items.find((t) => t.id === templateId),
    dirty =
      !!selected &&
      !!draft &&
      JSON.stringify(draft) !== JSON.stringify(draftFor(selected));
  const assetKit = useMemo(() => {
    if (!kit || kit.id !== brandId) return null;
    const ids = new Set(items.flatMap((t) => t.sourceAssetIds));
    return { ...kit, assets: (kit.assets || []).filter((a) => ids.has(a.id)) };
  }, [kit, items, brandId]);
  const urls = useAuthenticatedBrandAssetUrls(assetKit);
  const draftPreview = useMemo(() => {
    if (!selected || !draft || !dirty) return selected?.sceneGraph;
    const preview = composeTemplatePreview({
      brand: assetKit,
      outputFormat: draft.format,
      concept: {
        conceptId: selected.id,
        title: draft.name,
        creativeDirection: "Native editable template customization",
        primaryHeadline: draft.primaryHeadline,
        supportingCopy: draft.supportingCopy,
        cta: draft.cta,
        visualPrompt: "",
        composition: "",
        templateId: draft.templateId,
        colorRecommendations: [],
        typographyRecommendations: [],
        platformSuitability: [],
      },
    }).sceneGraph;
    return preview ? applyBrandTemplateCopy(preview, draft) : null;
  }, [selected, draft, dirty, assetKit]);
  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const request = ++requestVersion.current;
    setLoading(true);
    setKit(null);
    setItems([]);
    setProjects([]);
    setBusy(false);
    setError("");
    try {
      const [brand, result, owned] = await Promise.all([
        brandApi.getKit(brandId),
        brandTemplateApi.list(brandId),
        adStudioApi.listProjects(),
      ]);
      if (request !== requestVersion.current) return;
      if (
        brand.id !== brandId ||
        result.items.some((t) => t.brandKitId !== brandId)
      )
        throw new Error("Brand context changed.");
      setKit(brand);
      setItems(result.items);
      setProjects(owned.items as WorkspaceProject[]);
    } catch {
      setError(
        "The owned Brand Kit and template library could not be loaded. Check feature readiness and retry.",
      );
    } finally {
      setLoading(false);
    }
  }, [brandId, enabled]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setDraft(selected ? draftFor(selected) : null);
    setProjectId("");
    setMessage("");
  }, [selected]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const base = "/brands/" + encodeURIComponent(brandId) + "/templates";
  const go = (to: string) => {
    if (
      !dirty ||
      window.confirm("Leave without saving template customization?")
    )
      navigate(to);
  };
  const patch = (value: Partial<Draft>) =>
    setDraft((previous) => (previous ? { ...previous, ...value } : previous));
  const upsert = (record: BrandTemplate) =>
    setItems((previous) => [
      record,
      ...previous.filter((t) => t.id !== record.id),
    ]);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch {
      setError(
        "The request could not be completed. Reload to verify the saved state before retrying; review source permissions and blockers. Your current customization is retained.",
      );
    } finally {
      setBusy(false);
    }
  };
  const prepare = () =>
    void run(async () => {
      if (!kit) throw new Error("Brand required");
      const result = await brandTemplateApi.generate(
        brandId,
        kit.version,
        format,
      );
      if (activeBrand.current !== brandId) return;
      setItems((previous) => [
        ...result.items,
        ...previous.filter((t) => !result.items.some((n) => n.id === t.id)),
      ]);
      setMessage(
        "Four native editable recipes prepared. This is deterministic composition, not AI image generation. Review each candidate separately.",
      );
    });
  const action = (value: BrandTemplateAction) =>
    void run(async () => {
      if (!selected || dirty) throw new Error("Save customization first");
      const result = await brandTemplateApi.action(
        brandId,
        selected.id,
        selected.revision,
        value,
      );
      const fresh = await brandTemplateApi.get(brandId, result.id);
      upsert(fresh);
      if (activeBrand.current !== brandId) return;
      if (value === "duplicate")
        navigate(base + "/" + encodeURIComponent(fresh.id));
      setMessage(
        value === "approve"
          ? "Approved. Save this reviewed recipe before reuse."
          : `Template ${value} completed.`,
      );
    });
  const saveCustomization = () =>
    void run(async () => {
      if (!selected || !draft) throw new Error("Choose a template");
      const result = await brandTemplateApi.customize(brandId, selected.id, {
        ...draft,
        expectedRevision: selected.revision,
      });
      upsert(await brandTemplateApi.get(brandId, result.id));
      setMessage(
        "Customization saved as a suggestion. Review and approval are required again.",
      );
    });
  const matching = compatibleTemplateProjects(
    projects,
    brandId,
    selected?.format || selectedDefault?.format || format,
  );
  const reuse = () =>
    void run(async () => {
      const project = matching.find((p) => p.id === projectId);
      if (!project) throw new Error("Choose a compatible project");
      if (selected) {
        if (dirty || !canReuseTemplate(selected))
          throw new Error("Review required");
        const creative = await brandTemplateApi.reuse(
          brandId,
          selected.id,
          project.id,
        );
        if (activeBrand.current === brandId)
          navigate(creativeEditorPath(creative.id));
      } else if (selectedDefault) {
        const creative = await createProjectTemplate(
          adStudioApi,
          project,
          selectedDefault.id,
          selectedDefault.format,
        );
        if (activeBrand.current === brandId)
          navigate(creativeEditorPath(creative.id));
      }
    });
  if (!enabled)
    return (
      <main className="xp-root nxclip-production bp-guided-root">
        <div className="xp-main">
          <Link className="xp-breadcrumb" to="/create/ad">
            Ad Studio
          </Link>
          <section className="xp-panel">
            <span className="xp-kicker">BRAND TEMPLATE STUDIO</span>
            <h1>Your identity. A collection of editable layouts.</h1>
            <EmptyState
              title="Prepare your brand for its template collection"
              description="Review identity, product sources, logo and permissions in your existing Brand Kit. Native template preparation becomes available after local activation; it does not require paid image generation."
              actionLabel="Review Brand Kit"
              onAction={() =>
                navigate(
                  `/brands/${encodeURIComponent(brandId)}/guided?step=ready`,
                )
              }
            />
            <p className="xp-notice">
              Template preparation is currently disabled in this local frontend.
              Your saved Brand Kit and projects are unchanged.
            </p>
          </section>
        </div>
      </main>
    );
  if (loading)
    return (
      <div className="grid gap-6 p-6" aria-label="Loading template library">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  if (!kit)
    return (
      <EmptyState
        title="Template library unavailable"
        description={error || "This Brand Kit is not accessible."}
        actionLabel="Retry"
        onAction={() => void load()}
      />
    );
  const visible = items.filter(
    (t) =>
      (archived || t.state !== "archived") &&
      `${t.name} ${t.sourceTemplateId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const reviewProject = (
    <section className="xp-panel">
      <h3>Use in an existing Brand Project</h3>
      <p>
        The Brand Kit and output format must match. Your existing project and
        Canvas remain authoritative.
      </p>
      {matching.length ? (
        <label className="xp-field">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Choose an owned project</option>
            {matching.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <EmptyState
          title="No matching projects"
          description="Create a project using this Brand Kit and the selected output format, then return to reuse the template."
        />
      )}
      <button
        className="xp-primary"
        disabled={
          busy ||
          !projectId ||
          (!!selected && (!canReuseTemplate(selected) || dirty)) ||
          (!selected && !selectedDefault)
        }
        onClick={reuse}
      >
        Use template in Ad Studio →
      </button>
      <Link
        className="xp-text-button"
        to="/create/ad"
        onClick={(e) => {
          if (
            dirty &&
            !window.confirm("Leave without saving template customization?")
          )
            e.preventDefault();
        }}
      >
        Open existing projects / Create Project →
      </Link>
    </section>
  );
  return (
    <div className="xp-root nxclip-production bp-guided-root">
      <main className="xp-main">
        <nav className="xp-breadcrumb" aria-label="Breadcrumb">
          <Link
            to={"/brands/" + brandId + "/guided?step=ready"}
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm("Leave without saving template customization?")
              )
                e.preventDefault();
            }}
          >
            <ArrowLeft size={14} /> {kit.name}
          </Link>
          <span>Brand Templates</span>
        </nav>
        <header className="xp-page-head">
          <div>
            <span className="xp-kicker">
              BRAND INTELLIGENCE / EDITABLE RECIPES
            </span>
            <h1>
              {selected
                ? "Review your Brand Template"
                : "A template system that knows your brand."}
            </h1>
            <p>
              Native editable composition · Account-owned assets · Explicit
              review
            </p>
          </div>
          <span className="xp-status">Implemented · gated / native engine</span>
        </header>
        {error && (
          <div className="xp-notice" role="alert">
            {error}
            <button
              className="xp-text-button"
              disabled={busy}
              onClick={() => void load()}
            >
              Reload library
            </button>
          </div>
        )}
        {message && (
          <div className="xp-notice" role="status">
            {message}
          </div>
        )}
        {templateId && !selected ? (
          <EmptyState
            title="Template not found"
            description="This template is unavailable in the selected Brand Kit."
            actionLabel="Open library"
            onAction={() => go(base)}
          />
        ) : selected && draft ? (
          <>
            <div className="xp-split">
              <section className="xp-panel">
                <SceneStage
                  graph={draftPreview}
                  assetUrls={urls}
                  size="hero"
                  showSafeArea
                />
                <span className="xp-status">
                  {selected.state} ·{" "}
                  {selected.saved ? "Saved recipe" : "Unsaved recipe"} ·
                  revision {selected.revision}
                </span>
                <p>
                  Source identity version {selected.sourceBrandVersion}.
                  Original assets are referenced by ID; no regenerated packaging
                  is implied.
                </p>
                {[
                  ...new Set([
                    ...selected.blockers,
                    ...(selected.reuseIssues || []),
                    ...selected.warnings,
                  ]),
                ].map((text) => (
                  <p className="xp-notice" key={text}>
                    {text}
                  </p>
                ))}
              </section>
              <section className="xp-panel">
                <h2>{selected.name}</h2>
                <p>
                  Text, product, logo and geometry remain independent editable
                  scene layers.
                </p>
                <fieldset
                  disabled={busy || selected.state === "archived"}
                  className="bp-fieldset"
                >
                  <label className="xp-field">
                    Template name
                    <input
                      value={draft.name}
                      maxLength={160}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </label>
                  <label className="xp-field">
                    Customize headline
                    <input
                      value={draft.primaryHeadline}
                      maxLength={500}
                      onChange={(e) =>
                        patch({ primaryHeadline: e.target.value })
                      }
                    />
                  </label>
                  <label className="xp-field">
                    Supporting copy
                    <textarea
                      value={draft.supportingCopy}
                      maxLength={1500}
                      onChange={(e) =>
                        patch({ supportingCopy: e.target.value })
                      }
                    />
                  </label>
                  <label className="xp-field">
                    CTA
                    <input
                      value={draft.cta}
                      maxLength={120}
                      onChange={(e) => patch({ cta: e.target.value })}
                    />
                  </label>
                  <label className="xp-field">
                    Composition
                    <select
                      value={draft.templateId}
                      onChange={(e) => {
                        const definition = TEMPLATE_CATALOG_V1.find(
                          (t) => t.templateId === e.target.value,
                        );
                        patch({
                          templateId: e.target.value,
                          format: definition?.formats.includes(
                            draft.format as (typeof definition.formats)[number],
                          )
                            ? draft.format
                            : definition?.formats[0] || draft.format,
                        });
                      }}
                    >
                      {TEMPLATE_CATALOG_V1.map((t) => (
                        <option key={t.templateId} value={t.templateId}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="xp-field">
                    Format
                    <select
                      value={draft.format}
                      onChange={(e) => patch({ format: e.target.value })}
                    >
                      {AD_FORMATS.filter((f) =>
                        TEMPLATE_CATALOG_V1.find(
                          (t) => t.templateId === draft.templateId,
                        )?.formats.includes(f.id),
                      ).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="xp-notice">
                    Saving customization rebuilds this native recipe through the
                    existing template engine and clears its approval. The
                    preview shows the saved revision.
                  </p>
                  <button
                    className="xp-secondary"
                    disabled={!dirty || !draft.name.trim()}
                    onClick={saveCustomization}
                  >
                    Save customization
                  </button>
                </fieldset>
                <div className="xp-actions">
                  {(
                    [
                      "approve",
                      "reject",
                      "save",
                      "duplicate",
                      "archive",
                      "restore",
                    ] as BrandTemplateAction[]
                  )
                    .filter((a) =>
                      selected.state === "archived"
                        ? a === "restore"
                        : a !== "restore",
                    )
                    .map((a) => (
                      <button
                        className={
                          a === "approve" ? "xp-primary" : "xp-secondary"
                        }
                        disabled={
                          busy ||
                          dirty ||
                          (a === "save" && selected.state !== "approved") ||
                          (a === "approve" && selected.blockers.length > 0)
                        }
                        key={a}
                        onClick={() => action(a)}
                      >
                        {a === "approve" ? (
                          <Check size={14} />
                        ) : a === "reject" ? (
                          <X size={14} />
                        ) : a === "duplicate" ? (
                          <Copy size={14} />
                        ) : a === "archive" ? (
                          <Archive size={14} />
                        ) : (
                          <Palette size={14} />
                        )}{" "}
                        {a[0].toUpperCase() + a.slice(1)}
                      </button>
                    ))}
                </div>
                <button className="xp-text-button" onClick={() => go(base)}>
                  Back to brand library →
                </button>
              </section>
            </div>
            {reviewProject}
          </>
        ) : (
          <>
            <div
              className="xp-actions"
              role="tablist"
              aria-label="Template library"
            >
              <button
                className={tab === "default" ? "xp-primary" : "xp-secondary"}
                role="tab"
                aria-selected={tab === "default"}
                onClick={() => {
                  setSelectedDefault(null);
                  setParams({ tab: "default" });
                }}
              >
                Default Templates
              </button>
              <button
                className={tab === "brand" ? "xp-primary" : "xp-secondary"}
                role="tab"
                aria-selected={tab === "brand"}
                onClick={() => {
                  setSelectedDefault(null);
                  setParams({ tab: "brand" });
                }}
              >
                My Brand Templates ({items.length})
              </button>
            </div>
            <div className="xp-panel">
              <div className="xp-actions">
                <label className="xp-field">
                  Output format
                  <select
                    value={format}
                    onChange={(e) => {
                      setFormat(e.target.value);
                      setSelectedDefault(null);
                    }}
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                {tab === "brand" && (
                  <>
                    <label className="xp-field">
                      Find a template
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your recipes"
                      />
                    </label>
                    <label className="xp-check">
                      <input
                        type="checkbox"
                        checked={archived}
                        onChange={(e) => setArchived(e.target.checked)}
                      />{" "}
                      Show archived
                    </label>
                    <button
                      className="xp-primary"
                      disabled={
                        busy ||
                        !kit.voice?.studio?.identityApproved ||
                        !kit.voice?.studio?.guidelinesApproved
                      }
                      onClick={prepare}
                    >
                      {busy ? "Preparing…" : "Generate Brand Templates"}
                    </button>
                  </>
                )}
              </div>
              <p>
                Brand template generation prepares deterministic editable
                recipes from explicitly approved assets. Gemini image generation
                is a separate budgeted action.
              </p>
            </div>
            {tab === "default" ? (
              <>
                <TemplateGallery
                  selectedFormat={format}
                  busy={busy}
                  hideHeader
                  catalogLabel="Existing default template catalog"
                  onUseTemplate={(id, chosen) => {
                    setSelectedDefault({ id, format: chosen });
                    setProjectId("");
                    setMessage(
                      "Choose a matching owned Brand Project below to create an editable creative.",
                    );
                  }}
                />
                {selectedDefault && reviewProject}
              </>
            ) : !visible.length ? (
              <EmptyState
                title={
                  items.length
                    ? "No matching templates"
                    : "Your Brand Templates are ready to begin"
                }
                description={
                  items.length
                    ? "Change the search or include archived templates."
                    : "Complete your reviewed Brand Kit and approve source assets, then prepare native editable candidates."
                }
                actionLabel="Review Brand Kit"
                onAction={() => go("/brands/" + brandId + "/guided?step=ready")}
              />
            ) : (
              <div className="xp-gallery">
                {visible.map((t) => (
                  <article className="xp-creative" key={t.id}>
                    <SceneStage
                      graph={t.sceneGraph}
                      assetUrls={urls}
                      size="card"
                    />
                    <div className="xp-card-copy">
                      <span className="xp-status">
                        {t.state} · {t.saved ? "Saved" : "Review required"}
                      </span>
                      <h3>{t.name}</h3>
                      <p>
                        {AD_FORMATS.find((f) => f.id === t.format)?.label ||
                          t.format}{" "}
                        · editable native recipe
                      </p>
                      <p>
                        {t.blockers.length
                          ? `${t.blockers.length} unresolved source requirements`
                          : "Independent scene layers"}
                      </p>
                      <button
                        className="xp-primary"
                        onClick={() =>
                          go(base + "/" + encodeURIComponent(t.id))
                        }
                      >
                        Preview & customize →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
