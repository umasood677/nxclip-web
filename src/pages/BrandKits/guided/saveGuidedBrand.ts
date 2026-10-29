import type { BrandKitSummary } from "../lib/brandKitTypes";
import { guidedPayload, type GuidedBrandDraft } from "./guidedBrandModel";
type Payload = ReturnType<typeof guidedPayload>;
type SaveApi = {
  createKit: (payload: Payload) => Promise<BrandKitSummary>;
  updateKit: (id: string, payload: Payload & { expectedVersion?: number }) => Promise<BrandKitSummary>;
};
/** Saving identity never runs template preparation or a paid provider. */
export async function saveGuidedBrand(draft: GuidedBrandDraft, kit: BrandKitSummary | null, savedDraft: string, api: SaveApi) {
  if (kit && savedDraft === JSON.stringify(draft)) return { kit, changed: false };
  const payload = guidedPayload(draft, kit);
  const result = kit ? await api.updateKit(kit.id, { ...payload, expectedVersion: kit.version }) : await api.createKit(payload);
  return { kit: result, changed: !kit || result.version !== kit.version };
}
