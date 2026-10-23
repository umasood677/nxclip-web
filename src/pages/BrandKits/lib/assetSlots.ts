export type AssetSlotDef = {
  role: string;
  label: string;
  hint: string;
  /** Optional starter usage guidance (user can edit). */
  exampleGuidance?: string;
  exampleLabel?: string;
};

/** Studio asset roles mapped to existing /brands asset role enum. */
export const ASSET_SLOTS: AssetSlotDef[] = [
  {
    role: "logo_primary",
    label: "Primary logo",
    hint: "Main lockup for ads and previews",
    exampleLabel: "ZoeArtisan logo",
    exampleGuidance:
      "Maintain proportions and clear space. Do not stretch or recolor without permission.",
  },
  {
    role: "logo_light",
    label: "Light logo",
    hint: "For dark backgrounds",
  },
  {
    role: "logo_dark",
    label: "Dark logo",
    hint: "For light backgrounds",
  },
  {
    role: "logo_mark",
    label: "Brand icon",
    hint: "Mark / app icon / monogram",
  },
  {
    role: "product_image",
    label: "Product photography",
    hint: "Hero product still",
    exampleLabel: "Signature Red Matte Lipstick",
    exampleGuidance:
      "Preserve product packaging and actual lipstick shade. Do not invent branding or packaging details.",
  },
  {
    role: "brand_model",
    label: "Brand model / reference person",
    hint: "Recognizable talent or muse",
    exampleLabel: "Zoe model",
    exampleGuidance:
      "Preserve recognizable facial identity. Use premium editorial beauty framing.",
  },
  {
    role: "campaign_reference",
    label: "Campaign reference",
    hint: "Mood / layout reference still",
  },
];

export function findReadyAsset<
  T extends { role?: string; status?: string; readUrl?: string | null },
>(assets: T[] | undefined, role: string): T | undefined {
  return assets?.find((a) => a.role === role && a.status === "ready");
}
