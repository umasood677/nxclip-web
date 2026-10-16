import React from "react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
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

export function voiceDraftFromKit(voice: BrandVoiceFields | null | undefined): VoiceDraft {
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

export function BrandVoiceSection({ value, onChange }: Props) {
  const set = (patch: Partial<VoiceDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Brand Voice</h2>
        <p className="text-sm text-muted-foreground">
          Tone, vocabulary, and copy patterns for Ad Studio briefs. Saves into Brand
          Voice JSON — identity fields on other tabs are preserved.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="bv-personality">Brand personality</Label>
          <Input
            id="bv-personality"
            value={value.personality}
            onChange={(e) => set({ personality: e.target.value })}
            placeholder="Confident, couture, warm"
            maxLength={280}
          />
        </div>
        <div>
          <Label htmlFor="bv-tone">Tone</Label>
          <Input
            id="bv-tone"
            value={value.tone}
            onChange={(e) => set({ tone: e.target.value })}
            placeholder="Editorial, intimate, precise"
            maxLength={280}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bv-audience">Target audience</Label>
          <Input
            id="bv-audience"
            value={value.targetAudience}
            onChange={(e) => set({ targetAudience: e.target.value })}
            placeholder="Luxury beauty consumers 25–45"
            maxLength={500}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bv-style">Writing style</Label>
          <Input
            id="bv-style"
            value={value.writingStyle}
            onChange={(e) => set({ writingStyle: e.target.value })}
            placeholder="Short editorial sentences; sensory but precise"
            maxLength={500}
          />
        </div>
        <div>
          <Label htmlFor="bv-dosay">Preferred vocabulary</Label>
          <Textarea
            id="bv-dosay"
            value={value.doSay}
            onChange={(e) => set({ doSay: e.target.value })}
            rows={3}
            placeholder={"One phrase per line\ncouture color\nsignature red"}
          />
        </div>
        <div>
          <Label htmlFor="bv-dont">Prohibited vocabulary</Label>
          <Textarea
            id="bv-dont"
            value={value.dontSay}
            onChange={(e) => set({ dontSay: e.target.value })}
            rows={3}
            placeholder={"One phrase per line\ncheap\nmiracle cure"}
          />
        </div>
        <div>
          <Label htmlFor="bv-cta">Preferred CTA</Label>
          <Input
            id="bv-cta"
            value={value.preferredCta}
            onChange={(e) => set({ preferredCta: e.target.value })}
            placeholder="Shop the shade"
            maxLength={80}
          />
        </div>
        <div>
          <Label htmlFor="bv-tagline">Tagline</Label>
          <Input
            id="bv-tagline"
            value={value.tagline}
            onChange={(e) => set({ tagline: e.target.value })}
            placeholder="Artistry in every shade"
            maxLength={160}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bv-headlines">Example headlines</Label>
          <Textarea
            id="bv-headlines"
            value={value.exampleHeadlines}
            onChange={(e) => set({ exampleHeadlines: e.target.value })}
            rows={3}
            placeholder={"One headline per line\nSignature Red, Perfectly Matte"}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="bv-copy">Copywriting guidance</Label>
          <Textarea
            id="bv-copy"
            value={value.copyGuidance}
            onChange={(e) => set({ copyGuidance: e.target.value })}
            rows={3}
            placeholder="Lead with product truth. Avoid medical claims. Prefer sensory verbs."
            maxLength={4000}
          />
        </div>
      </div>
    </div>
  );
}
