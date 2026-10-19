/**
 * UX-2A.2 M3 — Preview scene composer.
 * Applies catalog geometry + Brand Kit asset ids into AdSceneGraph 1.0.
 * Never writes storageKey. Does not invent stock product/model imagery.
 */

import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdConcept, AdSceneGraph, AdSceneLayer } from "../types";
import { resolveConceptLayout } from "../lib/conceptVisual";
import { listBrandAssetsBySlotRole } from "./brandAssetUrls";
import {
  defaultTemplateIdForLayoutFamily,
  FORMAT_DIMENSIONS,
  getTemplateDef,
  isAdStudioTemplateId,
  type AdStudioTemplateId,
  type MissingAssetPolicy,
  type TemplateDef,
  type TemplateRegion,
  type TemplateSlotRole,
} from "./templateCatalog";
import { fontIdForBrandFamily } from "../lib/adStudioFontId";
import { sanitizeSceneGraphForClient } from "./sanitizeSceneGraph";

export type TemplatePreviewStatus = "ready" | "partial" | "blocked";

export type TemplatePreviewResult = {
  status: TemplatePreviewStatus;
  templateId: AdStudioTemplateId;
  templateName: string;
  layoutFamily: string;
  missingAssetPolicy: MissingAssetPolicy;
  missingRequiredSlotIds: string[];
  sceneGraph: AdSceneGraph | null;
  warnings: string[];
};

function regionBox(
  region: TemplateRegion,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round((region.x / 100) * width),
    y: Math.round((region.y / 100) * height),
    width: Math.round((region.w / 100) * width),
    height: Math.round((region.h / 100) * height),
  };
}

function findRegion(def: TemplateDef, id: string): TemplateRegion | undefined {
  return def.regions.find((r) => r.id === id);
}

function layerId(
  templateId: string,
  kind: string,
  regionId: string,
  i?: number,
): string {
  const base = `${templateId}:${kind}:${regionId}`;
  return i == null ? base : `${base}:${i}`;
}

function gridCell(
  box: { x: number; y: number; width: number; height: number },
  index: number,
  count: number,
) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cellW = Math.floor(box.width / cols);
  const cellH = Math.floor(box.height / rows);
  return {
    x: box.x + col * cellW,
    y: box.y + row * cellH,
    width: cellW,
    height: cellH,
  };
}

function resolvePalette(brand?: BrandKitSummary | null) {
  const colors = brand?.colors ?? [];
  const pick = (role: string, fallback: string) =>
    colors.find((c) => c.role === role)?.hex ?? fallback;
  const primary = pick("primary", colors[0]?.hex ?? "#111827");
  const secondary = pick("secondary", colors[1]?.hex ?? "#FFFFFF");
  const accent = pick("accent", colors[2]?.hex ?? primary);
  const background = pick("background", primary);
  const text = pick("text", secondary);
  return { primary, secondary, accent, background, text };
}

function brandGradientFill(palette: ReturnType<typeof resolvePalette>): string {
  return `linear-gradient(160deg, ${palette.background} 0%, ${palette.primary}55 55%, ${palette.background} 100%)`;
}

function resolveFonts(brand?: BrandKitSummary | null) {
  const ty = brand?.typography ?? [];
  const pick = (role: string, fallback: string) =>
    ty.find((t) => t.role === role)?.family ?? fallback;
  return {
    headline: pick("heading", ty[0]?.family ?? "Montserrat"),
    body: pick("body", ty[1]?.family ?? "Inter"),
    cta: pick("cta", ty[0]?.family ?? "Montserrat"),
  };
}

const fontIdForFamily = fontIdForBrandFamily;

export function resolveTemplateIdForConcept(
  concept: AdConcept,
): AdStudioTemplateId {
  if (isAdStudioTemplateId(concept.templateId)) return concept.templateId;
  return defaultTemplateIdForLayoutFamily(resolveConceptLayout(concept));
}

/**
 * Compose a preview AdSceneGraph for gallery / live preview.
 * Prefer server-provided concept.sceneGraph when present (sanitized).
 */
export function composeTemplatePreview(input: {
  concept: AdConcept;
  brand?: BrandKitSummary | null;
  outputFormat: string;
}): TemplatePreviewResult {
  const { concept, brand, outputFormat } = input;
  const templateId = resolveTemplateIdForConcept(concept);
  const def = getTemplateDef(templateId);
  const warnings: string[] = [];

  if (concept.sceneGraph) {
    const sanitized = sanitizeSceneGraphForClient(concept.sceneGraph);
    return {
      status: "ready",
      templateId,
      templateName: def.name,
      layoutFamily: def.layoutFamily,
      missingAssetPolicy: def.missingAssetPolicy,
      missingRequiredSlotIds: [],
      sceneGraph: sanitized,
      warnings,
    };
  }

  const dims =
    FORMAT_DIMENSIONS[outputFormat] ?? FORMAT_DIMENSIONS.portrait_1080x1350!;
  const { width, height } = dims;
  const palette = resolvePalette(brand);
  const fonts = resolveFonts(brand);

  const bound = new Map<TemplateSlotRole, ReturnType<typeof listBrandAssetsBySlotRole>>();
  for (const slot of def.slots) {
    const assets = listBrandAssetsBySlotRole(brand, slot.slotId).slice(
      0,
      slot.maxCount,
    );
    bound.set(slot.slotId, assets);
  }

  const missingRequired = def.slots
    .filter((s) => s.required && !(bound.get(s.slotId)?.length))
    .map((s) => s.slotId);

  if (
    missingRequired.length > 0 &&
    def.missingAssetPolicy === "blockPreview"
  ) {
    return {
      status: "blocked",
      templateId,
      templateName: def.name,
      layoutFamily: def.layoutFamily,
      missingAssetPolicy: def.missingAssetPolicy,
      missingRequiredSlotIds: missingRequired,
      sceneGraph: null,
      warnings: [
        ...warnings,
        `Missing required slots: ${missingRequired.join(", ")}`,
      ],
    };
  }

  const layers: AdSceneLayer[] = [];
  const filledImageRegions = new Set<string>();
  let emittedHint = false;

  const headlineText =
    concept.primaryHeadline?.trim() ||
    (templateId === "minimal-editorial" ? brand?.name ?? "Brand" : "Headline");
  const supportingText =
    concept.supportingCopy?.trim() || concept.creativeDirection?.trim() || "";
  const ctaText = concept.cta?.trim() || "Learn more";

  for (const recipe of def.layers) {
    const region = findRegion(def, recipe.regionId);
    if (!region) continue;
    const box = regionBox(region, width, height);

    if (recipe.kind === "background") {
      const bgDef = def.background;
      if (bgDef.mode === "slot" && bgDef.slotId) {
        const assets = bound.get(bgDef.slotId) ?? [];
        const asset = assets[0];
        if (asset) {
          layers.push({
            id: layerId(templateId, "background", recipe.regionId),
            type: "image",
            name: "Background",
            x: 0,
            y: 0,
            width,
            height,
            zIndex: recipe.zIndex,
            assetId: asset.assetId,
            objectFit: "cover",
          });
        }
        continue;
      }
      if (bgDef.mode === "brandGradient") {
        layers.push({
          id: layerId(templateId, "background", recipe.regionId),
          type: "shape",
          name: "Background",
          shape: "rectangle",
          x: 0,
          y: 0,
          width,
          height,
          zIndex: recipe.zIndex,
          fill: brandGradientFill(palette),
        });
        continue;
      }
      // solid — canvas.backgroundColor only (matches server TemplateEngine).
      continue;
    }

    if (recipe.kind === "shapeAccent") {
      layers.push({
        id: layerId(templateId, "shapeAccent", recipe.regionId),
        type: "shape",
        name: "Accent band",
        shape: "rectangle",
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        zIndex: recipe.zIndex,
        fill: palette.primary,
      });
      continue;
    }

    if (recipe.kind === "headline" || recipe.kind === "supporting") {
      const typo =
        recipe.kind === "headline" ? def.typography.headline : def.typography.body;
      const text = recipe.kind === "headline" ? headlineText : supportingText;
      const family =
        recipe.kind === "headline" ? fonts.headline : fonts.body;
      layers.push({
        id: layerId(templateId, recipe.kind, recipe.regionId),
        type: "text",
        name: recipe.kind === "headline" ? "Headline" : "Supporting copy",
        text,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        zIndex: recipe.zIndex,
        fontFamily: family,
        fontId: fontIdForFamily(family),
        fontSize: Math.max(12, Math.round(width * 0.055 * typo.sizeScale)),
        fontWeight: typo.weight,
        color: palette.text,
        align: typo.align,
        opacity: recipe.kind === "supporting" ? 0.92 : 1,
      });
      continue;
    }

    if (recipe.kind === "cta") {
      const typo = def.typography.cta;
      layers.push({
        id: layerId(templateId, "cta", recipe.regionId),
        type: "shape",
        name: "CTA button",
        shape: "roundedRectangle",
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        zIndex: recipe.zIndex,
        fill: palette.accent,
        cornerRadius: Math.round(box.height * 0.35),
        text: ctaText,
        textColor: "#FFFFFF",
        fontFamily: fonts.cta,
        fontSize: Math.max(12, Math.round(box.height * typo.sizeScale)),
      });
      continue;
    }

    if (recipe.kind === "imageSlot" || recipe.kind === "logoSlot") {
      const slotId = recipe.slotId;
      if (!slotId) continue;
      const assets = bound.get(slotId) ?? [];
      const slotDef = def.slots.find((s) => s.slotId === slotId);

      if (
        recipe.kind === "imageSlot" &&
        (slotId === "model" || slotId === "campaign") &&
        filledImageRegions.has(recipe.regionId)
      ) {
        continue;
      }

      if (!assets.length) {
        if (
          def.missingAssetPolicy === "showSlotHint" ||
          (!slotDef?.required && def.missingAssetPolicy !== "blockPreview")
        ) {
          if (!filledImageRegions.has(recipe.regionId)) {
            layers.push({
              id: layerId(
                templateId,
                "slotHint",
                `${recipe.regionId}:${slotId}`,
              ),
              type: "shape",
              name: `Missing: ${slotDef?.label ?? slotId}`,
              shape: "roundedRectangle",
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
              zIndex: recipe.zIndex,
              fill: "rgba(15,23,42,0.08)",
              strokeColor: palette.accent,
              strokeWidth: 2,
              cornerRadius: Math.round(Math.min(box.width, box.height) * 0.04),
              text: `Add ${slotDef?.label ?? slotId}`,
              textColor: palette.text,
              fontFamily: fonts.body,
              fontSize: Math.max(11, Math.round(width * 0.028)),
            });
            filledImageRegions.add(recipe.regionId);
            emittedHint = true;
          }
        }
        continue;
      }

      const isLogo = recipe.kind === "logoSlot";
      if (assets.length === 1) {
        const asset = assets[0]!;
        layers.push({
          id: layerId(templateId, isLogo ? "logo" : "image", recipe.regionId),
          type: isLogo ? "logo" : "image",
          name: asset.label ?? (isLogo ? "Brand logo" : slotDef?.label ?? slotId),
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          zIndex: recipe.zIndex,
          assetId: asset.assetId,
          objectFit: slotDef?.objectFit ?? (isLogo ? "contain" : "cover"),
        });
        if (recipe.kind === "imageSlot") {
          filledImageRegions.add(recipe.regionId);
        }
      } else {
        assets.forEach((asset, i) => {
          const cell = gridCell(box, i, assets.length);
          layers.push({
            id: layerId(templateId, "image", recipe.regionId, i),
            type: "image",
            name: asset.label ?? `${slotId}-${i + 1}`,
            x: cell.x,
            y: cell.y,
            width: cell.width,
            height: cell.height,
            zIndex: recipe.zIndex + i,
            assetId: asset.assetId,
            objectFit: slotDef?.objectFit ?? "contain",
          });
        });
        filledImageRegions.add(recipe.regionId);
      }
    }
  }

  layers.sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));

  const sceneGraph = sanitizeSceneGraphForClient({
    schemaVersion: "1.0",
    canvas: {
      width,
      height,
      backgroundColor: palette.background,
    },
    layers,
  });

  const status: TemplatePreviewStatus =
    missingRequired.length > 0 || emittedHint ? "partial" : "ready";

  return {
    status,
    templateId,
    templateName: def.name,
    layoutFamily: def.layoutFamily,
    missingAssetPolicy: def.missingAssetPolicy,
    missingRequiredSlotIds: missingRequired,
    sceneGraph,
    warnings,
  };
}
