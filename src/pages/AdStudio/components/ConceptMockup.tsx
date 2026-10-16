import React from "react";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdConcept } from "../types";
import {
  brandInitials,
  brandLogoUrl,
  formatForAspect,
  resolveConceptVisualStyle,
} from "../lib/conceptVisual";

type Props = {
  concept: AdConcept;
  brand?: BrandKitSummary | null;
  outputFormat: string;
  /** Real authorized image URL or data URL when available */
  imageUrl?: string | null;
  className?: string;
  compact?: boolean;
};

export function ConceptMockup({
  concept,
  brand,
  outputFormat,
  imageUrl,
  className,
  compact,
}: Props) {
  const format = formatForAspect(outputFormat);
  const style = resolveConceptVisualStyle(concept, brand);
  const logo = brandLogoUrl(brand);
  const maxH = compact ? 200 : 280;
  const maxW = compact ? 160 : 220;
  const scale = Math.min(maxW / format.width, maxH / format.height);
  const width = Math.round(format.width * scale);
  const height = Math.round(format.height * scale);
  const pad = Math.max(10, 28 * scale);
  const brandName = brand?.name ?? "Neutral";

  const headlineStyle: React.CSSProperties = {
    color: style.text,
    fontWeight: style.headingWeight,
    fontSize: Math.max(13, 36 * scale * style.headingSizeScale),
    lineHeight: 1.1,
    textAlign: style.align,
    letterSpacing: style.layout === "diagonal-luxury" ? "-0.03em" : "-0.02em",
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="text-[9px] uppercase tracking-wide"
        >
          {imageUrl ? "Concept visual" : "Preview mockup"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{format.label}</span>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-border shadow-soft"
        style={{ width, height, background: style.background }}
        aria-label={`Concept preview for ${concept.title}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {/* Soft overlays for brand treatment without claiming AI imagery */}
        {!imageUrl && style.layout === "diagonal-luxury" ? (
          <div
            className="absolute inset-0 opacity-35"
            style={{
              background:
                "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.18), transparent 42%), linear-gradient(120deg, transparent 40%, rgba(0,0,0,0.35) 100%)",
            }}
          />
        ) : null}

        {/* Brand mark */}
        <div
          className="absolute flex items-center gap-2"
          style={{
            top: pad * 0.7,
            left: pad,
            right: pad,
            justifyContent:
              style.layout === "left-editorial" ? "flex-start" : "space-between",
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              className="rounded object-contain bg-white/10"
              style={{ height: Math.max(18, 36 * scale), maxWidth: 72 * scale }}
            />
          ) : (
            <span
              className="rounded-md flex items-center justify-center text-[10px] font-semibold"
              style={{
                width: Math.max(22, 36 * scale),
                height: Math.max(22, 36 * scale),
                backgroundColor: style.accent,
                color: style.ctaText,
              }}
            >
              {brandInitials(brandName)}
            </span>
          )}
          {!compact && (
            <span
              className="text-[9px] uppercase tracking-[0.14em] opacity-80"
              style={{ color: style.text }}
            >
              {brandName}
            </span>
          )}
        </div>

        {/* Copy block by layout */}
        <div
          className="absolute"
          style={
            style.layout === "bottom-stack"
              ? { left: pad, right: pad, bottom: pad * 1.8 }
              : style.layout === "top-banner"
                ? { left: pad, right: pad, top: "28%" }
                : style.layout === "left-editorial"
                  ? { left: pad, right: "18%", top: "34%" }
                  : { left: pad, right: pad, top: "36%" }
          }
        >
          <div style={headlineStyle}>{concept.primaryHeadline}</div>
          {!compact && (
            <p
              className="mt-2 line-clamp-3"
              style={{
                color: style.mutedText,
                fontSize: Math.max(9, 15 * scale),
                textAlign: style.align,
              }}
            >
              {concept.supportingCopy}
            </p>
          )}
        </div>

        <div
          className="absolute"
          style={{
            left: pad,
            right: pad,
            bottom: pad,
            display: "flex",
            justifyContent:
              style.align === "center"
                ? "center"
                : style.align === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          <span
            className="inline-flex items-center rounded-full font-medium"
            style={{
              backgroundColor: style.ctaBg,
              color: style.ctaText,
              fontSize: Math.max(9, 13 * scale),
              padding: `${Math.max(4, 8 * scale)}px ${Math.max(10, 18 * scale)}px`,
            }}
          >
            {concept.cta}
          </span>
        </div>

        {!imageUrl && (
          <div className="absolute bottom-1.5 right-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[8px] text-white/90">
            Not AI image
          </div>
        )}
      </div>
    </div>
  );
}
