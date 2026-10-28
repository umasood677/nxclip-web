import { AD_FORMATS } from "../types";
import { characterReviewIssues } from "../../BrandKits/guided/brandCharacterModel";
import { newWorkspaceProject, exampleBriefContext } from "./projectWorkspace";
import type { FeaturedExample } from "./exampleCreatives";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { WorkspaceProject } from "./projectWorkspace";
import type { BrandTemplate } from "../../BrandKits/templates/brandTemplateModel";
import { canReuseTemplate } from "../../BrandKits/templates/brandTemplateModel";
export function homeEntryPath(input: {
  brandId?: string;
  exampleId?: string;
  templateId?: string;
  format?: string;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input))
    if (value) query.set(key, value);
  return "/create/ad/new" + (query.size ? "?" + query : "");
}
export function scopedHomeProjects<T extends { brandKitId?: string | null }>(
  projects: T[],
  brandId: string,
): T[] {
  return projects.filter((project) => (project.brandKitId || "") === brandId);
}
export function reusableHomeTemplates(items: BrandTemplate[], brandId: string) {
  if (items.some((item) => item.brandKitId !== brandId))
    throw Error(
      "Brand Template ownership context changed. Reload before continuing.",
    );
  return items.filter(canReuseTemplate);
}
/** Explicit project save only. A home click never creates a creative or an orphan campaign. */
export function entryProjectBody(input: {
  name: string;
  idea: string;
  brandId: string;
  example?: FeaturedExample;
  format?: string;
}) {
  if (input.format && !AD_FORMATS.some((format) => format.id === input.format))
    throw Error("Choose a supported advertisement format.");
  const base = newWorkspaceProject(input.name, input.idea, input.brandId);
  const {
    name: _name,
    brandKitId: _brand,
    brandPreview: _preview,
    ...defaults
  } = input.example?.briefDefaults || {};
  void _name;
  void _brand;
  void _preview;
  return {
    ...base,
    brief: {
      ...base.brief,
      ...defaults,
      ...(input.example ? exampleBriefContext(input.example) : {}),
      campaignIdea: input.idea,
      ...(input.format ? { outputFormat: input.format } : {}),
    },
  };
}
export async function saveEntryProject(
  api: {
    createProject: (
      body: ReturnType<typeof entryProjectBody>,
    ) => Promise<WorkspaceProject>;
  },
  input: Parameters<typeof entryProjectBody>[0],
  blockers: string[] = [],
) {
  if (blockers.length) throw Error(blockers.join(" "));
  const project = await api.createProject(entryProjectBody(input));
  if (!project?.id)
    throw Error(
      "Project creation did not return a saved project. Check your projects before retrying.",
    );
  return project;
}
/** Client readiness aid only; server authorization and template binding remain authoritative. */
export function selectedBrandAssetReadiness(
  kit: BrandKitSummary | null,
  roles: string[],
): string[] {
  if (!kit) return [];
  return roles
    .filter((role) => {
      const aliases =
        role === "logo_primary"
          ? ["logo_primary", "logo_light", "logo_dark", "logo_mark"]
          : role === "products"
            ? ["product_image"]
            : [role];
      const candidates =
        kit.assets?.filter(
          (asset) =>
            aliases.includes(asset.role || "") && asset.status === "ready",
        ) || [];
      if (role !== "brand_model") return !candidates.length;
      return !candidates.some((asset) =>
        kit.voice?.studio?.characters?.some(
          (character) =>
            character.status === "approved" &&
            character.permissions.scopes.includes("ad-studio") &&
            character.referenceAssetIds.includes(asset.id) &&
            !characterReviewIssues(character, kit.assets || []).length,
        ),
      );
    })
    .map((role) =>
      role === "brand_model"
        ? "A ready model reference with approved Ad Studio commercial/likeness authorization is required."
        : `Missing uploaded ${role.replace(/_/g, " ")}. Review this Brand Kit before creating the creative.`,
    );
}
