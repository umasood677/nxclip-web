import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Compass, Megaphone, ShieldCheck, Sparkles } from "lucide-react";
import { adStudioApi, brandApi, brandTemplateApi } from "../../../services/apiClient";
import { SEO } from "../../../components/SEO";
import { Skeleton } from "../../../components/ui/skeleton";
import { AdProjectCreateForm } from "../components/CreateAdProjectDialog";
import { exampleForPlanning } from "../lib/publishedExampleBriefs";
import { openBrandTemplateAd } from "../lib/brandTemplateAd";
import { canReuseTemplate, type BrandTemplate } from "../../BrandKits/templates/brandTemplateModel";
import { selectTemplateSource, projectWorkspacePath } from "../lib/projectWorkspace";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import {
  isAdStudioTemplateId,
  getTemplateDef,
} from "../canvas/templateCatalog";
import { selectedBrandAssetReadiness } from "../lib/homeEntryFlow";
import "../uxPreview/preview.css";
import "../styles/production-theme.css";
import "../styles/ad-studio-w0a.css";
import "../../BrandKits/guided/guidedBrand.css";
export default function AdProjectStart() {
  const [query] = useSearchParams(),
    navigate = useNavigate(),
    brandId = query.get("brandId") || "",
    exampleId = query.get("exampleId") || "",
    templateId = query.get("templateId") || "",
    format = query.get("format") || "",
    brandTemplateId = query.get("brandTemplateId") || "",
    revision = Number(query.get("revision"));
  const [savedTemplate, setSavedTemplate] = useState<BrandTemplate>();
  useEffect(() => {
    let active = true;
    setSavedTemplate(undefined);
    if (brandId && brandTemplateId) void brandTemplateApi.get(brandId, brandTemplateId).then(template => {
      if (active && template.brandKitId === brandId && template.id === brandTemplateId &&
        template.revision === revision && template.format === format && canReuseTemplate(template))
        setSavedTemplate(template);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [brandId, brandTemplateId, revision, format]);
  const [brands, setBrands] = useState<BrandKitSummary[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState(brandId),
    [selectedKit, setSelectedKit] = useState<BrandKitSummary | null>(null),
    [kitLoading, setKitLoading] = useState(false),
    [kitError, setKitError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const list = await brandApi.listKits();
        const owned = (list.items || []) as BrandKitSummary[];
        if (brandId && !owned.some((item) => item.id === brandId))
          throw Error(
            "This Brand Kit is not available to the signed-in account.",
          );
        if (active) {
          setBrands(owned);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load project setup.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [brandId]);
  useEffect(() => {
    let active = true;
    setSelectedKit(null);
    setKitError("");
    if (loading) return;
    if (!selectedBrandId) {
      setKitLoading(false);
      return;
    }
    if (!brands.some((b) => b.id === selectedBrandId)) {
      setKitError("Choose an available owned Brand Kit.");
      return;
    }
    setKitLoading(true);
    void brandApi
      .getKit(selectedBrandId)
      .then((detail) => {
        if (active) {
          if (detail.id !== selectedBrandId)
            throw Error("Brand context mismatch");
          setSelectedKit(detail);
        }
      })
      .catch(() => {
        if (active)
          setKitError(
            "The selected Brand Kit could not load. Choose it again before creating the project.",
          );
      })
      .finally(() => {
        if (active) setKitLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedBrandId, loading, brands]);
  const example = exampleForPlanning(exampleId);
  const template = isAdStudioTemplateId(templateId)
    ? getTemplateDef(templateId)
    : null;
  const blockers = [
    ...(brandTemplateId && !savedTemplate ? ["A saved, approved Brand Template at this revision is required."] : []),
    ...(kitError ? [kitError] : []),
    ...(selectedBrandId && selectedKit?.id !== selectedBrandId
      ? ["Wait for the selected Brand Kit to finish loading."]
      : []),
    ...(kitLoading ? ["Checking selected Brand Kit sources..."] : []),
    ...(exampleId && !example
      ? [
          "This Example Brief is unavailable. Return to Ad Studio to choose another.",
        ]
      : []),
    ...(templateId && !template
      ? ["Unknown template. Return to the gallery."]
      : []),
    ...(template &&
    format &&
    !template.formats.includes(format as (typeof template.formats)[number])
      ? ["This format is not supported by the selected template."]
      : []),
    ...(template
      ? selectedBrandAssetReadiness(
          selectedKit,
          template.slots
            .filter((slot) => slot.required)
            .map((slot) =>
              slot.slotId === "model"
                ? "brand_model"
                : slot.slotId === "product"
                  ? "product_image"
                  : slot.slotId === "logo"
                    ? "logo_primary"
                    : slot.slotId,
            ),
        )
      : []),
  ];
  const sourceLabel = savedTemplate
    ? `Brand Template · ${savedTemplate.name}`
    : template
      ? `Default Template · ${template.name}`
      : example
        ? `Example Brief · ${example.title}`
        : "Original idea";
  return (
    <main className="xp-root nxclip-production bp-guided-root ad-campaign-start-root">
      <SEO title="New Ad Project | NxClip" />
      <div className="xp-main ad-campaign-start">
        <Link className="xp-breadcrumb" to="/create/ad">
          ← Back to Ad Studio
        </Link>
        <div className="xp-page-heading ad-campaign-start__heading">
          <h1>Create Campaign</h1>
        </div>
        <div className="ad-campaign-start__grid ad-studio-w0a">
          <section className="xp-panel ad-campaign-start__form-panel" aria-labelledby="campaign-details-title">
            <div className="ad-campaign-start__panel-heading">
              <span className="ad-campaign-start__icon" aria-hidden="true"><Megaphone size={20} /></span>
              <div>
                <h2 id="campaign-details-title">Campaign details</h2>
                <p>{sourceLabel}</p>
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-80" aria-label="Loading campaign setup" />
            ) : error ? (
              <p role="alert" className="ad-campaign-start__error">{error}</p>
            ) : (
              <AdProjectCreateForm
                ideaFirst
                brands={brands}
                initialBrandId={brandId}
                brandLocked={!!brandTemplateId}
                onBrandChange={setSelectedBrandId}
                brandsLoading={kitLoading}
                example={example}
                format={format || example?.briefDefaults.outputFormat || undefined}
                defaultTemplateId={template?.templateId}
                blockers={blockers}
                onCancel={() => navigate("/create/ad")}
                onCreated={async (project) => {
                  if (savedTemplate) {
                    try {
                      const source = await openBrandTemplateAd(brandTemplateApi, adStudioApi, {
                        ...project, outputFormat: savedTemplate.format,
                      }, savedTemplate);
                      await selectTemplateSource(adStudioApi, project, { startingCreativeId: source.id, format: savedTemplate.format });
                    } catch {
                      navigate(projectWorkspacePath(project.id) + "?sourceUnavailable=1");
                      return;
                    }
                  }
                  navigate(projectWorkspacePath(project.id) + "?view=strategy");
                }}
              />
            )}
          </section>
          <aside className="xp-panel ad-campaign-start__guide" aria-labelledby="campaign-guide-title">
            <div className="ad-campaign-start__guide-art" aria-hidden="true">
              <Megaphone size={78} strokeWidth={1.4} />
              <span /><span /><span />
            </div>
            <div className="ad-campaign-start__guide-heading">
              <span className="ad-campaign-start__icon" aria-hidden="true"><Sparkles size={18} /></span>
              <h2 id="campaign-guide-title">Your campaign starts here</h2>
            </div>
            <p>Save the idea first. Planning and artwork generation happen only when you choose them.</p>
            <ol aria-label="Campaign workflow">
              <li><ClipboardCheck size={16} aria-hidden="true" /><span>Review campaign brief</span></li>
              <li><Compass size={16} aria-hidden="true" /><span>Explore creative directions</span></li>
              <li><ShieldCheck size={16} aria-hidden="true" /><span>Review production readiness</span></li>
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}
