import { useEffect, useState } from "react";
import { ConnectedSocialAccountAvatar } from "./ConnectedSocialAccountAvatar";
import { cn } from "../../lib/utils";
import { socialApi, type SocialAccountDto, type SocialPlatform } from "../../services/apiClient";
import {
  accountsMapFromList,
  socialAccountKindLabel,
  socialAccountPrimaryName,
  socialPublishTargetLabel,
} from "../../lib/socialConnect";

const LABELS: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const ALL: SocialPlatform[] = ["youtube", "instagram", "facebook", "tiktok"];

interface SocialPublishTargetsProps {
  selected: SocialPlatform[];
  onChange: (next: SocialPlatform[]) => void;
  disabled?: boolean;
  caption?: string;
  /** File/format eligibility from POST /social/content/:id/eligibility */
  eligibilityByPlatform?: Partial<
    Record<SocialPlatform, { eligible: boolean; reasons: string[] }>
  >;
}

export function SocialPublishTargets({
  selected,
  onChange,
  disabled,
  caption = "Also post Live after the nxClip feed is published (optional)",
  eligibilityByPlatform,
}: SocialPublishTargetsProps) {
  const [accounts, setAccounts] = useState<Partial<Record<SocialPlatform, SocialAccountDto>>>({});

  useEffect(() => {
    let cancelled = false;
    void socialApi
      .listAccounts()
      .then((items) => {
        if (!cancelled) setAccounts(accountsMapFromList(items));
      })
      .catch(() => {
        if (!cancelled) setAccounts({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Platforms
      </p>
      {caption ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{caption}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {ALL.map((platform) => {
          const isOn = selected.includes(platform);
          const account = accounts[platform];
          const isConnected = account?.status === "connected";
          const eligibility = eligibilityByPlatform?.[platform];
          const ineligible = !!eligibility && eligibility.eligible === false;
          const reason = eligibility?.reasons?.[0];
          const canSelect = isConnected && !ineligible;
          const publishLabel = account ? socialPublishTargetLabel(account) : LABELS[platform];
          return (
            <button
              key={platform}
              type="button"
              disabled={disabled || !canSelect}
              onClick={() =>
                onChange(
                  isOn ? selected.filter((p) => p !== platform) : [...selected, platform],
                )
              }
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                !canSelect && "cursor-not-allowed border-border/60 bg-muted/25",
                canSelect &&
                  !isOn &&
                  "border-border bg-card hover:border-primary/35 hover:bg-muted/20",
                canSelect &&
                  isOn &&
                  "border-primary/50 bg-primary/10 ring-1 ring-primary/25",
                disabled && "opacity-60",
              )}
              title={
                !isConnected
                  ? `Connect ${LABELS[platform]} in Profile first`
                  : ineligible
                    ? reason || `${LABELS[platform]} is not eligible for this file`
                    : isOn
                      ? `Will publish to: ${publishLabel}`
                      : `Include: ${publishLabel}`
              }
            >
              <ConnectedSocialAccountAvatar
                platform={platform}
                account={account}
                size={32}
                muted={!canSelect}
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-bold text-foreground leading-tight truncate">
                  {isConnected && account
                    ? socialAccountPrimaryName(account)
                    : LABELS[platform]}
                </span>
                <span
                  className={cn(
                    "block text-[10px] font-medium mt-0.5 line-clamp-2",
                    !canSelect && "text-muted-foreground",
                    canSelect && !isOn && "text-muted-foreground",
                    canSelect && isOn && "text-primary",
                  )}
                >
                  {!isConnected
                    ? "Not connected"
                    : ineligible
                      ? "Not eligible"
                      : isOn
                        ? "Selected for publish"
                        : socialAccountKindLabel(account!)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
