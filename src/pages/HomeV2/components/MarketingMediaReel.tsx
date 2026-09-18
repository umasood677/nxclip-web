import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { NICHE_LABEL, type NicheKey } from "../../../lib/marketingCatalog";
import { type MarketingMedia } from "../../../lib/marketingMedia";
import { MarketingMediaFrame } from "./MarketingMediaFrame";

type Props = {
  items: MarketingMedia[];
  intervalMs?: number;
  portrait?: boolean;
  showNiche?: boolean;
  kenBurns?: boolean;
  className?: string;
  /** Hero: clickable niche pills under the stage */
  nicheTabs?: boolean;
  onIndexChange?: (index: number) => void;
};

export function MarketingMediaReel({
  items,
  intervalMs = 4200,
  portrait = false,
  showNiche = true,
  kenBurns = true,
  className,
  nicheTabs = false,
  onIndexChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const t = window.setInterval(() => {
      setIndex((n) => (n + 1) % items.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [items.length, intervalMs, paused]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  if (!items.length) {
    return <MarketingMediaFrame media={null} className={className} />;
  }

  if (items.length === 1) {
    return (
      <div className={cn("absolute inset-0", className)}>
        <MarketingMediaFrame
          media={items[0]}
          portrait={portrait}
          imgClassName={kenBurns && items[0].type === "image" ? "home-kenburns" : undefined}
        />
        {showNiche && items[0].niche && (
          <NicheChip niche={items[0].niche} className="absolute top-3 start-3 z-20" />
        )}
      </div>
    );
  }

  const current = items[index];

  return (
    <div
      className={cn("absolute inset-0", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((item, i) => (
        <motion.div
          key={`${item.src}-${item.niche ?? i}`}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === index ? 1 : 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <MarketingMediaFrame
            media={item}
            portrait={portrait}
            active={i === index}
            imgClassName={cn(kenBurns && i === index && item.type === "image" && "home-kenburns")}
          />
        </motion.div>
      ))}
      <div className="absolute inset-0 z-[5] bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

      {showNiche && current?.niche && !nicheTabs && (
        <NicheChip niche={current.niche} className="absolute top-3 start-3 z-20" />
      )}

      {nicheTabs && (
        <div className="absolute bottom-3 start-3 end-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="flex flex-wrap gap-1.5">
            {(["gaming", "fashion", "food", "influencer"] as NicheKey[]).map((niche) => {
              const target = items.findIndex((m) => m.niche === niche);
              const on = current?.niche === niche;
              return (
                <button
                  key={niche}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (target >= 0) setIndex(target);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide backdrop-blur-md border transition-colors",
                    on
                      ? "bg-white text-black border-white"
                      : "bg-black/45 text-white/85 border-white/20 hover:bg-black/60",
                  )}
                >
                  {NICHE_LABEL[niche]}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show look ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NicheChip({ niche, className }: { niche: NicheKey; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md bg-black/55 border border-white/20 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white backdrop-blur-sm pointer-events-none",
        className,
      )}
    >
      {NICHE_LABEL[niche]}
    </span>
  );
}
