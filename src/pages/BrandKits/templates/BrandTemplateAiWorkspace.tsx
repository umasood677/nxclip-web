import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { adStudioApi, brandTemplateApi } from "../../../services/apiClient";
import { Skeleton } from "../../../components/ui/skeleton";
import { ProductionImageGeneration } from "../../AdStudio/production/ProductionImageGeneration";
import { hasGeneratedBackground } from "../../AdStudio/production/imageExecutionModel";
import { AdProjectCreateForm } from "../../AdStudio/components/CreateAdProjectDialog";
import { compatibleTemplateProjects } from "./brandTemplateModel";
import {
  projectWorkspacePath,
  type WorkspaceCreative,
  type WorkspaceProject,
} from "../../AdStudio/lib/projectWorkspace";
import { TEMPLATE_CATALOG_V1 } from "../../AdStudio/canvas/templateCatalog";
import { AD_FORMATS } from "../../AdStudio/types";
import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import { useCreativeAssetUrls } from "../../AdStudio/canvas/useCreativeAssetUrls";
import type { BrandKitSummary } from "../lib/brandKitTypes";
export function verifyTemplateSource(
  value: WorkspaceCreative,
  projects: readonly WorkspaceProject[],
  brandId: string,
) {
  if (
    !value ||
    !value.id ||
    !value.sceneGraph ||
    !Number.isInteger(value.currentVersion) ||
    Number(value.currentVersion) < 1 ||
    !projects.some((p) => p.id === value.projectId && p.brandKitId === brandId)
  )
    throw Error("This creative is unavailable for the selected Brand Kit.");
  return value;
}
export function BrandTemplateAiWorkspace({
  kit,
  projects,
  initialFormat,
  onBack,
}: {
  kit: BrandKitSummary;
  projects: WorkspaceProject[];
  initialFormat: string;
  onBack: () => void;
}) {
  const navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    pending = useRef(false);
  const [format, setFormat] = useState(initialFormat),
    [layout, setLayout] = useState("product-hero"),
    [projectId, setProjectId] = useState(""),
    [source, setSource] = useState<WorkspaceCreative | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [generated, setGenerated] = useState(false),
    [name, setName] = useState(kit.name + " / AI template"),
    [creatingProject, setCreatingProject] = useState(false),
    [createdProjects, setCreatedProjects] = useState<WorkspaceProject[]>([]);
  const allProjects = [
      ...createdProjects,
      ...projects.filter((p) => !createdProjects.some((c) => c.id === p.id)),
    ],
    sourceId = params.get("source");
  const brandUrls = useAuthenticatedBrandAssetUrls(kit),
    generatedUrls = useCreativeAssetUrls(source ? [source.id] : []),
    urls = { ...brandUrls, ...generatedUrls };
  const remember = (creative: WorkspaceCreative) => {
    setSource(creative);
    const next = new URLSearchParams(params);
    next.set("mode", "ai");
    next.set("source", creative.id);
    setParams(next, { replace: true });
  };
  useEffect(() => {
    if (!sourceId || source?.id === sourceId) return;
    let active = true;
    setLoading(true);
    setError("");
    void adStudioApi
      .getCreative(sourceId)
      .then((value) => {
        const c = verifyTemplateSource(
          value,
          [...createdProjects, ...projects],
          kit.id,
        );
        if (c.id !== sourceId) throw Error("Creative context changed.");
        if (active) {
          setSource(c);
          setGenerated(hasGeneratedBackground(c));
          setProjectId(c.projectId);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not reopen this creative.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sourceId, source?.id, kit.id, projects, createdProjects]);
  const matching = compatibleTemplateProjects(allProjects, kit.id, format),
    layouts = TEMPLATE_CATALOG_V1.filter((t) =>
      t.formats.some((f) => f === format),
    );
  async function prepare() {
    if (pending.current) return;
    const project = matching.find((p) => p.id === projectId);
    if (!project || !kit.version) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      remember(
        verifyTemplateSource(
          await brandTemplateApi.createAiSource(kit.id, {
            projectId: project.id,
            templateId: layout,
            expectedBrandVersion: kit.version,
          }),
          allProjects,
          kit.id,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not prepare the campaign creative.",
      );
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  async function publish() {
    if (!source || !generated || pending.current || !kit.version) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const record = await brandTemplateApi.fromCreative(kit.id, {
        creativeId: source.id,
        expectedCreativeVersion: source.currentVersion!,
        expectedBrandVersion: kit.version,
        name,
      });
      toast.success("AI template ready for review.");
      navigate(
        "/brands/" +
          encodeURIComponent(kit.id) +
          "/templates/" +
          encodeURIComponent(record.id),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not publish. Your campaign creative is retained.",
      );
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  return (
    <section className="bt-ai-workspace">
      <button className="xp-text-button" onClick={onBack}>
        <ArrowLeft size={14} /> Back to templates
      </button>
      <header>
        <span className="xp-kicker">AI CREATIVE STUDIO</span>
        <h2>
          <Sparkles size={22} /> Design with your brand
        </h2>
        <p>
          Original product and logo layers. AI-generated scenery. Editable copy.
        </p>
      </header>
      {error && (
        <p role="alert" className="bt-blocker">
          {error}
        </p>
      )}
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : source ? (
        <>
          {generated && (
            <section className="xp-panel bt-ai-setup">
              <h3>Save to Brand Templates</h3>
              <label className="xp-field">
                Template name
                <input
                  value={name}
                  maxLength={160}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                className="xp-primary"
                disabled={busy || !name.trim()}
                onClick={() => void publish()}
              >
                <Plus size={16} />
                {busy ? "Saving…" : "Add to template review"}
              </button>
              <small>
                Approve the design, then save it to your library for same-brand
                campaigns.
              </small>
            </section>
          )}
          <Link
            className="xp-text-button"
            to={
              projectWorkspacePath(source.projectId) +
              "?view=visual-lab&creative=" +
              encodeURIComponent(source.id)
            }
          >
            Open campaign creative
          </Link>
          <ProductionImageGeneration
            key={source.id}
            source={source}
            brand={kit}
            assetUrls={urls}
            onSaved={async (creative) => {
              remember(verifyTemplateSource(creative, allProjects, kit.id));
              setGenerated(true);
            }}
          />
        </>
      ) : (
        <div className="xp-panel bt-ai-setup">
          {creatingProject ? (
            <AdProjectCreateForm
              key={format}
              brands={[kit]}
              initialBrandId={kit.id}
              brandLocked
              format={format}
              onCancel={() => setCreatingProject(false)}
              onCreated={(project) => {
                if (project.brandKitId !== kit.id) {
                  setError("The new project must use this Brand Kit.");
                  return;
                }
                setCreatedProjects((p) => [project, ...p]);
                setProjectId(project.id);
                setCreatingProject(false);
              }}
            />
          ) : (
            <>
              <fieldset disabled={busy} className="bp-fieldset bt-setup-fields">
                <label className="xp-field">
                  Format
                  <select
                    value={format}
                    onChange={(e) => {
                      setFormat(e.target.value);
                      setProjectId("");
                      setLayout("product-hero");
                    }}
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="xp-field">
                  Starting composition
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                  >
                    {layouts.map((t) => (
                      <option key={t.templateId} value={t.templateId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="xp-field">
                  Campaign
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">Choose a campaign</option>
                    {matching.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
              {!matching.length && (
                <p>No campaign uses this Brand Kit and format.</p>
              )}
              <div className="xp-actions">
                <button
                  className="xp-secondary"
                  onClick={() => setCreatingProject(true)}
                >
                  <Plus size={16} /> Create a campaign
                </button>
                <button
                  className="xp-primary"
                  disabled={
                    busy ||
                    !projectId ||
                    !layouts.some((t) => t.templateId === layout)
                  }
                  onClick={() => void prepare()}
                >
                  <Sparkles size={16} />
                  {busy ? "Preparing…" : "Continue to AI generation"}
                </button>
              </div>
              <small>
                Creates a campaign draft. Generation starts only after your
                separate provider authorization. Review completed artwork before
                publishing.
              </small>
            </>
          )}
        </div>
      )}
    </section>
  );
}
