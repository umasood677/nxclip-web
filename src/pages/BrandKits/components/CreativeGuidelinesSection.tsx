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
  value: GuidelinesDraft;
  onChange: (next: GuidelinesDraft) => void;
};

const ZOE_EXAMPLE: Partial<GuidelinesDraft> = {
  visualStyle: "Luxury beauty editorial; dark burgundy atmosphere",
  photographyDirection: "Soft beauty lighting, shallow depth, couture stills",
  lighting: "Soft key with gentle rim; avoid harsh flash",
  composition: "Centered product hero or three-quarter beauty portrait",
  backgroundPreferences: "Deep neutrals or studio gradient; no clutter",
  colorUsage: "Lead with signature red; keep neutrals supporting",
  typographyUsage: "Elegant headline; restrained body; high contrast CTA",
  logoPlacement: "Bottom corner with clear space equal to logo height",
  productRepresentation: "Show true packaging and shade; no invented logos",
  restrictedTreatments: "No heavy filters that alter lipstick shade",
  prohibitedClaims: "No medical, clinical, or permanent results claims",
};

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

export function creativeFromDraft(draft: GuidelinesDraft): BrandCreativeGuidelines {
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

export function CreativeGuidelinesSection({ value, onChange }: Props) {
  const set = (patch: Partial<GuidelinesDraft>) => onChange({ ...value, ...patch });

  const fields: Array<{ key: keyof GuidelinesDraft; label: string; rows?: number }> = [
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Creative Guidelines</h2>
          <p className="text-sm text-muted-foreground">
            Structured advertising preferences plus optional freeform notes. Examples
            are suggestions — insert only if useful.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange({ ...value, ...ZOE_EXAMPLE })}
        >
          Insert luxury beauty examples
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div
            key={f.key}
            className={f.rows && f.rows > 1 ? "sm:col-span-2" : undefined}
          >
            <Label>{f.label}</Label>
            {f.rows && f.rows > 1 ? (
              <Textarea
                value={String(value[f.key] ?? "")}
                onChange={(e) => set({ [f.key]: e.target.value } as Partial<GuidelinesDraft>)}
                rows={f.rows}
              />
            ) : (
              <Input
                value={String(value[f.key] ?? "")}
                onChange={(e) => set({ [f.key]: e.target.value } as Partial<GuidelinesDraft>)}
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
