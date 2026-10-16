import { brandApi } from "../../../services/apiClient";
import type { BrandKitSummary } from "./brandKitTypes";
import { isImportable, type MappedImportKit } from "./brandKitImportMap";

export type ImportMode = "create" | "update";

export type ImportKitPlan = {
  mapped: MappedImportKit;
  selected: boolean;
  mode: ImportMode;
  /** Required when mode === update */
  existingId?: string;
};

export type ImportKitResult = {
  fingerprint: string;
  name: string;
  status: "success" | "skipped" | "failed";
  kitId?: string;
  error?: string;
};

/**
 * Execute import via existing owner-scoped brand APIs.
 * Per-kit atomicity: create/update + colors + typography; failures don't roll back other kits.
 * Assets are never auto-attached (re-upload required).
 */
export async function executeBrandKitImport(
  plans: ImportKitPlan[],
  onProgress?: (done: number, total: number, last: ImportKitResult) => void,
): Promise<ImportKitResult[]> {
  const selected = plans.filter((p) => p.selected);
  const results: ImportKitResult[] = [];
  let done = 0;

  for (const plan of selected) {
    const { mapped } = plan;
    if (!isImportable(mapped)) {
      const result: ImportKitResult = {
        fingerprint: mapped.fingerprint,
        name: mapped.portable.brand.name,
        status: "skipped",
        error: mapped.issues
          .filter((i) => i.level === "error")
          .map((i) => i.message)
          .join("; "),
      };
      results.push(result);
      done += 1;
      onProgress?.(done, selected.length, result);
      continue;
    }

    if (plan.mode === "update" && !plan.existingId) {
      const result: ImportKitResult = {
        fingerprint: mapped.fingerprint,
        name: mapped.portable.brand.name,
        status: "failed",
        error: "Update selected without an existing Brand Kit id",
      };
      results.push(result);
      done += 1;
      onProgress?.(done, selected.length, result);
      continue;
    }

    try {
      let kit: BrandKitSummary;
      if (plan.mode === "update" && plan.existingId) {
        kit = (await brandApi.updateKit(plan.existingId, {
          name: mapped.createPayload.name,
          description: mapped.createPayload.description ?? null,
          guidelines: mapped.createPayload.guidelines ?? null,
          voice: mapped.createPayload.voice,
        })) as BrandKitSummary;
      } else {
        kit = (await brandApi.createKit({
          name: mapped.createPayload.name,
          description: mapped.createPayload.description,
          guidelines: mapped.createPayload.guidelines,
          voice: mapped.createPayload.voice,
        })) as BrandKitSummary;
      }

      if (mapped.colors.length) {
        kit = (await brandApi.replaceColors(kit.id, mapped.colors)) as BrandKitSummary;
      }
      if (mapped.typography.length) {
        kit = (await brandApi.replaceTypography(
          kit.id,
          mapped.typography,
        )) as BrandKitSummary;
      }

      const result: ImportKitResult = {
        fingerprint: mapped.fingerprint,
        name: mapped.portable.brand.name,
        status: "success",
        kitId: kit.id,
      };
      results.push(result);
      done += 1;
      onProgress?.(done, selected.length, result);
    } catch (e) {
      const result: ImportKitResult = {
        fingerprint: mapped.fingerprint,
        name: mapped.portable.brand.name,
        status: "failed",
        error: e instanceof Error ? e.message : "Import failed",
      };
      results.push(result);
      done += 1;
      onProgress?.(done, selected.length, result);
    }
  }

  return results;
}
