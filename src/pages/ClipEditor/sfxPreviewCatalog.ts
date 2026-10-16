/**
 * Browser-playable Foley/ambience previews (mirrors media-worker assets/sfx).
 * Served from /public/sfx — same ids the Final Render worker resolves via nxclip://sfx/.
 */
const SFX_FILES: Record<string, string> = {
  whoosh_soft: "whoosh_soft.wav",
  whoosh_hard: "whoosh_hard.wav",
  impact_hit: "impact_hit.wav",
  flash_pop: "flash_pop.wav",
  riser_short: "riser_short.wav",
  cut_click: "cut_click.wav",
  "cricket-bat-impact": "cricket-bat-impact.wav",
  "foot-plant": "foot-plant.wav",
  "football-kick": "football-kick.wav",
  "ball-bounce": "ball-bounce.wav",
  "crowd-small": "crowd-small.wav",
  "crowd-medium": "crowd-medium.wav",
  "conference-ambience": "conference-ambience.wav",
  "controller-click": "controller-click.wav",
  "soft-whoosh": "soft-whoosh.wav",
  "street-ambience": "street-ambience.wav",
  "knife-cut": "knife-cut.wav",
  applause: "applause.wav",
};

export function resolveSfxPreviewUrl(assetId?: string | null): string | null {
  if (!assetId) return null;
  const file = SFX_FILES[assetId];
  if (!file) return null;
  return `/sfx/${file}`;
}

export function isHttpAudioUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("/sfx/");
}
