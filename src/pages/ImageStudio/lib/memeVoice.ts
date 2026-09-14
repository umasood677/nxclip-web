/** Image Studio meme voice + humor controls (mirrors content-service humor scale). */

export const MEME_VOICE_PRESETS = [
  { id: "elegant", label: "Elegant" },
  { id: "witty", label: "Witty" },
  { id: "playful", label: "Playful" },
  { id: "sarcastic", label: "Sarcastic" },
  { id: "confident", label: "Confident" },
  { id: "luxury", label: "Luxury" },
  { id: "genz", label: "Gen Z" },
  { id: "minimal", label: "Minimal" },
  { id: "savage", label: "Savage" },
  { id: "custom", label: "Custom" },
] as const;

export type MemeVoiceId = (typeof MEME_VOICE_PRESETS)[number]["id"];

export const HUMOR_LEVEL_LABELS = [
  "Elegant",
  "Subtle",
  "Playful",
  "Funny",
  "Sarcastic",
  "Savage",
] as const;

export const HUMOR_LEVEL_HINTS = [
  "Editorial / serious",
  "Subtle wit",
  "Playful",
  "Clearly funny",
  "Sarcastic",
  "Savage / punchy",
] as const;

export function toggleMemeVoice(
  selected: MemeVoiceId[],
  voiceId: MemeVoiceId,
): MemeVoiceId[] {
  if (selected.includes(voiceId)) {
    const next = selected.filter((id) => id !== voiceId);
    return next.length ? next : ["elegant"];
  }
  return [...selected, voiceId];
}

export function resolveMemeVoice(
  voiceIds: MemeVoiceId[],
  customInstruction: string,
): string {
  const labels = voiceIds
    .filter((id) => id !== "custom")
    .map((id) => MEME_VOICE_PRESETS.find((v) => v.id === id)?.label)
    .filter(Boolean) as string[];
  if (voiceIds.includes("custom")) {
    const custom = customInstruction.trim().slice(0, 120);
    if (custom) labels.push(custom);
  }
  return labels.join(", ") || "Elegant";
}

/** Keep API payloads inside DTO MaxLength bounds. */
export function clipMemeVoiceForApi(voice: string, max = 160): string {
  const trimmed = voice.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, Math.max(1, max - 1)).trimEnd();
}

/** Compact directive so refine still feels voice/humor even without DTO fields. */
export function buildClientVoiceHumorClause(
  voice: string,
  humorLevel: number,
): string {
  const level = Math.min(5, Math.max(0, Math.round(humorLevel)));
  const hint =
    HUMOR_LEVEL_HINTS[level as keyof typeof HUMOR_LEVEL_HINTS] ||
    HUMOR_LEVEL_HINTS[2];
  const voiceBit = clipMemeVoiceForApi(voice, 120);
  return `Creative voice: ${voiceBit}. Humor ${level}/5 (${hint}). Interpret lighting, expression, and staging through this voice so the result differs from a neutral take.`;
}
