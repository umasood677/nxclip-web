import { useEffect, useState } from "react";
import { FontLoaderService } from "../../../lib/clipTypography/FontLoaderService";
import {
  FONT_MANIFEST,
  type FontEntry,
  type FontStyle,
} from "../../../lib/clipTypography/registry";
import source from "../../../lib/clipTypography/font-source-lock.json";
import type { FontPackageLock } from "../../../lib/clipTypography/packageTypes";
import type { BrandTypographyEntry } from "./brandKitTypes";
const lock = source as unknown as FontPackageLock;
const loaders = new Map<string, FontLoaderService>();
export const brandFontKey = (entry: BrandTypographyEntry) =>
  [entry.family, entry.weight || "400", entry.style || "normal"].join("/");
export function brandFontPlan(entry: BrandTypographyEntry) {
  const font = FONT_MANIFEST.fonts.find(
    (f) =>
      f.family.toLowerCase() === entry.family.toLowerCase() ||
      f.id === entry.family,
  );
  const weight = Number(entry.weight || 400),
    style: FontStyle = entry.style === "italic" ? "italic" : "normal";
  if (!font || !Number.isFinite(weight)) return null;
  let face = font.faces.find((f) => f.weight === weight && f.style === style);
  if (!face) {
    const original = lock.families
      .find((f) => f.id === font.id)
      ?.faces.find(
        (f) =>
          f.style === style &&
          f.original.inspection.kind === "variable" &&
          f.original.inspection.axes.wght?.min <= weight &&
          f.original.inspection.axes.wght?.max >= weight,
      )?.original;
    if (!original) return null;
    face = {
      ...font.faces[0],
      id: `${font.id}-${weight}-${style}`,
      exportSupport: "blocked",
      exportEvidence: null,
      blockers: [
        "Brand browser preview only; canonical worker parity unchanged",
      ],
      weight,
      style,
      browser: {
        availability: "packaged",
        format: "truetype",
        runtimeVerified: false,
        requirements: ["Brand preview only; worker export support unchanged"],
        assets: [
          {
            path: original.path,
            sha256: original.sha256,
            url: original.path.replace(/^public/, ""),
            deliveryRelease: lock.assetVersion,
            subset: "full",
            cssUnicodeRange: original.inspection.unicodeRanges.join(","),
            inspection: original.inspection,
          },
        ],
      },
    };
  }
  return {
    id: font.id,
    weight,
    style,
    family: `NxClip T2 ${font.family}`,
    font: { ...font, faces: [face] } as FontEntry,
  };
}
export type BrandFontPreview = {
  family: string;
  weight: number;
  style: FontStyle;
  status: "loading" | "loaded" | "unavailable";
  note: string;
};
export async function loadBrandFontPreviews(
  entries: BrandTypographyEntry[],
  sample: string,
) {
  const result: Record<string, BrandFontPreview> = {};
  await Promise.all(
    entries.map(async (entry) => {
      const key = brandFontKey(entry),
        plan = brandFontPlan(entry);
      const fallback: BrandFontPreview = {
        family: "sans-serif",
        weight: 400,
        style: "normal",
        status: "unavailable",
        note: "Exact font face unavailable; fallback preview shown. Saved font choice is unchanged.",
      };
      if (!plan) {
        result[key] = fallback;
        return;
      }
      try {
        let loader = loaders.get(key);
        if (!loader) {
          loader = new FontLoaderService(undefined, 20000, {
            fonts: [plan.font],
          });
          loaders.set(key, loader);
        }
        await loader.loadFont(plan.id, plan.weight, plan.style, sample);
        result[key] = {
          family: plan.family,
          weight: plan.weight,
          style: plan.style,
          status: "loaded",
          note: "Bundled font loaded and checksum verified",
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "";
        const category = /timeout/i.test(reason)
          ? "local font load timed out"
          : /checksum/i.test(reason)
            ? "font checksum did not match"
            : /codepoint|subset/i.test(reason)
              ? "sample contains unsupported characters"
              : /HTTP/i.test(reason)
                ? "local font file could not be read"
                : "browser could not load this face";
        result[key] = {
          ...fallback,
          note: `${category}. Fallback preview shown; saved font choice is unchanged.`,
        };
      }
    }),
  );
  return result;
}
export function useBrandFontPreviews(
  entries: BrandTypographyEntry[],
  sample: string,
  attempt = 0,
) {
  const signature = JSON.stringify(
      entries.map((e) => ({
        family: e.family,
        weight: e.weight,
        style: e.style,
      })),
    ),
    [fonts, setFonts] = useState<Record<string, BrandFontPreview>>({});
  useEffect(() => {
    let active = true;
    const input = JSON.parse(signature) as BrandTypographyEntry[];
    setFonts({});
    void loadBrandFontPreviews(input, sample).then((result) => {
      if (active) setFonts(result);
    });
    return () => {
      active = false;
    };
  }, [signature, sample, attempt]);
  return fonts;
}
