import React from "react";
import { cn } from "../../../../lib/utils";
import type { StatusBadgeInfo } from "./statusStyles";

/** Compact glass status pill with a colored dot — used on image cards/preview. */
export function StatusPill({
  badge,
  className,
}: {
  badge: StatusBadgeInfo;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md",
        badge.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", badge.dotClassName)} aria-hidden />
      {badge.label}
    </span>
  );
}
