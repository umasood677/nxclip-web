import React from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import type { BrandCreativeGuidelines } from "../lib/brandKitTypes";

export type GuidelinesDraft = {
  visualStyle: string;
  photographyDirection: string;
  lighting: string;
  composition: string;
  backgroundPreferences: string;
  colorUsage: string;
  typographyUsage: string;
  logoPlacement: string;
  productRepresentation: string;
  restrictedTreatments: string;
  prohibitedClaims: string;
  notes: string;
  /** Also persisted to brand_kits.guidelines freeform column */
  freeformGuidelines: string;
};

type Props = {
  categoryLabel?: string;
  value: GuidelinesDraft;
  onChange: (next: GuidelinesDraft) => void;
};

export function categoryGuidelineStarter(
  categoryLabel = "your category",
): Partial<GuidelinesDraft> {
  return {
    visualStyle: `A distinctive ${categoryLabel} campaign grounded in the saved brand identity`,
    photographyDirection: `Show approved ${categoryLabel} products or services clearly in a credible setting`,
    lighting: "Consistent, natural-looking light with readable product details",
    composition: "One clear focal point; room for headline, logo and CTA",
    backgroundPreferences:
      "An uncluttered setting appropriate to the campaign and audience",
    colorUsage: "Use the saved brand palette with sufficient text contrast",
    typographyUsage: "Use saved headline and body roles with a clear hierarchy",
    logoPlacement: "Respect the original logo and clear space",
    productRepresentation:
      "Preserve actual packaging, proportions and approved product details",
    restrictedTreatments:
      "Do not invent products, labels, shades or endorsements",
    prohibitedClaims: "Only use substantiated, owner-approved claims",
  };
}

export function guidelinesDraftFromKit(
  creative: BrandCreativeGuidelines | null | undefined,
  freeform: string | null | undefined,
): GuidelinesDraft {
  return {
    visualStyle: creative?.visualStyle ?? "",
    photographyDirection: creative?.photographyDirection ?? "",
    lighting: creative?.lighting ?? "",
    composition: creative?.composition ?? "",
    backgroundPreferences: creative?.backgroundPreferences ?? "",
    colorUsage: creative?.colorUsage ?? "",
    typographyUsage: creative?.typographyUsage ?? "",
    logoPlacement: creative?.logoPlacement ?? "",
    productRepresentation: creative?.productRepresentation ?? "",
    restrictedTreatments: creative?.restrictedTreatments ?? "",
    prohibitedClaims: creative?.prohibitedClaims ?? "",
    notes: creative?.notes ?? "",
    freeformGuidelines: freeform ?? "",
  };
}

export function creativeFromDraft(
  draft: GuidelinesDraft,
): BrandCreativeGuidelines {
  const pick = (v: string) => v.trim() || undefined;
  return {
    visualStyle: pick(draft.visualStyle),
    photographyDirection: pick(draft.photographyDirection),
    lighting: pick(draft.lighting),
    composition: pick(draft.composition),
    backgroundPreferences: pick(draft.backgroundPreferences),
    colorUsage: pick(draft.colorUsage),
    typographyUsage: pick(draft.typographyUsage),
    logoPlacement: pick(draft.logoPlacement),
    productRepresentation: pick(draft.productRepresentation),
    restrictedTreatments: pick(draft.restrictedTreatments),
    prohibitedClaims: pick(draft.prohibitedClaims),
    notes: pick(draft.notes),
  };
}

export function CreativeGuidelinesSection({
  value,
  onChange,
  categoryLabel,
}: Props) {
  const set = (patch: Partial<GuidelinesDraft>) =>
    onChange({ ...value, ...patch });

  const fields: Array<{
    key: keyof GuidelinesDraft;
    label: string;
    rows?: number;
  }> = [
    { key: "visualStyle", label: "Visual style" },
    { key: "photographyDirection", label: "Photography direction" },
    { key: "lighting", label: "Lighting" },
    { key: "composition", label: "Composition" },
    { key: "backgroundPreferences", label: "Background preferences" },
    { key: "colorUsage", label: "Color usage" },
    { key: "typographyUsage", label: "Typography usage" },
    { key: "logoPlacement", label: "Logo placement" },
    { key: "productRepresentation", label: "Product representation" },
    { key: "restrictedTreatments", label: "Restricted visual treatments" },
    { key: "prohibitedClaims", label: "Prohibited claims", rows: 2 },
    { key: "notes", label: "Additional notes", rows: 3 },
  ];

  return (
    <div className="space-y-5 bp-detail-form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Creative Guidelines
          </h2>
          <p className="text-sm text-muted-foreground">
            Category-aware starter guidance is deterministic, not AI analysis.
            Review and edit every suggestion before saving.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({ ...value, ...categoryGuidelineStarter(categoryLabel) })
          }
        >
          Insert {categoryLabel || "category"} starter guidance
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div
            key={f.key}
            className={f.rows && f.rows > 1 ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={`cg-${f.key}`}>{f.label}</Label>
            {f.rows && f.rows > 1 ? (
              <Textarea
                id={`cg-${f.key}`}
                value={String(value[f.key] ?? "")}
                onChange={(e) =>
                  set({ [f.key]: e.target.value } as Partial<GuidelinesDraft>)
                }
                rows={f.rows}
              />
            ) : (
              <Input
                id={`cg-${f.key}`}
                value={String(value[f.key] ?? "")}
                onChange={(e) =>
                  set({ [f.key]: e.target.value } as Partial<GuidelinesDraft>)
                }
              />
            )}
          </div>
        ))}
        <div className="sm:col-span-2">
          <Label htmlFor="cg-freeform">Freeform guidelines</Label>
          <Textarea
            id="cg-freeform"
            value={value.freeformGuidelines}
            onChange={(e) => set({ freeformGuidelines: e.target.value })}
            rows={4}
            placeholder="Anything else creatives should know…"
          />
        </div>
      </div>
    </div>
  );
}
