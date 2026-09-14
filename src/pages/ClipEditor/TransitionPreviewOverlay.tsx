import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

export function transitionPreviewClass(type: string): string {
  const kind = type.toLowerCase();
  if (kind.includes("zoom")) return "bg-black/25 scale-[1.18] blur-[2px]";
  if (kind.includes("glitch")) return "bg-fuchsia-500/25 saturate-200 hue-rotate-15 skew-x-6";
  if (kind.includes("fade") || kind.includes("dissolve")) return "bg-black/70";
  if (kind.includes("wipe") || kind.includes("slide")) {
    return "bg-gradient-to-r from-black via-black/50 to-transparent";
  }
  if (kind.includes("flash") || kind.includes("whoosh")) return "bg-white/55";
  return "bg-white/35";
}

export function TransitionPreviewOverlay({ type }: { type: string | null }) {
  return (
    <AnimatePresence>
      {type ? (
        <motion.div
          key={type}
          className={cn(
            "absolute inset-0 z-30 pointer-events-none origin-center",
            transitionPreviewClass(type),
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
      ) : null}
    </AnimatePresence>
  );
}
