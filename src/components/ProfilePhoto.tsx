import { cn } from "../lib/utils";
import { AuthenticatedImage } from "./AuthenticatedImage";

interface ProfilePhotoProps {
  src?: string | null;
  email?: string | null;
  className?: string;
  shape?: "square" | "circle";
  alt?: string;
}

function isAuthMedia(src?: string | null): boolean {
  if (!src) return false;
  return (
    src.startsWith("/content/") ||
    (src.includes("/content/") && src.includes("/media")) ||
    src.includes("api-gateway")
  );
}

/** Square-friendly profile photo that fills its parent box. */
export function ProfilePhoto({
  src,
  email,
  className,
  shape = "square",
  alt = "Profile photo",
}: ProfilePhotoProps) {
  const fallbackSeed = email || "default";
  const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackSeed}`;
  const useAuth = isAuthMedia(src);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted border border-border/50 h-full w-full",
        shape === "square" ? "rounded-lg" : "rounded-full",
        className,
      )}
    >
      {useAuth && src ? (
        <AuthenticatedImage
          src={src}
          alt={alt}
          disableRemoteFallback
          fallbackSrc={fallbackUrl}
          placeholderAspectRatio="1 / 1"
          className="!absolute inset-0 !h-full !w-full !object-cover !max-w-none"
          wrapperClassName="!absolute inset-0 !h-full !w-full !aspect-auto !bg-transparent"
        />
      ) : (
        <img
          src={src || fallbackUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
