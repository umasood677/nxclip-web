import type { PlatformStatDto, SocialPlatform } from "../services/apiClient";

export type SocialDistributionRow = {
  platform?: string;
  status?: string;
  externalUrl?: string;
  scheduledAt?: string;
  errorMessage?: string;
};

export type ContentSocialInsight = {
  /** Primary badge: Live | Published | Scheduled | Publishing | Failed */
  displayStatus: "live" | "published" | "scheduled" | "publishing" | "failed";
  displayLabel: string;
  livePlatforms: SocialPlatform[];
  scheduledPlatforms: SocialPlatform[];
  failedPlatforms: SocialPlatform[];
  /** Connected accounts not yet posted for this content */
  missingPlatforms: SocialPlatform[];
  /** Short factual line for the tile (replaces generic next step) */
  statusLine: string;
  /** Action hint — empty when nothing left to do */
  actionLine: string;
  actionCta: string;
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const ALL_PLATFORMS: SocialPlatform[] = ["youtube", "instagram", "facebook", "tiktok"];

function asPlatform(value?: string): SocialPlatform | null {
  const p = (value || "").toLowerCase();
  if (p === "youtube" || p === "instagram" || p === "facebook" || p === "tiktok") {
    return p;
  }
  return null;
}

function labelPlatforms(platforms: SocialPlatform[]): string {
  if (!platforms.length) return "";
  return platforms.map((p) => PLATFORM_LABELS[p]).join(", ");
}

function mergePlatformState(
  platformStats?: PlatformStatDto[],
  distributions?: SocialDistributionRow[],
): Map<SocialPlatform, { status: string; externalUrl?: string; error?: string }> {
  const map = new Map<SocialPlatform, { status: string; externalUrl?: string; error?: string }>();

  for (const row of distributions ?? []) {
    const platform = asPlatform(row.platform);
    if (!platform) continue;
    map.set(platform, {
      status: (row.status || "idle").toLowerCase(),
      externalUrl: row.externalUrl,
      error: row.errorMessage,
    });
  }

  for (const stat of platformStats ?? []) {
    const platform = asPlatform(stat.platform);
    if (!platform) continue;
    const prev = map.get(platform);
    const hasLive = !!stat.externalUrl || stat.verified === true;
    if (hasLive) {
      map.set(platform, {
        status: "live",
        externalUrl: stat.externalUrl,
        error: prev?.error,
      });
    } else if (!prev) {
      map.set(platform, { status: "idle" });
    }
  }

  return map;
}

export function buildContentSocialInsight(input: {
  platformStats?: PlatformStatDto[];
  distributions?: SocialDistributionRow[];
  socialRollup?: string;
  connectedPlatforms?: SocialPlatform[];
}): ContentSocialInsight {
  const connected = (input.connectedPlatforms ?? []).filter((p) =>
    ALL_PLATFORMS.includes(p),
  );
  const byPlatform = mergePlatformState(input.platformStats, input.distributions);

  const livePlatforms: SocialPlatform[] = [];
  const scheduledPlatforms: SocialPlatform[] = [];
  const failedPlatforms: SocialPlatform[] = [];

  for (const [platform, row] of byPlatform.entries()) {
    if (row.status === "live" || !!row.externalUrl) {
      livePlatforms.push(platform);
    } else if (row.status === "scheduled") {
      scheduledPlatforms.push(platform);
    } else if (row.status === "publishing") {
      // counted below via rollup
    } else if (row.status === "failed") {
      failedPlatforms.push(platform);
    }
  }

  const rollup = (input.socialRollup || "").toLowerCase();
  const isPublishing = rollup === "publishing" || [...byPlatform.values()].some((r) => r.status === "publishing");

  const missingPlatforms = connected.filter(
    (p) => !livePlatforms.includes(p) && !scheduledPlatforms.includes(p) && !failedPlatforms.includes(p),
  );

  let displayStatus: ContentSocialInsight["displayStatus"] = "published";
  if (livePlatforms.length > 0 || rollup === "live") displayStatus = "live";
  else if (failedPlatforms.length > 0 || rollup === "failed") displayStatus = "failed";
  else if (scheduledPlatforms.length > 0 || rollup === "scheduled") displayStatus = "scheduled";
  else if (isPublishing) displayStatus = "publishing";

  let displayLabel = "Published";
  if (displayStatus === "live") displayLabel = "Live";
  else if (displayStatus === "scheduled") displayLabel = "Scheduled";
  else if (displayStatus === "publishing") displayLabel = "Publishing";
  else if (displayStatus === "failed") displayLabel = "Needs attention";

  let statusLine = "On your nxClip Feed only — not posted to social yet.";
  let actionLine = "";
  let actionCta = "Go Live";

  if (livePlatforms.length > 0) {
    statusLine =
      livePlatforms.length === 1
        ? `Live on ${labelPlatforms(livePlatforms)}.`
        : `Live on ${labelPlatforms(livePlatforms)}.`;
    if (missingPlatforms.length > 0) {
      actionLine = `Also post to ${labelPlatforms(missingPlatforms)} from the post page.`;
      actionCta = "Add platforms";
    } else if (failedPlatforms.length > 0) {
      actionLine = `${labelPlatforms(failedPlatforms)} failed — retry from the post page.`;
      actionCta = "Fix post";
    } else {
      actionLine = "Track views and engagement on the post page.";
      actionCta = "View post";
    }
  } else if (rollup === "live") {
    statusLine = "Live on social.";
    actionLine = "Track views and engagement on the post page.";
    actionCta = "View post";
  } else if (scheduledPlatforms.length > 0) {
    statusLine = `Scheduled for ${labelPlatforms(scheduledPlatforms)}.`;
    actionLine = "Opens automatically at the scheduled time, or publish now from the post page.";
    actionCta = "View schedule";
  } else if (isPublishing) {
    statusLine = "Publishing to social platforms now…";
    actionLine = "Refresh the post page in a moment to see Live links.";
    actionCta = "View post";
  } else if (failedPlatforms.length > 0) {
    statusLine = `Post failed on ${labelPlatforms(failedPlatforms)}.`;
    actionLine = byPlatform.get(failedPlatforms[0])?.error || "Retry from the post page.";
    actionCta = "Retry";
  } else if (connected.length > 0) {
    statusLine = "On your nxClip Feed — not on social yet.";
    actionLine = `Post to ${labelPlatforms(connected)} from the post page.`;
    actionCta = "Go Live";
  } else {
    statusLine = "On your nxClip Feed only.";
    actionLine = "Connect social accounts in Profile, then Go Live from the post page.";
    actionCta = "Connect socials";
  }

  return {
    displayStatus,
    displayLabel,
    livePlatforms,
    scheduledPlatforms,
    failedPlatforms,
    missingPlatforms,
    statusLine,
    actionLine,
    actionCta,
  };
}
