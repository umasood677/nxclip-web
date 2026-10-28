import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdSceneGraph } from "../types";
import {
  validateCreativeContext,
  type CreativeContext,
} from "./contracts/ad-creative-proposals";
import { validateAdSceneGraphDto } from "./contracts/ad-scene-graph";

export type IntelligentContextBuildResult =
  | {
      ok: true;
      context: CreativeContext;
      /** Soft notice (e.g. unbound image layers); panel may still mount. */
      notice: string | null;
    }
  | {
      ok: false;
      code: string;
      reason: string;
      hardBlock: true;
    };

/** Resolve owner id from persisted auth shapes used across Login / App bootstrap. */
export function resolveIntelligentOwnerId(
  user: {
    uid?: string;
    id?: string;
    sub?: string;
    userId?: string;
  } | null,
): string {
  if (!user) return "";
  const raw = user.uid ?? user.id ?? user.sub ?? user.userId ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

function normalizeBrandColors(
  colors: BrandKitSummary["colors"] | undefined,
): string[] {
  return (colors ?? [])
    .map((c) => {
      const hex = c.hex?.trim() ?? "";
      if (!hex) return "";
      return hex.startsWith("#") ? hex : `#${hex}`;
    })
    .filter((h) => /^#[0-9a-fA-F]{6}$/.test(h));
}

function normalizeBrandVersion(version: unknown): number {
  if (typeof version === "number" && Number.isInteger(version) && version >= 0) {
    return version;
  }
  if (typeof version === "string" && /^\d+$/.test(version.trim())) {
    return Number.parseInt(version.trim(), 10);
  }
  return 1;
}

/**
 * Builds CreativeContext for the local synthetic Intelligent Ad Studio panel.
 * Does not fabricate Brand Kit / asset data. Returns hardBlock diagnostics when
 * required fields are missing; Soft-notices when some image layers lack assetId.
 */
export function buildIntelligentCreativeContext(input: {
  ownerUserId: string;
  projectId: string | null;
  creativeId: string;
  graph: AdSceneGraph;
  brandKit: BrandKitSummary | null;
  revision: number;
}): IntelligentContextBuildResult {
  const ownerId = input.ownerUserId?.trim() ?? "";
  if (!ownerId) {
    return {
      ok: false,
      code: "MISSING_OWNER",
      reason:
        "Signed-in user id is unavailable. Sign in again, then reopen the creative.",
      hardBlock: true,
    };
  }
  if (!input.projectId?.trim()) {
    return {
      ok: false,
      code: "MISSING_PROJECT",
      reason: "Open a project-backed creative to use Intelligent Ad Studio.",
      hardBlock: true,
    };
  }
  if (!input.creativeId?.trim()) {
    return {
      ok: false,
      code: "MISSING_CREATIVE",
      reason: "Creative id is missing; reload the editor.",
      hardBlock: true,
    };
  }
  if (!input.brandKit?.id) {
    return {
      ok: false,
      code: "MISSING_BRAND_KIT",
      reason:
        "Bind Zoe Artisan (or another Brand Kit) on the project, then regenerate or replace image layers with kit assets so Creative Director / DNA / Smart Canvas / Campaign Adapt can authorize references.",
      hardBlock: true,
    };
  }
  if (
    !Number.isInteger(input.revision) ||
    input.revision < 0
  ) {
    return {
      ok: false,
      code: "INVALID_REVISION",
      reason: "Creative revision must be a non-negative integer.",
      hardBlock: true,
    };
  }

  try {
    const dto = validateAdSceneGraphDto(input.graph as never);
    const imageLayers = dto.layers.filter(
      (l) => l.type === "image" || l.type === "logo",
    );
    const authorizedAssetIds = [
      ...new Set(
        imageLayers
          .map((l) => ("assetId" in l ? l.assetId : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const unboundImages = imageLayers.filter(
      (l) => !("assetId" in l) || !l.assetId,
    );
    /**
     * Template drafts use ids like `product-hero:image:product`. Matching `/product/i`
     * against the full id falsely tags every layer. Prefer name + final id segment.
     */
    const byRole = (re: RegExp) =>
      dto.layers
        .filter((l) => {
          const name = l.name ?? "";
          const tail = l.id.includes(":")
            ? (l.id.split(":").pop() ?? l.id)
            : l.id;
          return re.test(name) || re.test(tail);
        })
        .map((l) => l.id);
    const product = byRole(/^product$/i);
    const logo = byRole(/^logo$/i);
    const headline = byRole(/^headline$/i);
    const support = byRole(/^(support|supporting|body|sub)$/i);
    const cta = byRole(/^cta$/i);
    const colors = normalizeBrandColors(input.brandKit.colors);
    const fontFamilies = (input.brandKit.typography ?? [])
      .map((t) => t.family)
      .filter(Boolean) as string[];

    const ctx: CreativeContext = {
      ownerId,
      projectId: input.projectId,
      variationId: input.creativeId,
      revision: input.revision,
      graph: dto,
      roles: {
        product: product.length ? product : undefined,
        logo: logo.length ? logo : undefined,
        headline: headline.length ? headline : undefined,
        support: support.length ? support : undefined,
        cta: cta.length ? cta : undefined,
      },
      authorizedAssetIds,
      protectedLayerIds: [...product, ...logo],
      locks: [],
      creatorOverrides: {},
      brand: {
        kitId: input.brandKit.id,
        version: normalizeBrandVersion(input.brandKit.version),
        colors: colors.length ? colors : ["#111111", "#FFFFFF"],
        fontFamilies: fontFamilies.length ? fontFamilies : ["Inter"],
      },
      safeZone: {
        id: "editor-default",
        version: "1",
        source: "creatorConfigured",
        inset: { top: 0.06, right: 0.06, bottom: 0.06, left: 0.06 },
      },
      metadata: dto.creativeMetadata,
    };

    // Enforce the same contract Smart Canvas / Director use — never mount a
    // context that will throw INVALID_CONTEXT (or equivalent) during render.
    try {
      validateCreativeContext(ctx);
    } catch (e) {
      const code = e instanceof Error ? e.message : "INVALID_CONTEXT";
      // Unbound image layers: allow panel chrome with soft notice; feature
      // actions catch validate errors. Smart Canvas must also catch at render.
      if (
        code.startsWith("UNAUTHORIZED_ASSET_REFERENCE") &&
        unboundImages.length > 0
      ) {
        return {
          ok: true,
          context: ctx,
          notice: `${unboundImages.length} image/logo layer(s) lack Brand Kit assetId — bind or regenerate for product-safe proposals. Synthetic Director / DNA / Smart Canvas / Campaign Adapt remain available with limited authorization.`,
        };
      }
      return {
        ok: false,
        code,
        reason: `Creative context failed validation (${code}). Fix SceneGraph / Brand Kit binding, then reload.`,
        hardBlock: true,
      };
    }

    const notice =
      unboundImages.length > 0
        ? `${unboundImages.length} image/logo layer(s) lack Brand Kit assetId — bind or regenerate for product-safe proposals.`
        : null;
    return { ok: true, context: ctx, notice };
  } catch (e) {
    return {
      ok: false,
      code: "SCENE_GRAPH_INVALID",
      reason:
        e instanceof Error ? e.message : "Could not build intelligent context",
      hardBlock: true,
    };
  }
}

/** Safe Smart Canvas analysis — never throws to callers. */
export function safeAnalyzeSmartCanvas(
  analyze: (c: CreativeContext) => unknown[],
  context: CreativeContext,
): { findings: unknown[]; error: string | null } {
  try {
    return { findings: analyze(context), error: null };
  } catch (e) {
    return {
      findings: [],
      error: e instanceof Error ? e.message : "Smart Canvas analysis failed",
    };
  }
}
