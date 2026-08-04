import { Avatar, AvatarImage } from "./ui/avatar";
import { cn } from "../lib/utils";
import { AuthenticatedImage } from "./AuthenticatedImage";

interface CreatorAvatarProps {
  src?: string | null;
  email?: string | null;
  className?: string;
  size?: "default" | "sm" | "lg";
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
export function CreatorAvatar({ src, email, className, size = "default" }: CreatorAvatarProps) {
  const fallbackSeed = email || "default";
  const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`;
  const useAuth = isAuthMedia(src);

  return (
    <Avatar size={size} className={cn("border border-border/50 overflow-hidden", className)}>
      {useAuth && src ? (
        <AuthenticatedImage
          src={src}
          alt=""
          disableRemoteFallback
          fallbackSrc={fallbackUrl}
          placeholderAspectRatio="1 / 1"
          className="!absolute inset-0 !h-full !w-full !object-cover !max-w-none"
          wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto !bg-transparent"
        />
      ) : (
        <AvatarImage
          src={src || fallbackUrl}
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </Avatar>
  );
}
