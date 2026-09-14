import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "../lib/utils";
import { AuthenticatedImage } from "./AuthenticatedImage";

/** Avatars are tiny — fail over to the generated fallback well before tile media would. */
const AVATAR_LOAD_TIMEOUT_MS = 6000;

interface CreatorAvatarProps {
  src?: string | null;
  email?: string | null;
  className?: string;
  size?: "default" | "sm" | "lg";
  /** Nav/header avatars are above the fold — load eagerly instead of lazily. */
  priority?: boolean;
}

function isAuthMedia(src?: string | null): boolean {
  if (!src) return false;
  return (
    src.startsWith("/content/") ||
    (src.includes("/content/") && src.includes("/media")) ||
    src.includes("api-gateway")
  );
}

/** Header/nav avatar — image only (no letter glyph overlay). */
export function CreatorAvatar({
  src,
  email,
  className,
  size = "default",
  priority = true,
}: CreatorAvatarProps) {
  const fallbackSeed = email || "default";
  const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`;
  const useAuth = isAuthMedia(src);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    setAuthFailed(false);
  }, [src]);

  const imageSrc = authFailed || !src ? fallbackUrl : src;

  return (
    <Avatar size={size} className={cn("border border-border/50 overflow-hidden", className)}>
      {useAuth && src && !authFailed ? (
        <AuthenticatedImage
          src={src}
          alt=""
          priority={priority}
          loadTimeoutMs={AVATAR_LOAD_TIMEOUT_MS}
          disableRemoteFallback
          fallbackSrc={fallbackUrl}
          placeholderAspectRatio="1 / 1"
          onError={() => setAuthFailed(true)}
          className="!absolute inset-0 !h-full !w-full !object-cover !max-w-none"
          wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto !bg-transparent"
        />
      ) : (
        <AvatarImage
          src={imageSrc}
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback className="bg-muted text-[10px] font-semibold uppercase">
        {(fallbackSeed.trim().charAt(0) || "?").toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
