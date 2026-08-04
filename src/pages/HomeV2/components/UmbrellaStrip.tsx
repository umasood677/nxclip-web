import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Library,
  Radio,
  Gauge,
  LineChart,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import {
  getOsLayerMedia,
  type MarketingMedia,
  type OsLayerKey,
} from "../../../lib/marketingMedia";
import { cn } from "../../../lib/utils";
import { MarketingMediaFrame } from "./MarketingMediaFrame";

/**
 * Creator OS layers — Supercool-style capability panels with a visual plane
 * per layer so each surface feels concrete, not icon-only.
 */
const LAYERS: {
  key: OsLayerKey;
  step: string;
  role: string;
  title: string;
  blurb: string;
  outcomes: string[];
  href: string;
  icon: typeof Sparkles;
  accent: string;
  chip: string;
  bar: string;
}[] = [
  {
    key: "create",
    step: "01",
    role: "Create",
    title: "Studio core",
    blurb: "Where ideas become publishable assets.",
    outcomes: [
      "AI images & cinematic stills",
      "Meme templates with caption chrome",
      "Short-form clips ready to post",
    ],
    href: "/create",
    icon: Sparkles,
    accent: "text-teal-600 dark:text-teal-400",
    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500",
  },
  {
    key: "organize",
    step: "02",
    role: "Organize",
    title: "Asset vault",
    blurb: "One library you can trust end-to-end.",
    outcomes: [
      "Drafts, rejects & Live posts",
      "Reference images for refine",
      "Searchable creator library",
    ],
    href: "/my-content",
    icon: Library,
    accent: "text-sky-600 dark:text-sky-400",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  {
    key: "distribute",
    step: "03",
    role: "Distribute",
    title: "Social layer",
    blurb: "Presence that turns assets into reach.",
    outcomes: [
      "Creator feed & follows",
      "Go Live to TT / YT / IG",
      "Cross-platform publishing",
    ],
    href: "/feed",
    icon: Radio,
    accent: "text-rose-600 dark:text-rose-400",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  {
    key: "operate",
    step: "04",
    role: "Operate",
    title: "Command week",
    blurb: "The next best move, every week.",
    outcomes: [
      "Pipeline pulse dashboard",
      "Attention items to clear",
      "Weekly shipping status",
    ],
    href: "/dashboard",
    icon: Gauge,
    accent: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  {
    key: "measure",
    step: "05",
    role: "Measure",
    title: "Growth lens",
    blurb: "See what actually moved after publish.",
    outcomes: [
      "Real post-publish metrics",
      "Engagement & platform split",
      "What’s working this week",
    ],
    href: "/analytics",
    icon: LineChart,
    accent: "text-indigo-600 dark:text-indigo-400",
    chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  {
    key: "guide",
    step: "06",
    role: "Guide",
    title: "Coach orbit",
    blurb: "Strategy when you’re ready to scale.",
    outcomes: [
      "Week plans & content DNA",
      "AI coaching on demand",
      "Growth moves, not fluff",
    ],
    href: "/coach",
    icon: Compass,
    accent: "text-lime-700 dark:text-lime-400",
    chip: "bg-lime-500/10 text-lime-800 dark:text-lime-300",
    bar: "bg-lime-500",
  },
];

const LOOP = ["Create", "Organize", "Distribute", "Operate", "Measure", "Guide"] as const;

const EMPTY_MEDIA: Record<OsLayerKey, MarketingMedia | null> = {
  create: null,
  organize: null,
  distribute: null,
  operate: null,
  measure: null,
  guide: null,
};

export default function UmbrellaStrip() {
  const user = useAppSelector(selectAuthUser);
  const [media, setMedia] = useState<Record<OsLayerKey, MarketingMedia | null>>(EMPTY_MEDIA);

  useEffect(() => {
    let cancelled = false;
    void getOsLayerMedia().then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute top-0 start-1/2 -translate-x-1/2 w-[70%] h-[42%] bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.07),transparent_70%)]" />
      </div>

      <div className="ui-container-landing">
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-10">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold tracking-[0.28em] uppercase text-teal-600 dark:text-teal-400 mb-4"
          >
            Creator OS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="ui-landing-title mx-auto !mb-4"
          >
            One operating system for <br />
            <span className="brand-text-gradient">creator growth.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-base md:text-lg font-medium text-muted-foreground leading-relaxed"
          >
            Not another tool pile. Six layers, one loop — from idea to measured reach.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 }}
          className="mb-8 md:mb-10 overflow-x-auto"
        >
          <div className="mx-auto flex w-max max-w-full items-center gap-1 rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.45)] backdrop-blur-sm md:gap-0 md:px-2">
            {LOOP.map((label, i) => (
              <div key={label} className="flex items-center">
                <span className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-bold text-foreground md:px-4">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </span>
                {i < LOOP.length - 1 && (
                  <span
                    aria-hidden
                    className="mx-0.5 hidden h-px w-5 bg-border md:block lg:w-8"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {LAYERS.map((layer, i) => {
            const Icon = layer.icon;
            return (
              <motion.div
                key={layer.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.05, duration: 0.45 }}
              >
                <Link
                  to={user ? layer.href : "/login"}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card no-underline",
                    "transition-shadow duration-300",
                    "hover:border-border hover:shadow-[0_28px_60px_-36px_rgba(0,0,0,0.45)]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("absolute inset-x-0 top-0 z-20 h-0.5", layer.bar)}
                  />

                  {/* Visual plane — relevant image per OS layer */}
                  <div className="relative h-36 sm:h-40 overflow-hidden bg-muted/40">
                    <MarketingMediaFrame
                      media={media[layer.key]}
                      showCredit={false}
                      imgClassName="transition-transform duration-700 ease-out will-change-transform scale-[1.02] group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent pointer-events-none" />
                    <div className="absolute top-3 start-3 z-10 flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm",
                          layer.chip,
                        )}
                      >
                        {layer.role}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-white/80 drop-shadow">
                        {layer.step}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "absolute bottom-3 end-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-background/85 text-foreground shadow-md backdrop-blur-md transition-transform duration-300 group-hover:scale-105",
                        layer.accent,
                      )}
                    >
                      <Icon size={18} />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5 pt-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {layer.title}
                        </h3>
                        <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                          {layer.blurb}
                        </p>
                      </div>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors group-hover:border-foreground/30 group-hover:text-foreground">
                        <ArrowUpRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </span>
                    </div>

                    <ul className="mt-auto space-y-2 border-t border-border/50 pt-4">
                      {layer.outcomes.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-[13px] font-medium text-foreground/85"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                              layer.bar,
                            )}
                          />
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
