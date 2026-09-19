import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { NICHE_LABEL, NICHE_ORDER, type NicheKey } from "../../../lib/marketingCatalog";
import { type MarketingMedia } from "../../../lib/marketingMedia";
import { MarketingMediaFrame } from "./MarketingMediaFrame";

export type ReelCut = "dissolve" | "cut" | "whip" | "zoom" | "flash" | "push" | "mix" | "cinematic";
export type ReelCamera = "none" | "kenburns" | "handheld" | "crashzoom" | "drift" | "cinematic" | "trailer" | "auto";

const MIX_CYCLE: Exclude<ReelCut, "mix" | "cinematic">[] = ["dissolve", "cut", "whip", "zoom", "flash", "push"];
const CINEMA_CYCLE: Array<"dissolve" | "push"> = ["dissolve", "push"];

type Props = {
  items: MarketingMedia[];
  intervalMs?: number;
  portrait?: boolean;
  showNiche?: boolean;
  className?: string;
  nicheTabs?: boolean;
  cut?: ReelCut;
  camera?: ReelCamera;
  onIndexChange?: (index: number) => void;
};

export function MarketingMediaReel({
  items,
  intervalMs = 4200,
  portrait = false,
  showNiche = true,
  className,
  nicheTabs = false,
  cut = "dissolve",
  camera = "kenburns",
  onIndexChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState(0);
  const skipFlash = useRef(true);

  const activeCut: Exclude<ReelCut, "mix" | "cinematic"> =
    cut === "mix"
      ? MIX_CYCLE[index % MIX_CYCLE.length]
      : cut === "cinematic"
        ? CINEMA_CYCLE[index % CINEMA_CYCLE.length]
        : cut;

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

  useEffect(() => {
    if (skipFlash.current) {
      skipFlash.current = false;
      return;
    }
    if (activeCut !== "flash" && activeCut !== "cut") return;
    setFlash(activeCut === "flash" ? 0.92 : 0.35);
    const t = window.setTimeout(() => setFlash(0), activeCut === "flash" ? 140 : 70);
    return () => window.clearTimeout(t);
  }, [index, activeCut]);

  const nichesInReel = useMemo(() => {
    const present = new Set(items.map((m) => m.niche).filter(Boolean) as NicheKey[]);
    return NICHE_ORDER.filter((n) => present.has(n));
  }, [items]);

  if (!items.length) {
    return <MarketingMediaFrame media={null} className={className} />;
  }

  const cameraClass = cameraClassName(
    resolveCamera(camera, items[index]?.niche),
    items[index]?.type === "image",
  );

  if (items.length === 1) {
    return (
      <div className={cn("absolute inset-0", className)}>
        <MarketingMediaFrame
          media={items[0]}
          portrait={portrait}
          imgClassName={cameraClass}
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
      {items.map((item, i) => {
        const active = i === index;
        const motionProps = cutMotion(activeCut, active);
        const itemCamera = cameraClassName(
          resolveCamera(camera, item.niche),
          item.type === "image",
        );
        return (
          <motion.div
            key={`${item.src}-${item.niche ?? i}`}
            className="absolute inset-0 origin-center"
            initial={false}
            animate={motionProps.animate}
            transition={motionProps.transition}
            style={{ zIndex: active ? 2 : 1, pointerEvents: "none" }}
          >
            <MarketingMediaFrame
              media={item}
              portrait={portrait}
              active={active}
              imgClassName={cn(active && itemCamera)}
            />
          </motion.div>
        );
      })}
      <div className="absolute inset-0 z-[5] bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
      <motion.div
        className="absolute inset-0 z-[8] bg-white pointer-events-none mix-blend-overlay"
        animate={{ opacity: flash }}
        transition={{ duration: 0.12 }}
      />

      {showNiche && current?.niche && !nicheTabs && (
        <NicheChip niche={current.niche} className="absolute top-3 start-3 z-20" />
      )}

      {nicheTabs && (
        <div className="absolute bottom-3 start-3 end-3 z-20 flex flex-col gap-2 pointer-events-auto">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {nichesInReel.map((niche) => {
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
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide backdrop-blur-md border transition-colors",
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
              {cutLabel(activeCut)} · {current?.type === "video" ? "Reel" : "Still"}
            </span>
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
        </div>
      )}
    </div>
  );
}

export function NicheTicker() {
  const loop = [...NICHE_ORDER, ...NICHE_ORDER].map((n) => NICHE_LABEL[n]);
  return (
    <div className="relative mt-6 mb-1 overflow-hidden">
      <div className="flex w-max gap-8 home-niche-marquee">
        {loop.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground/80 whitespace-nowrap"
          >
            {label}
            <span className="ms-8 text-primary/70">●</span>
          </span>
        ))}
      </div>
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

function resolveCamera(camera: ReelCamera, niche?: NicheKey): Exclude<ReelCamera, "auto"> {
  if (camera !== "auto") return camera;
  switch (niche) {
    case "fashion":
    case "beauty":
      return "cinematic";
    case "gaming":
      return "trailer";
    case "tech":
      return "drift";
    case "viral":
      return "crashzoom";
    case "influencer":
      return "cinematic";
    default:
      return "kenburns";
  }
}

function cameraClassName(camera: Exclude<ReelCamera, "auto">, _isImage: boolean): string | undefined {
  switch (camera) {
    case "kenburns":
      return "home-kenburns";
    case "cinematic":
      return "home-cinematic";
    case "handheld":
      return "home-handheld";
    case "crashzoom":
      return "home-crashzoom";
    case "drift":
      return "home-drift";
    case "trailer":
      return "home-trailer";
    default:
      return undefined;
  }
}

function cutLabel(cut: Exclude<ReelCut, "mix">): string {
  switch (cut) {
    case "cut":
      return "Quick cut";
    case "whip":
      return "Whip pan";
    case "zoom":
      return "Crash zoom";
    case "flash":
      return "Flash cut";
    case "push":
      return "Push in";
    default:
      return "Dissolve";
  }
}

function cutMotion(cut: Exclude<ReelCut, "mix">, active: boolean) {
  switch (cut) {
    case "cut":
      return {
        animate: { opacity: active ? 1 : 0, x: 0, y: 0, scale: 1, skewX: 0, filter: "blur(0px)" },
        transition: { duration: 0.05 },
      };
    case "whip":
      return {
        animate: {
          opacity: active ? 1 : 0,
          x: active ? "0%" : "32%",
          y: 0,
          scale: 1,
          skewX: active ? 0 : -12,
          filter: active ? "blur(0px)" : "blur(10px)",
        },
        transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
      };
    case "zoom":
      return {
        animate: {
          opacity: active ? 1 : 0,
          x: 0,
          y: 0,
          scale: active ? 1 : 1.22,
          skewX: 0,
          filter: active ? "blur(0px)" : "blur(6px)",
        },
        transition: { duration: 0.38, ease: [0.2, 0.8, 0.2, 1] as const },
      };
    case "flash":
      return {
        animate: { opacity: active ? 1 : 0, x: 0, y: 0, scale: active ? 1 : 1.06, skewX: 0, filter: "blur(0px)" },
        transition: { duration: 0.12 },
      };
    case "push":
      return {
        animate: {
          opacity: active ? 1 : 0,
          x: 0,
          y: active ? "0%" : "18%",
          scale: active ? 1 : 1.08,
          skewX: 0,
          filter: "blur(0px)",
        },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
      };
    default:
      return {
        animate: { opacity: active ? 1 : 0, x: 0, y: 0, scale: 1, skewX: 0, filter: "blur(0px)" },
        transition: { duration: active ? 0.9 : 0.75, ease: [0.22, 1, 0.36, 1] as const },
      };
  }
}
