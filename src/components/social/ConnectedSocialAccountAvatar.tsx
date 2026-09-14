import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { SocialPlatformTile, type SocialBrandPlatform } from "./SocialPlatformIcon";
import type { SocialAccountDto } from "../../services/apiClient";
import { socialAccountPrimaryName } from "../../lib/socialConnect";
import { cn } from "../../lib/utils";

type Props = {
  platform: SocialBrandPlatform;
  account?: SocialAccountDto | null;
  size?: number;
  muted?: boolean;
  className?: string;
};

export function ConnectedSocialAccountAvatar({
  platform,
  account,
  size = 40,
  muted,
  className,
}: Props) {
  const connected = account?.status === "connected";
  const avatarUrl = account?.avatarUrl?.trim();
  const name = account ? socialAccountPrimaryName(account) : platform;
  const fallbackLetter = name.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const badgeSize = Math.max(14, Math.round(size * 0.36));
  const iconSize = Math.round(badgeSize * 0.68);

  if (!connected) {
    return (
      <SocialPlatformTile
        platform={platform}
        size={size}
        iconSize={Math.round(size * 0.68)}
        muted={muted}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Avatar
        className="size-full rounded-full"
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />
        ) : null}
        <AvatarFallback className="text-xs font-bold">{fallbackLetter}</AvatarFallback>
      </Avatar>
      <span
        className="absolute -bottom-0.5 -right-0.5 overflow-hidden rounded-[5px] ring-2 ring-background"
        aria-hidden
      >
        <SocialPlatformTile platform={platform} size={badgeSize} iconSize={iconSize} />
      </span>
    </div>
  );
}
