import { useAuthenticatedBrandAssetUrls } from "../../AdStudio/canvas/useAuthenticatedBrandAssetUrls";
import React from "react";
import { cn } from "../../../lib/utils";
import { findReadyAsset } from "../lib/assetSlots";
import { resolveBrandFontFamily } from "../lib/brandFontCatalog";
import {
  PREVIEW_MODES,
  type BrandKitSummary,
  type PreviewMode,
} from "../lib/brandKitTypes";

type Props = {
  kit: BrandKitSummary;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  className?: string;
};

function color(kit: BrandKitSummary, role: string, fallback: string): string {
  return kit.colors?.find((c) => c.role === role)?.hex ?? fallback;
}

function SampleBadge() {
  return (
    <span className="absolute left-2 top-2 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
      Sample layout Â· not AI
    </span>
  );
}

export function BrandKitLivePreview({
  kit,
  mode,
  onModeChange,
  className,
}: Props) {
  const assetUrls = useAuthenticatedBrandAssetUrls(kit);
  kit = {
    ...kit,
    assets: kit.assets?.map((asset) => ({
      ...asset,
      readUrl: assetUrls[asset.id] || null,
    })),
  };
  const primary = color(kit, "primary", "#0F172A");
  const secondary = color(kit, "secondary", "#38BDF8");
  const accent = color(kit, "accent", "#F59E0B");
  const bg = color(kit, "background", "#FFFFFF");
  const text = color(kit, "text", primary);
  const heading =
    kit.typography?.find((t) => t.role === "heading")?.family ?? "Montserrat";
  const body =
    kit.typography?.find((t) => t.role === "body")?.family ?? "Inter";
  const ctaFont =
    kit.typography?.find((t) => t.role === "cta")?.family ?? heading;
  const logo =
    findReadyAsset(kit.assets, "logo_primary") ||
    findReadyAsset(kit.assets, "logo_dark") ||
    findReadyAsset(kit.assets, "logo_light");
  const product = findReadyAsset(kit.assets, "product_image");
  const model = findReadyAsset(kit.assets, "brand_model");
  const headline =
    (kit.voice?.exampleHeadlines as string[] | undefined)?.[0] ||
    kit.voice?.tagline ||
    kit.name ||
    "Brand headline";
  const cta = kit.voice?.preferredCta || "Shop now";
  const productName = kit.voice?.signatureProduct || "Signature product";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-1">
        {PREVIEW_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              mode === m.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "identity" ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{ backgroundColor: bg, color: text }}
        >
          <SampleBadge />
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${primary}, ${secondary})`,
            }}
          />
          <div className="space-y-2 p-4 pt-8">
            {logo?.readUrl ? (
              <img src={logo.readUrl} alt="" className="h-10 object-contain" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                {(kit.name || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <h3
              className="text-xl font-semibold leading-tight"
              style={{ fontFamily: resolveBrandFontFamily(heading) }}
            >
              {kit.name || "Brand name"}
            </h3>
            <p
              className="text-sm opacity-90"
              style={{ fontFamily: resolveBrandFontFamily(body) }}
            >
              {kit.voice?.tagline || "Add a tagline to see it here."}
            </p>
            <p
              className="text-xs opacity-70 line-clamp-3"
              style={{ fontFamily: resolveBrandFontFamily(body) }}
            >
              {kit.description?.trim() ||
                kit.voice?.targetAudience ||
                "Description and audience appear in this sample card."}
            </p>
          </div>
        </div>
      ) : null}

      {mode === "typography" ? (
        <div className="relative space-y-3 overflow-hidden rounded-2xl border border-border bg-background p-4 pt-8">
          <SampleBadge />
          <p
            className="text-2xl font-semibold"
            style={{ fontFamily: resolveBrandFontFamily(heading), color: text }}
          >
            {headline}
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: resolveBrandFontFamily(body) }}
          >
            Body copy uses your selected type. The quick brown fox jumps over
            the lazy dog — 0123456789.
          </p>
          <p
            className="inline-flex rounded-md px-3 py-1.5 text-sm font-semibold text-white"
            style={{
              fontFamily: resolveBrandFontFamily(ctaFont),
              backgroundColor: primary,
            }}
          >
            {cta}
          </p>
        </div>
      ) : null}

      {mode === "palette" ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-4 pt-8 space-y-3">
          <SampleBadge />
          <div className="grid grid-cols-5 gap-2">
            {[
              ["Primary", primary],
              ["Secondary", secondary],
              ["Accent", accent],
              ["Background", bg],
              ["Text", text],
            ].map(([label, hex]) => (
              <div key={label} className="space-y-1">
                <div
                  className="aspect-square rounded-lg border border-border"
                  style={{ backgroundColor: hex }}
                />
                <p className="text-[10px] text-muted-foreground truncate">
                  {label}
                </p>
                <p className="text-[10px] font-mono truncate">{hex}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "ig_portrait" ? (
        <div
          className="relative mx-auto aspect-[4/5] w-full max-w-[240px] overflow-hidden rounded-2xl border border-border shadow-sm"
          style={{ backgroundColor: primary }}
        >
          <SampleBadge />
          {model?.readUrl || product?.readUrl ? (
            <img
              src={(model?.readUrl || product?.readUrl) as string}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50" />
          )}
          <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white">
            {logo?.readUrl ? (
              <img src={logo.readUrl} alt="" className="h-6 object-contain" />
            ) : null}
            <p
              className="text-sm font-semibold leading-snug"
              style={{ fontFamily: resolveBrandFontFamily(heading) }}
            >
              {headline}
            </p>
            <span
              className="inline-block rounded px-2 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: accent, color: "#111" }}
            >
              {cta}
            </span>
          </div>
        </div>
      ) : null}

      {mode === "ig_story" ? (
        <div
          className="relative mx-auto aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-2xl border border-border"
          style={{
            background: `linear-gradient(160deg, ${primary}, ${secondary})`,
          }}
        >
          <SampleBadge />
          {model?.readUrl ? (
            <img
              src={model.readUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-80"
            />
          ) : null}
          <div className="absolute inset-0 flex flex-col justify-between p-3 pt-8 text-white">
            <div className="text-[10px] uppercase tracking-[0.16em] opacity-80">
              {kit.name || "Brand"}
            </div>
            <div className="space-y-2">
              <p
                className="text-base font-semibold leading-tight"
                style={{ fontFamily: resolveBrandFontFamily(heading) }}
              >
                {headline}
              </p>
              <p
                className="text-[10px] opacity-90"
                style={{ fontFamily: resolveBrandFontFamily(body) }}
              >
                Sample story frame
              </p>
              <span
                className="inline-block rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-black"
                style={{ fontFamily: resolveBrandFontFamily(ctaFont) }}
              >
                {cta}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "product" ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-border p-4 pt-8"
          style={{ backgroundColor: bg, color: text }}
        >
          <SampleBadge />
          <div className="flex gap-3 items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
              {product?.readUrl ? (
                <img
                  src={product.readUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-2 text-center text-[10px] text-muted-foreground">
                  Example product frame
                </span>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              {logo?.readUrl ? (
                <img src={logo.readUrl} alt="" className="h-5 object-contain" />
              ) : null}
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: resolveBrandFontFamily(heading) }}
              >
                {productName}
              </p>
              <p
                className="text-xs opacity-70 line-clamp-2"
                style={{ fontFamily: resolveBrandFontFamily(body) }}
              >
                {kit.voice?.tagline || "Product promotion sample"}
              </p>
              <span
                className="inline-block rounded px-2 py-1 text-[10px] font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {cta}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {(mode === "logo_light" || mode === "logo_dark") && (
        <div
          className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-border"
          style={{
            backgroundColor: mode === "logo_light" ? "#F8FAFC" : "#0B0F19",
          }}
        >
          <SampleBadge />
          {(() => {
            const preferred =
              mode === "logo_light"
                ? findReadyAsset(kit.assets, "logo_dark") ||
                  findReadyAsset(kit.assets, "logo_primary")
                : findReadyAsset(kit.assets, "logo_light") ||
                  findReadyAsset(kit.assets, "logo_primary");
            if (preferred?.readUrl) {
              return (
                <img
                  src={preferred.readUrl}
                  alt=""
                  className="max-h-20 max-w-[70%] object-contain"
                />
              );
            }
            return (
              <p
                className={cn(
                  "text-sm font-semibold",
                  mode === "logo_dark" ? "text-white" : "text-slate-900",
                )}
                style={{ fontFamily: resolveBrandFontFamily(heading) }}
              >
                {kit.name || "Logo placeholder"}
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/** @deprecated Prefer BrandKitLivePreview — kept for any residual imports. */
export function BrandIdentityPreview({
  kit,
  className,
}: {
  kit: BrandKitSummary;
  className?: string;
}) {
  return (
    <BrandKitLivePreview
      kit={kit}
      mode="identity"
      onModeChange={() => undefined}
      className={className}
    />
  );
}
