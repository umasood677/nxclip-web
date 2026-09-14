import { cn } from "../lib/utils";

interface MediaTileLoadingPlaceholderProps {
  className?: string;
  /** Shorter variant for small list thumbnails */
  compact?: boolean;
}

/**
 * Soft gradient skeleton while authenticated media loads — muted like Google Photos tiles,
 * not a loud shimmer (avoids “glitch” feel on first paint).
 */
export function MediaTileLoadingPlaceholder({
  className,
  compact = false,
}: MediaTileLoadingPlaceholderProps) {
  return (
    <div
      className={cn(
        "media-tile-loading absolute inset-0 z-[1] overflow-hidden",
        compact && "media-tile-loading--compact",
        className,
      )}
      aria-hidden
    />
  );
}
