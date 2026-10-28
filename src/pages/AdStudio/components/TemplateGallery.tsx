import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  TEMPLATE_CATALOG_V1,
  type AdSceneOutputFormatId,
  type AdStudioTemplateId,
} from "../canvas/templateCatalog";
import type { BrandTemplatePresentation } from "../lib/brandHomeCatalog";
import { templateSamplePreview } from "../lib/samplePreviewAssets";
import { AD_FORMATS } from "../types";
import type { NormalizedBrandContext } from "../../BrandKits/lib/brandContext";
import { BrandHomePreview, aspectForFormat } from "./BrandHomePreview";

type Props = {
  limit?: number;
  selectedFormat: string;
  busy?: boolean;
  onUseTemplate: (
    templateId: AdStudioTemplateId,
    format: AdSceneOutputFormatId,
  ) => void;
  /** W0A premium card presentation (default). */
  presentation?: "w0a" | "legacy";
  /** Hide internal section header when parent already shows one. */
  hideHeader?: boolean;
  /** Brand-kit AI overlays for the 10 catalog layouts. */
  brandTemplates?: BrandTemplatePresentation[];
  catalogLabel?: string;
  /** Active Brand Kit visual context (assets / palette). */
  brandContext?: NormalizedBrandContext | null;
  /** Remount key when Brand Kit changes. */
  catalogKey?: string;
  /** Suppress default golden note (parent may render its own). */
  hideNote?: boolean;
};

/** Correct aspect labels — never use includes("9") (false-positives → 9:16). */
export function formatChip(formatId: string): string {
  switch (formatId) {
    case "vertical_1080x1920":
      return "9:16";
    case "square_1080":
      return "1:1";
    case "portrait_1080x1350":
      return "4:5";
    case "landscape_1920x1080":
      return "16:9";
    default:
      return AD_FORMATS.find((f) => f.id === formatId)?.label ?? formatId;
  }
}

function categoryFor(layoutFamily: string): string {
  switch (layoutFamily) {
    case "centered-hero":
      return "Hero";
    case "left-editorial":
      return "Editorial";
    case "top-banner":
      return "Launch";
    case "bottom-stack":
      return "Promo";
    case "diagonal-luxury":
      return "Luxury";
    default:
      return "Template";
  }
}

export function TemplateGallery({
  selectedFormat,
  limit,
  busy,
  onUseTemplate,
  presentation = "w0a",
  hideHeader = true,
  brandTemplates,
  catalogLabel,
  brandContext = null,
  catalogKey = "neutral",
  hideNote = false,
}: Props) {
  const [pickFormat, setPickFormat] = useState<
    Record<string, AdSceneOutputFormatId>
  >({});

  const defaultFormat = useMemo(() => {
    const hit = AD_FORMATS.find((f) => f.id === selectedFormat);
    return (hit?.id ?? "portrait_1080x1350") as AdSceneOutputFormatId;
  }, [selectedFormat]);

  const overlayById = useMemo(() => {
    const map = new Map<string, BrandTemplatePresentation>();
    for (const t of brandTemplates ?? []) map.set(t.templateId, t);
    return map;
  }, [brandTemplates]);

  if (presentation === "w0a") {
    return (
      <section
        id="ad-studio-catalog"
        aria-label="Template gallery"
        key={catalogKey}
      >
        {!hideHeader ? (
          <div className="w0a-section-title">
            <h2>Visual Template Gallery</h2>
          </div>
        ) : null}
        {!hideNote ? (
          <div className="w0a-note">
            {catalogLabel && catalogLabel !== "Neutral"
              ? `${catalogLabel} Brand Kit is live on these cards — logo, product, and palette from your kit. Pick 1:1 · 4:5 · 9:16 · 16:9 then Use template.`
              : "Neutral catalog — switch Brand Kit in the header to preview kit assets on every template. Formats: 1:1 · 4:5 · 9:16 · 16:9."}
          </div>
        ) : null}
        <div className="w0a-grid w0a-grid-3">
          {TEMPLATE_CATALOG_V1.slice(0, limit).map((tpl) => {
            const format =
              pickFormat[tpl.templateId] ??
              (tpl.formats.includes(defaultFormat as AdSceneOutputFormatId)
                ? (defaultFormat as AdSceneOutputFormatId)
                : tpl.formats[0]!);
            const preview = templateSamplePreview(tpl.templateId);
            const overlay = overlayById.get(tpl.templateId);
            const title = overlay?.displayName ?? tpl.name;
            const meta = overlay?.tagline
              ? overlay.tagline
              : `${categoryFor(tpl.layoutFamily)} · ${formatChip(format)}`;

            return (
              <article
                key={`${catalogKey}-${tpl.templateId}`}
                className="w0a-card"
              >
                <BrandHomePreview
                  fallbackSrc={preview}
                  alt={`${title} visual preview`}
                  brand={brandContext}
                  aspect={aspectForFormat(format)}
                  headline={overlay?.headline}
                />
                <div className="w0a-card-body">
                  <h3>{title}</h3>
                  <div className="w0a-meta">{meta}</div>
                  <div
                    className="w0a-formats"
                    role="group"
                    aria-label="Aspect ratio"
                  >
                    {tpl.formats.map((f) => (
                      <button
                        key={f}
                        type="button"
                        disabled={busy}
                        className={cn("w0a-chip", format === f && "on")}
                        onClick={() =>
                          setPickFormat((prev) => ({
                            ...prev,
                            [tpl.templateId]: f,
                          }))
                        }
                      >
                        {formatChip(f)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w0a-btn"
                    disabled={busy}
                    onClick={() => onUseTemplate(tpl.templateId, format)}
                  >
                    {busy ? (
                      <>
                        <Loader2
                          className="animate-spin mr-2"
                          size={14}
                          aria-hidden
                        />
                        Creating…
                      </>
                    ) : (
                      "Use template"
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" key={catalogKey}>
      <div className="w0a-grid w0a-grid-3">
        {TEMPLATE_CATALOG_V1.slice(0, limit).map((tpl) => {
          const format =
            pickFormat[tpl.templateId] ??
            (tpl.formats.includes(defaultFormat as AdSceneOutputFormatId)
              ? (defaultFormat as AdSceneOutputFormatId)
              : tpl.formats[0]!);
          const preview = templateSamplePreview(tpl.templateId);
          return (
            <article key={tpl.templateId} className="w0a-card">
              <BrandHomePreview
                fallbackSrc={preview}
                alt=""
                brand={brandContext}
                aspect={aspectForFormat(format)}
              />
              <div className="w0a-card-body">
                <h3>{tpl.name}</h3>
                <button
                  type="button"
                  className="w0a-btn"
                  disabled={busy}
                  onClick={() => onUseTemplate(tpl.templateId, format)}
                >
                  Use template
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
