import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { brandApi } from "../../../services/apiClient";
import { SEO } from "../../../components/SEO";
import { Skeleton } from "../../../components/ui/skeleton";
import { AdProjectCreateForm } from "../components/CreateAdProjectDialog";
import { resolveBrandHomeCatalog } from "../lib/brandHomeCatalog";
import { projectWorkspacePath } from "../lib/projectWorkspace";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import {
  isAdStudioTemplateId,
  getTemplateDef,
} from "../canvas/templateCatalog";
import { selectedBrandAssetReadiness } from "../lib/homeEntryFlow";
import "../uxPreview/preview.css";
import "../styles/production-theme.css";
import "../../BrandKits/guided/guidedBrand.css";
export default function AdProjectStart() {
  const [query] = useSearchParams(),
    navigate = useNavigate(),
    brandId = query.get("brandId") || "",
    exampleId = query.get("exampleId") || "",
    templateId = query.get("templateId") || "",
    format = query.get("format") || "";
  const [brands, setBrands] = useState<BrandKitSummary[]>([]),
    [kit, setKit] = useState<BrandKitSummary | null>(null),
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
        const detail = brandId ? await brandApi.getKit(brandId) : null;
        if (active) {
          setBrands(owned);
          setKit(detail);
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
  const example = exampleId
    ? resolveBrandHomeCatalog(kit).examples.find(
        (item) => item.id === exampleId,
      )
    : undefined;
  const template = isAdStudioTemplateId(templateId)
    ? getTemplateDef(templateId)
    : null;
  const blockers = [
    ...(kitError ? [kitError] : []),
    ...(selectedBrandId && selectedKit?.id !== selectedBrandId
      ? ["Wait for the selected Brand Kit to finish loading."]
      : []),
    ...(kitLoading ? ["Checking selected Brand Kit sources..."] : []),
    ...(exampleId && !example
      ? [
          "This Example Brief is not available for the selected Brand Kit. Return Home and select it again.",
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
  return (
    <main className="xp-root nxclip-production bp-guided-root">
      <SEO title="New Ad Project | NxClip" />
      <div className="xp-main">
        <Link className="xp-breadcrumb" to="/create/ad">
          ← Ad Studio
        </Link>
        <div className="xp-page-heading">
          <h1>
            {example
              ? "Make this brief your own."
              : template
                ? "A considered campaign starting point."
                : "Start a campaign with a clear idea."}
          </h1>
        </div>
        <div className="xp-panel" style={{ maxWidth: 760 }}>
          <p>
            {example
              ? `Starting brief: ${example.title}. Your strategy will open in the current project workspace.`
              : template
                ? `Standard layout: ${template.name}. Save a project explicitly, then review and create the creative inside that project.`
                : "Create a project, then develop its brief, concepts and editable creatives in one workspace."}
          </p>
          {loading ? (
            <Skeleton className="h-80" aria-label="Loading project setup" />
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <AdProjectCreateForm
              brands={brands}
              initialBrandId={brandId}
              onBrandChange={setSelectedBrandId}
              brandsLoading={kitLoading}
              example={example}
              format={format || undefined}
              blockers={blockers}
              onCancel={() => navigate("/create/ad")}
              onCreated={(project) =>
                navigate(
                  projectWorkspacePath(project.id) +
                    (template
                      ? `?view=template&template=${encodeURIComponent(template.templateId)}`
                      : example
                        ? "?view=brief"
                        : "?view=workspace"),
                )
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}
