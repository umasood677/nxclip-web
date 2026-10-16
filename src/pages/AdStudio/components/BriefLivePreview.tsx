import React, { useMemo } from "react";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { normalizeBrandContext } from "../../BrandKits/lib/brandContext";
import { AD_FORMATS } from "../types";
import type { AdBriefFormState } from "../lib/adStudioLabels";

type Props = {
  form: AdBriefFormState;
  brand?: BrandKitSummary | null;
  className?: string;
  /** Compact for home template thumbnails */
  compact?: boolean;
};

export function BriefLivePreview({ form, brand, className, compact }: Props) {
  const format = AD_FORMATS.find((f) => f.id === form.outputFormat) ?? AD_FORMATS[1];
  const ctx = useMemo(() => normalizeBrandContext(brand), [brand]);
  const primary = ctx?.colors.primary ?? "#5257F1";
  const secondary = ctx?.colors.secondary ?? "#0F172A";
  const headingFont = ctx?.typography.headline ?? "Geist Variable";
  const bodyFont = ctx?.typography.body ?? "Geist Variable";
  const logoUrl = ctx?.assets.logoUrl ?? null;

  const headline =
    form.coreMessage.trim() ||
    form.productOrService.trim() ||
    "Your headline appears here";
  const support =
    form.productOrService.trim() && form.coreMessage.trim()
      ? form.productOrService.trim()
      : form.targetAudience.trim() || "Add a product and message to personalize this sample.";
  const cta = form.cta.trim() || ctx?.preferredCta || "Learn more";
  const brandName = ctx?.name ?? "Neutral";

  const scale = useMemo(() => {
    const maxH = compact ? 180 : 420;
    const maxW = compact ? 140 : 320;
    return Math.min(maxW / format.width, maxH / format.height);
  }, [compact, format.height, format.width]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="flex items-center gap-2 self-start">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Sample preview
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {format.label} · {format.width}×{format.height}
        </span>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-border shadow-soft-lg"
        style={{
          width: Math.round(format.width * scale),
          height: Math.round(format.height * scale),
          background: `linear-gradient(160deg, ${secondary} 0%, ${primary}33 55%, ${secondary} 100%)`,
        }}
        aria-label="Sample advertisement preview"
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.12), transparent 40%)",
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-3"
          style={{ paddingTop: Math.max(8, 18 * scale), paddingInline: Math.max(10, 28 * scale) }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="rounded-md object-contain bg-white/90"
              style={{
                width: Math.max(28, 56 * scale),
                height: Math.max(28, 56 * scale),
              }}
            />
          ) : (
            <div
              className="rounded-md flex items-center justify-center font-semibold text-[10px]"
              style={{
                width: Math.max(28, 56 * scale),
                height: Math.max(28, 56 * scale),
                backgroundColor: primary,
                color: "#fff",
                fontFamily: headingFont,
              }}
            >
              {(brandName || "N").slice(0, 1).toUpperCase()}
            </div>
          )}
          <span
            className="text-[9px] uppercase tracking-[0.14em] opacity-80"
            style={{ color: "#fff", fontFamily: bodyFont }}
          >
            {brandName}
          </span>
        </div>

        <div
          className="absolute left-0 right-0 px-3"
          style={{
            top: "32%",
            paddingInline: Math.max(12, 36 * scale),
          }}
        >
          <div
            className="font-semibold leading-tight"
            style={{
              color: "#fff",
              fontFamily: headingFont,
              fontSize: Math.max(14, 42 * scale),
              textShadow: "0 2px 18px rgba(0,0,0,0.35)",
            }}
          >
            {headline}
          </div>
          <p
            className="mt-2 opacity-90 line-clamp-3"
            style={{
              color: "#fff",
              fontFamily: bodyFont,
              fontSize: Math.max(10, 18 * scale),
              maxWidth: "92%",
            }}
          >
            {support}
          </p>
        </div>

        <div
          className="absolute left-0 right-0 flex justify-start"
          style={{
            bottom: Math.max(12, 36 * scale),
            paddingInline: Math.max(12, 36 * scale),
          }}
        >
          <span
            className="inline-flex items-center rounded-full font-medium"
            style={{
              backgroundColor: primary,
              color: "#fff",
              fontFamily: bodyFont,
              fontSize: Math.max(10, 16 * scale),
              padding: `${Math.max(4, 10 * scale)}px ${Math.max(10, 22 * scale)}px`,
            }}
          >
            {cta}
          </span>
        </div>

        <div className="absolute bottom-2 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[9px] text-white/90">
          Not generated
        </div>
      </div>

      {!compact && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Live sample only — updates as you edit the brief. AI concepts appear after you generate.
        </p>
      )}
    </div>
  );
}

/** Mini card for featured examples on the home dashboard. */
export function ExampleCreativeThumb({
  headline,
  supporting,
  cta,
  theme,
  label,
  onClick,
}: {
  headline: string;
  supporting: string;
  cta: string;
  theme: { bgFrom: string; bgTo: string; accent: string; text: string };
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border border-border overflow-hidden bg-card hover:border-primary/40 transition-colors shadow-soft"
    >
      <div
        className="relative aspect-[4/5] p-4 flex flex-col justify-between"
        style={{
          background: `linear-gradient(165deg, ${theme.bgFrom}, ${theme.bgTo})`,
          color: theme.text,
        }}
      >
        <Badge
          variant="secondary"
          className="w-fit text-[9px] uppercase bg-black/30 text-white border-0"
        >
          Example · {label}
        </Badge>
        <div>
          <div className="font-semibold text-lg leading-tight tracking-tight">{headline}</div>
          <p className="text-xs mt-1.5 opacity-80 line-clamp-2">{supporting}</p>
          <span
            className="inline-flex mt-3 rounded-full text-[10px] font-medium px-2.5 py-1"
            style={{ backgroundColor: theme.accent, color: theme.bgFrom }}
          >
            {cta}
          </span>
        </div>
      </div>
      <div className="px-3 py-2 text-[11px] text-muted-foreground group-hover:text-foreground">
        Use as starting brief →
      </div>
    </button>
  );
}
