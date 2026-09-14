import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface CreatorNicheTagsProps {
  categoryLabel?: string | null;
  niches?: string[];
  className?: string;
  size?: "sm" | "md";
  emptyLabel?: string;
  /** Studio banners sit on dark muted surfaces */
  tone?: "default" | "studio";
}

export function CreatorNicheTags({
  categoryLabel,
  niches = [],
  className,
  size = "sm",
  emptyLabel,
  tone = "default",
}: CreatorNicheTagsProps) {
  const chips = niches.filter((n) => n && n !== categoryLabel);
  const compact = size === "sm";
  const studio = tone === "studio";

  if (!categoryLabel && chips.length === 0) {
    if (!emptyLabel) return null;
    return (
      <span className={cn("text-xs text-muted-foreground italic", className)}>{emptyLabel}</span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {categoryLabel ? (
        <Badge
          className={cn(
            "border-none font-semibold",
            compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs",
            studio
              ? "bg-teal-400/15 text-teal-100 border border-teal-400/25"
              : "bg-teal-500/15 text-teal-800 dark:text-teal-200",
          )}
        >
          {categoryLabel}
        </Badge>
      ) : null}
      {chips.map((niche) => (
        <Badge
          key={niche}
          variant="secondary"
          className={cn(
            "font-medium",
            compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs",
            studio && "bg-white/10 text-white/90 border border-white/15",
          )}
        >
          {niche}
        </Badge>
      ))}
    </div>
  );
}
