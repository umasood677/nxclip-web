import React, { useState } from "react";
import { cn } from "../../../lib/utils";
import type { NormalizedBrandContext } from "../../BrandKits/lib/brandContext";

type Aspect = "portrait" | "square" | "story" | "landscape";

type Props = {
  /** Template / brief layout preview — always the primary visual. */
  fallbackSrc: string;
  alt: string;
  brand?: NormalizedBrandContext | null;
  aspect?: Aspect;
  headline?: string;
  className?: string;
  /**
   * How to place Brand Kit product/model: never replaces the layout image.
   * - badge: logo + palette + kit name only (default)
   * - inset: small product/model chip over the layout
   */
  assetMode?: "badge" | "inset";
};

/**
 * Home card preview: keeps the template/brief layout image, then layers
 * Brand Kit identity (logo, palette, optional product inset) for UAT visibility.
 */
export function BrandHomePreview({
  fallbackSrc,
  alt,
  brand,
  aspect = "portrait",
  headline,
  className,
  assetMode = "inset",
}: Props) {
  const [failed, setFailed] = useState(false);
  const primary = brand?.colors.primary || "#2a2f3a";
  const secondary =
    brand?.colors.secondary || brand?.colors.background || "#0c0d10";
  const accent = brand?.colors.accent || "#c4a574";
  const text = brand?.colors.text || "#f4f1ea";
  const logo = brand?.assets.logoUrl;
  const productOrModel =
    brand?.assets.productUrl || brand?.assets.modelUrl || null;
  const palette =
    brand?.colors.all
      .map((c) => c.hex)
      .filter(Boolean)
      .slice(0, 4) ?? [];

  return (
    <div
      className={cn(
        "w0a-brand-preview",
        aspect === "story" && "w0a-brand-preview--story",
        aspect === "square" && "w0a-brand-preview--square",
        aspect === "landscape" && "w0a-brand-preview--landscape",
        brand && "w0a-brand-preview--branded",
        className,
      )}
      style={
        brand
          ? {
              boxShadow: `inset 0 0 0 2px ${accent}55`,
            }
          : undefined
      }
    >
      {/* Layout / composition sample — never swapped for product-only */}
      {failed ? (
        <div className="w0a-brand-preview__layout flex items-center justify-center text-xs text-muted-foreground">
          Illustrative preview unavailable
        </div>
      ) : (
        <img
          onError={() => setFailed(true)}
          className="w0a-brand-preview__layout"
          src={fallbackSrc}
          alt={alt}
          loading="lazy"
        />
      )}

      {brand ? (
        <div
          className="w0a-brand-preview__wash"
          style={{
            background: `linear-gradient(180deg, ${secondary}33 0%, transparent 40%, ${primary}66 100%)`,
          }}
          aria-hidden
        />
      ) : null}

      {logo ? (
        <img
          key={logo}
          className="w0a-brand-preview__logo"
          src={logo}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : brand ? (
        <span
          className="w0a-brand-preview__mark"
          style={{
            color: text,
            borderColor: accent,
            background: `${secondary}cc`,
          }}
        >
          {(brand.name || "B").slice(0, 1).toUpperCase()}
        </span>
      ) : null}

      {brand && assetMode === "inset" && productOrModel ? (
        <div
          key={productOrModel}
          className="w0a-brand-preview__inset"
          aria-hidden
        >
          <img
            src={productOrModel}
            alt=""
            onError={(e) => {
              e.currentTarget.parentElement!.style.display = "none";
            }}
          />
        </div>
      ) : null}

      {headline ? (
        <p className="w0a-brand-preview__headline" style={{ color: text }}>
          {headline}
        </p>
      ) : null}

      {palette.length ? (
        <div className="w0a-brand-preview__palette" aria-hidden>
          {palette.map((hex) => (
            <span key={hex} style={{ backgroundColor: hex }} />
          ))}
        </div>
      ) : null}

      {brand ? (
        <span className="w0a-brand-preview__kit" style={{ color: accent }}>
          {brand.name}
        </span>
      ) : null}
    </div>
  );
}

export function aspectForFormat(formatId: string): Aspect {
  if (formatId === "vertical_1080x1920") return "story";
  if (formatId === "square_1080") return "square";
  if (formatId === "landscape_1920x1080") return "landscape";
  return "portrait";
}
