import { brandDraftFieldKey } from "../guided/brandDraftFocus";
import React, { useId } from "react";
import type { BrandVoiceFields } from "../lib/brandKitTypes";

export type VoiceDraft = {
  personality: string;
  tone: string;
  targetAudience: string;
  writingStyle: string;
  doSay: string;
  dontSay: string;
  preferredCta: string;
  tagline: string;
  exampleHeadlines: string;
  copyGuidance: string;
};

type Props = {
  value: VoiceDraft;
  onChange: (next: VoiceDraft) => void;
};

export function voiceDraftFromKit(
  voice: BrandVoiceFields | null | undefined,
): VoiceDraft {
  return {
    personality: voice?.personality ?? "",
    tone: voice?.tone ?? "",
    targetAudience: voice?.targetAudience ?? "",
    writingStyle: voice?.writingStyle ?? "",
    doSay: (voice?.doSay ?? []).join("\n"),
    dontSay: (voice?.dontSay ?? []).join("\n"),
    preferredCta: voice?.preferredCta ?? "",
    tagline: voice?.tagline ?? "",
    exampleHeadlines: (voice?.exampleHeadlines ?? []).join("\n"),
    copyGuidance: voice?.copyGuidance ?? "",
  };
}

export function voicePatchFromDraft(draft: VoiceDraft): BrandVoiceFields {
  const lines = (text: string) =>
    text
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    personality: draft.personality.trim() || undefined,
    tone: draft.tone.trim() || undefined,
    targetAudience: draft.targetAudience.trim() || undefined,
    writingStyle: draft.writingStyle.trim() || undefined,
    doSay: lines(draft.doSay),
    dontSay: lines(draft.dontSay),
    preferredCta: draft.preferredCta.trim() || undefined,
    tagline: draft.tagline.trim() || undefined,
    exampleHeadlines: lines(draft.exampleHeadlines),
    copyGuidance: draft.copyGuidance.trim() || undefined,
  };
}

type VoiceField = {
  key: keyof VoiceDraft;
  label: string;
  placeholder: string;
  hint?: string;
  rows?: number;
  limit?: number;
  wide?: boolean;
};
const VOICE_GROUPS: {
  title: string;
  description: string;
  fields: VoiceField[];
}[] = [
  {
    title: "Voice & audience",
    description: "Define who you speak to and how your brand should sound.",
    fields: [
      {
        key: "personality",
        label: "Brand personality",
        placeholder: "e.g. confident, thoughtful, approachable",
        limit: 280,
      },
      {
        key: "tone",
        label: "Communication tone",
        placeholder: "e.g. warm, precise, quietly expressive",
        limit: 280,
      },
      {
        key: "targetAudience",
        label: "Target audience",
        placeholder: "Who are you speaking to, and what matters to them?",
        limit: 500,
        wide: true,
      },
      {
        key: "writingStyle",
        label: "Writing style",
        placeholder:
          "Describe sentence length, vocabulary and level of formality",
        limit: 500,
        wide: true,
      },
    ],
  },
  {
    title: "Vocabulary & boundaries",
    description: "Give your creative team clear language to use and avoid.",
    fields: [
      {
        key: "doSay",
        label: "Preferred vocabulary",
        placeholder: "Add an approved word or phrase on each line",
        hint: "One phrase per line.",
        rows: 4,
      },
      {
        key: "dontSay",
        label: "Words & phrases to avoid",
        placeholder: "Add a word, phrase or unsupported claim on each line",
        hint: "One phrase per line.",
        rows: 4,
      },
    ],
  },
  {
    title: "Messaging & calls to action",
    description: "Set the recurring messages that guide campaign copy.",
    fields: [
      {
        key: "tagline",
        label: "Brand tagline",
        placeholder: "Your approved brand signature",
        limit: 160,
      },
      {
        key: "preferredCta",
        label: "Preferred call to action",
        placeholder: "e.g. Discover the collection",
        limit: 80,
        hint: "Use an action that matches your customer journey.",
      },
      {
        key: "exampleHeadlines",
        label: "Approved headline examples",
        placeholder: "Add one headline per line",
        hint: "Style examples, not verified product claims.",
        rows: 3,
        wide: true,
      },
      {
        key: "copyGuidance",
        label: "Copywriting guidance",
        placeholder:
          "Describe the approach, important product truths and claims to avoid",
        limit: 4000,
        rows: 4,
        wide: true,
      },
    ],
  },
];

export function BrandVoiceSection({ value, onChange }: Props) {
  const prefix = useId();
  return (
    <section className="bp-voice" aria-labelledby={`${prefix}-title`}>
      <header className="bp-voice-heading">
        <span className="bp-voice-eyebrow">VERBAL IDENTITY</span>
        <h2 id={`${prefix}-title`}>Voice, messaging & copy details</h2>
        <p>Set your campaign voice and copy preferences.</p>
        <p className="bp-voice-save-note">
          Use <strong>Save Brand Kit</strong> to keep changes.
        </p>
      </header>
      <div className="bp-voice-groups">
        {VOICE_GROUPS.map((group, index) => (
          <fieldset className="bp-voice-group" key={group.title}>
            <legend>
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {group.title}
            </legend>

            <div className="bp-voice-fields">
              {group.fields.map((field) => {
                const id = `${prefix}-${field.key}`,
                  hint = `${id}-hint`;
                return (
                  <div
                    className={`bp-voice-field${field.wide ? " bp-voice-field--wide" : ""}`}
                    key={field.key}
                    data-brand-field={brandDraftFieldKey("voice", field.key)}
                    data-brand-label={field.label}
                  >
                    <label htmlFor={id}>{field.label}</label>
                    {field.rows ? (
                      <textarea
                        id={id}
                        aria-describedby={field.hint ? hint : undefined}
                        value={value[field.key]}
                        rows={field.rows}
                        maxLength={field.limit}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          onChange({ ...value, [field.key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        id={id}
                        aria-describedby={field.hint ? hint : undefined}
                        value={value[field.key]}
                        maxLength={field.limit}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          onChange({ ...value, [field.key]: e.target.value })
                        }
                      />
                    )}
                    {field.hint && <small id={hint}>{field.hint}</small>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
