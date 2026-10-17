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

/** Common AI / plan aliases → catalog file ids. */
const SFX_ALIASES: Record<string, string> = {
  clap: "applause",
  clapping: "applause",
  applause: "applause",
  bat_contact: "cricket-bat-impact",
  "bat-contact": "cricket-bat-impact",
  bat: "cricket-bat-impact",
  cricket: "cricket-bat-impact",
  impact: "impact_hit",
  hit: "impact_hit",
  whoosh: "soft-whoosh",
  click: "controller-click",
  kick: "football-kick",
  bounce: "ball-bounce",
  foot: "foot-plant",
  step: "foot-plant",
  crowd: "crowd-small",
  conference: "conference-ambience",
  street: "street-ambience",
  knife: "knife-cut",
  cut: "knife-cut",
};

function normalizeSfxId(raw?: string | null): string | null {
  if (!raw) return null;
  let id = String(raw).trim();
  if (!id) return null;
  // nxclip://sfx/cricket-bat-impact.wav → cricket-bat-impact
  const nx = id.match(/^nxclip:\/\/sfx\/([^/?#]+)/i);
  if (nx?.[1]) id = nx[1];
  id = id.replace(/\.wav$/i, "").replace(/^\/+/, "");
  // /sfx/foo.wav
  const path = id.match(/(?:^|\/)sfx\/([^/?#]+)/i);
  if (path?.[1]) id = path[1].replace(/\.wav$/i, "");
  return id || null;
}

function lookupSfxFile(id: string): string | null {
  if (SFX_FILES[id]) return SFX_FILES[id]!;
  const lower = id.toLowerCase();
  if (SFX_FILES[lower]) return SFX_FILES[lower]!;
  const aliased = SFX_ALIASES[lower] || SFX_ALIASES[id];
  if (aliased && SFX_FILES[aliased]) return SFX_FILES[aliased]!;
  // soft match: replace _ with -
  const dashed = lower.replace(/_/g, "-");
  if (SFX_FILES[dashed]) return SFX_FILES[dashed]!;
  if (SFX_ALIASES[dashed] && SFX_FILES[SFX_ALIASES[dashed]!]) {
    return SFX_FILES[SFX_ALIASES[dashed]!]!;
  }
  return null;
}

/** Resolve a browser URL for Foley/ambience preview from assetId, type, or nxclip URL. */
export function resolveSfxPreviewUrl(
  assetId?: string | null,
  fallbackType?: string | null,
  sourceUrl?: string | null,
): string | null {
  const candidates = [assetId, fallbackType, sourceUrl];
  for (const raw of candidates) {
    const id = normalizeSfxId(raw);
    if (!id) continue;
    const file = lookupSfxFile(id);
    if (file) return `/sfx/${file}`;
  }
  return null;
}

export function isHttpAudioUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("/sfx/");
}

export function formatSfxLabel(assetId?: string | null, type?: string | null): string {
  const raw = type || assetId || "foley";
  return String(raw).replace(/[-_]/g, " ");
}
