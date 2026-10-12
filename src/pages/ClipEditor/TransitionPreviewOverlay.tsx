import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

export function transitionPreviewClass(type: string): string {
  const kind = type.toLowerCase();
  if (kind.includes("zoom")) return "bg-black/40 scale-[1.22] blur-[3px]";
  if (kind.includes("glitch")) return "bg-fuchsia-500/40 saturate-200 hue-rotate-15 skew-x-6";
  if (kind.includes("fade") || kind.includes("dissolve") || kind.includes("crossfade")) {
    return "bg-black/80";
  }
  if (kind.includes("wipe") || kind.includes("slide") || kind.includes("whip")) {
    return "bg-gradient-to-r from-black via-black/70 to-transparent";
  }
  if (kind.includes("flash") || kind.includes("whoosh")) return "bg-white/70";
  if (kind.includes("cut")) return "bg-black/55";
  return "bg-white/50";
}

export function TransitionPreviewOverlay({
  type,
  caption,
  sfx,
}: {
  type: string | null;
  caption?: string | null;
  sfx?: string | null;
}) {
  return (
    <AnimatePresence>
      {type ? (
        <motion.div
          key={`${type}-${caption || ""}`}
          className={cn(
            "absolute inset-0 z-40 pointer-events-none origin-center flex flex-col items-center justify-center gap-2",
            transitionPreviewClass(type),
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="rounded-lg border border-white/30 bg-black/70 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
            <p className="text-[11px] font-black uppercase tracking-wider text-white">
              {type}
            </p>
            {caption ? (
              <p className="text-[10px] font-semibold text-white/90 mt-0.5 max-w-[200px]">
                {caption}
              </p>
            ) : null}
            {sfx ? (
              <p className="text-[9px] font-bold text-amber-300 mt-1">SFX · {sfx}</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
