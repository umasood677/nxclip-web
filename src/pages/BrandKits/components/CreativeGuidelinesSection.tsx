import React, { useId } from "react";
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

export function fillMissingGuidelines(
  value: GuidelinesDraft,
  categoryLabel?: string,
): GuidelinesDraft {
  const next = { ...value };
  for (const [key, text] of Object.entries(
    categoryGuidelineStarter(categoryLabel),
  ))
    if (!next[key as keyof GuidelinesDraft].trim())
      next[key as keyof GuidelinesDraft] = text || "";
  return next;
}

const CAMPAIGN_GUIDELINE_GROUPS: {
  title: string;
  description: string;
  fields: {
    key: keyof GuidelinesDraft;
    label: string;
    placeholder: string;
    wide?: boolean;
  }[];
}[] = [
  {
    title: "Art direction & campaign world",
    description:
      "Describe the visual language that should carry through your advertisements.",
    fields: [
      {
        key: "visualStyle",
        label: "Campaign visual style",
        placeholder: "The visual character, mood and level of polish",
      },
      {
        key: "photographyDirection",
        label: "Photography & source direction",
        placeholder: "How approved product photographs should be framed",
      },
      {
        key: "lighting",
        label: "Lighting",
        placeholder: "Key light, atmosphere, reflections and shadows",
      },
      {
        key: "backgroundPreferences",
        label: "Background & setting",
        placeholder: "Preferred environments, materials and exclusions",
      },
    ],
  },
  {
    title: "Layout & brand application",
    description:
      "Guide composition across formats while keeping the advertisement easy to read.",
    fields: [
      {
        key: "composition",
        label: "Composition & focal point",
        placeholder:
          "Product placement, visual hierarchy and safe space for copy",
      },
      {
        key: "colorUsage",
        label: "Brand color usage",
        placeholder: "Primary and supporting colors, contrast and combinations",
      },
      {
        key: "typographyUsage",
        label: "Typography hierarchy",
        placeholder: "Headline, supporting copy and CTA treatment",
      },
      {
        key: "logoPlacement",
        label: "Logo placement & clear space",
        placeholder: "Position, size, safe margins and background restrictions",
      },
    ],
  },
  {
    title: "Product truth & campaign safeguards",
    description:
      "Protect the actual product and make the boundaries of acceptable campaign claims clear.",
    fields: [
      {
        key: "productRepresentation",
        label: "Product identity requirements",
        placeholder:
          "Packaging, proportions, shade, printed labels and details to preserve",
        wide: true,
      },
      {
        key: "restrictedTreatments",
        label: "Visual treatments to avoid",
        placeholder:
          "Retouching, recoloring or transformations that would misrepresent the product",
      },
      {
        key: "prohibitedClaims",
        label: "Claims & endorsements to avoid",
        placeholder:
          "Unsupported results, certifications, testimonials or performance claims",
      },
    ],
  },
  {
    title: "Delivery notes",
    description:
      "Record reusable campaign instructions; individual campaign briefs can add their own objective and placement.",
    fields: [
      {
        key: "notes",
        label: "Campaign production notes",
        placeholder:
          "Required copy, intended placements, format considerations and review requirements",
        wide: true,
      },
      {
        key: "freeformGuidelines",
        label: "Additional brand usage rules",
        placeholder:
          "Any other restrictions or approval instructions for campaign creators",
        wide: true,
      },
    ],
  },
];
export function CreativeGuidelinesSection({
  value,
  onChange,
  categoryLabel,
}: Props) {
  const prefix = useId();
  return (
    <section
      className="bp-voice bp-campaign-guidelines"
      aria-labelledby={`${prefix}-title`}
    >
      <header className="bp-voice-heading">
        <span className="bp-voice-eyebrow">CAMPAIGN PLAYBOOK</span>
        <h2 id={`${prefix}-title`}>
          Creative guidelines for your advertisements
        </h2>
        <p>
          Turn your brand identity into clear direction for campaign concepts,
          editable templates and product-aware imagery.
        </p>
      </header>
      <div className="bp-guideline-starter">
        <div>
          <strong>{categoryLabel || "Your category"} starter guidance</strong>
          <p>
            Optional written suggestions, not AI analysis. Only empty fields are
            filled; your existing instructions stay intact.
          </p>
        </div>
        <button
          type="button"
          className="xp-secondary"
          onClick={() => onChange(fillMissingGuidelines(value, categoryLabel))}
        >
          Fill empty guidance fields
        </button>
      </div>
      <div className="bp-voice-groups">
        {CAMPAIGN_GUIDELINE_GROUPS.map((group, index) => (
          <fieldset className="bp-voice-group" key={group.title}>
            <legend>
              <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>
              {group.title}
            </legend>
            <p className="bp-voice-group-description">{group.description}</p>
            <div className="bp-voice-fields">
              {group.fields.map((field) => (
                <div
                  className={`bp-voice-field${field.wide ? " bp-voice-field--wide" : ""}`}
                  key={field.key}
                >
                  <label htmlFor={`${prefix}-${field.key}`}>
                    {field.label}
                  </label>
                  <textarea
                    id={`${prefix}-${field.key}`}
                    rows={3}
                    maxLength={
                      field.key === "freeformGuidelines" ? 20000 : 4000
                    }
                    placeholder={field.placeholder}
                    value={value[field.key]}
                    onChange={(e) =>
                      onChange({ ...value, [field.key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="bp-voice-save-note">
        Save Brand Kit to persist changes. Guidelines approval remains a
        separate decision after reviewing the identity summary below.
      </p>
    </section>
  );
}
