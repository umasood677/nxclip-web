import React from "react";
import { resolveBrandFontFamily } from "../lib/brandFontCatalog";
import type { BrandKitSummary } from "../lib/brandKitTypes";

type Props = {
  kit: Pick<BrandKitSummary, "name" | "description" | "voice" | "colors" | "typography">;
  className?: string;
};

/** Deterministic identity card — no AI. */
export function BrandIdentityPreview({ kit, className }: Props) {
  const primary =
    kit.colors?.find((c) => c.role === "primary")?.hex ?? "#0F172A";
  const secondary =
    kit.colors?.find((c) => c.role === "secondary")?.hex ?? "#38BDF8";
  const bg =
    kit.colors?.find((c) => c.role === "background")?.hex ?? "#FFFFFF";
  const text =
    kit.colors?.find((c) => c.role === "text")?.hex ?? primary;
  const heading =
    kit.typography?.find((t) => t.role === "heading")?.family ?? "Montserrat";
  const body =
    kit.typography?.find((t) => t.role === "body")?.family ?? "Inter";

  return (
    <div
      className={className}
      style={{ backgroundColor: bg, color: text }}
    >
      <div
        className="h-1.5 w-full rounded-t-xl"
        style={{
          background: `linear-gradient(90deg, ${primary}, ${secondary})`,
        }}
      />
      <div className="space-y-2 p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] opacity-60">
          Sample identity · not AI
        </p>
        <h3
          className="text-xl font-semibold leading-tight"
          style={{ fontFamily: resolveBrandFontFamily(heading) }}
        >
          {kit.name || "Brand name"}
        </h3>
        {kit.voice?.tagline ? (
          <p
            className="text-sm opacity-90"
            style={{ fontFamily: resolveBrandFontFamily(body) }}
          >
            {kit.voice.tagline}
          </p>
        ) : null}
        <p
          className="text-xs opacity-70 line-clamp-3"
          style={{ fontFamily: resolveBrandFontFamily(body) }}
        >
          {kit.description?.trim() ||
            kit.voice?.targetAudience ||
            "Add a description to see it here."}
        </p>
        <div className="flex gap-1.5 pt-1">
          {[primary, secondary, kit.colors?.find((c) => c.role === "accent")?.hex]
            .filter(Boolean)
            .map((hex) => (
              <span
                key={hex as string}
                className="h-6 w-6 rounded-md border border-black/10"
                style={{ backgroundColor: hex as string }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
