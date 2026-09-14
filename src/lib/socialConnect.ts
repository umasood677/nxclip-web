import { toast } from "sonner";
import { socialApi, type SocialAccountDto, type SocialPlatform } from "../services/apiClient";

const SOCIAL_OAUTH_MSG = "nxclip-social-oauth";

export type { SocialAccountDto as SocialAccountSummary };

export type SocialOAuthResult = {
  status: "connected" | "error" | "cancelled" | "redirecting";
  platform?: string;
  reason?: string;
};

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    value === "youtube" ||
    value === "instagram" ||
    value === "facebook" ||
    value === "tiktok"
  );
}

/** Normalize list API rows into typed account summaries. */
export function normalizeSocialAccounts(items: unknown[]): SocialAccountDto[] {
  return (items ?? [])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .flatMap((item) => {
      if (!isSocialPlatform(item.platform)) return [];
      return [
        {
          platform: item.platform,
          displayName: typeof item.displayName === "string" ? item.displayName : null,
          externalAccountId:
            typeof item.externalAccountId === "string" ? item.externalAccountId : null,
          status: typeof item.status === "string" ? item.status : undefined,
          connectedAt: typeof item.connectedAt === "string" ? item.connectedAt : undefined,
          avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : null,
          accountType: typeof item.accountType === "string" ? item.accountType : null,
          username: typeof item.username === "string" ? item.username : null,
          pageName: typeof item.pageName === "string" ? item.pageName : null,
          login:
            item.login === "instagram" || item.login === "facebook" ? item.login : null,
        } satisfies SocialAccountDto,
      ];
    });
}

export function accountsMapFromList(
  items: unknown[],
): Partial<Record<SocialPlatform, SocialAccountDto>> {
  const next: Partial<Record<SocialPlatform, SocialAccountDto>> = {};
  for (const account of normalizeSocialAccounts(items)) {
    if (account.status === "connected") {
      next[account.platform] = account;
    }
  }
  return next;
}

/** Short label for account kind (Page vs profile, IG login path, etc.). */
export function socialAccountKindLabel(account: SocialAccountDto): string {
  switch (account.accountType) {
    case "facebook_page":
      return "Facebook Page — not your personal profile";
    case "instagram_business":
      return "Instagram professional account (direct login)";
    case "instagram_via_page":
      return account.pageName
        ? `Instagram via Facebook Page · ${account.pageName}`
        : "Instagram via linked Facebook Page";
    case "youtube_channel":
      return "YouTube channel";
    case "tiktok_account":
      return "TikTok account";
    default:
      break;
  }
  if (account.platform === "facebook") {
    return "Facebook Page — not your personal profile";
  }
  if (account.platform === "instagram" && account.login === "facebook") {
    return account.pageName
      ? `Instagram via Facebook Page · ${account.pageName}`
      : "Instagram via linked Facebook Page";
  }
  if (account.platform === "instagram") {
    return "Instagram professional account";
  }
  if (account.platform === "youtube") return "YouTube channel";
  if (account.platform === "tiktok") return "TikTok account";
  return "Connected account";
}

export function socialAccountPrimaryName(account: SocialAccountDto): string {
  if (account.displayName?.trim()) return account.displayName.trim();
  if (account.username?.trim()) return `@${account.username.replace(/^@/, "")}`;
  if (account.pageName?.trim()) return account.pageName.trim();
  const labels: Record<SocialPlatform, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
  };
  return labels[account.platform];
}

export function socialPublishTargetLabel(account: SocialAccountDto): string {
  return `${socialAccountPrimaryName(account)} · ${socialAccountKindLabel(account)}`;
}

/** If OAuth returned in a leftover popup, notify the opener and close. */
export function notifyOpenerSocialOAuth(payload: {
  status: string;
  platform?: string | null;
  reason?: string | null;
}): boolean {
  if (!window.opener || window.opener.closed) return false;
  try {
    window.opener.postMessage(
      {
        type: SOCIAL_OAUTH_MSG,
        status: payload.status,
        platform: payload.platform,
        reason: payload.reason,
      },
      window.location.origin,
    );
    window.close();
    return true;
  } catch {
    return false;
  }
}

export async function startSocialOAuth(
  platform: SocialPlatform,
  returnPath = "/profile",
): Promise<SocialOAuthResult> {
  const res = await socialApi.connectAccount(platform, {
    platform,
    returnPath,
    returnOrigin: window.location.origin,
  });
  if (res?.authorizeUrl) {
    if (platform === "instagram") {
      toast.info(
        "On Instagram, tap Allow. If it asks to save login info, choose Not now so you return here.",
      );
    }
    // Same-tab redirect so Instagram returns to this origin (e.g. http://localhost:3000/profile).
    window.location.assign(res.authorizeUrl);
    return { status: "redirecting" };
  }
  if (res?.status === "not_configured") {
    toast.info(res?.message || "Connect is not configured yet. Add OAuth credentials for this platform.");
    return { status: "error", reason: "not_configured" };
  }
  toast.error(res?.message || `Could not start ${platform} connect`);
  return { status: "error", reason: res?.message };
}

export function connectedMapFromAccounts(
  items: Array<{ platform?: string; status?: string }>,
): Partial<Record<SocialPlatform, boolean>> {
  const next: Partial<Record<SocialPlatform, boolean>> = {};
  for (const item of normalizeSocialAccounts(items)) {
    if (item.status === "connected") {
      next[item.platform] = true;
    }
  }
  return next;
}
