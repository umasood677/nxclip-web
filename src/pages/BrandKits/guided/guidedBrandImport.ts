import { draftFromKit, type GuidedBrandDraft } from "./guidedBrandModel";
import { isImportable } from "../lib/brandKitImportMap";
import type { MappedImportKit } from "../lib/brandKitPortable";
import type { BrandVoiceFields } from "../lib/brandKitTypes";
/** Merge portable fields into this draft. IDs, uploads, consents and approvals never transfer. */
export function mergeBrandJsonDraft(
  current: GuidedBrandDraft,
  mapped: MappedImportKit,
): GuidedBrandDraft {
  if (!isImportable(mapped))
    throw new Error("Resolve JSON validation errors before importing.");
  const incoming = mapped.createPayload;
  const voice = incoming.voice as BrandVoiceFields;
  const imported = draftFromKit({
    id: "",
    name: incoming.name,
    voice,
    description: incoming.description,
    guidelines: incoming.guidelines,
    colors: mapped.colors,
    typography: mapped.typography,
  });
  // Studio asset IDs, character permissions and taxonomy approvals belong to this account only.
  const { studio: _studio, ...extras } = voice;
  void _studio;
  return {
    ...current,
    name: incoming.name,
    description: incoming.description ?? current.description,
    website: voice.website ?? current.website,
    personality: voice.personality ?? current.personality,
    tone: voice.tone ?? current.tone,
    audience: voice.targetAudience ?? current.audience,
    guidelines: incoming.guidelines ?? current.guidelines,
    colors: mapped.colors.length ? mapped.colors : current.colors,
    typography: mapped.typography.length
      ? mapped.typography.map((t) => ({
          ...current.typography.find(
            (old) => old.role === t.role && old.family === t.family,
          ),
          ...t,
        }))
      : current.typography,
    categoryId: voice.studio?.categoryId || current.categoryId,
    nicheId: voice.studio?.nicheId || current.nicheId,
    businessType: voice.studio?.businessType || current.businessType,
    goals: voice.studio?.businessGoals?.length ? imported.goals : current.goals,
    voiceExtras: {
      ...current.voiceExtras,
      ...Object.fromEntries(
        Object.entries(extras).filter(([, value]) => value !== undefined),
      ),
    },
    identityApproved: false,
    guidelinesApproved: false,
    taxonomyConfirmed: false,
  };
}
