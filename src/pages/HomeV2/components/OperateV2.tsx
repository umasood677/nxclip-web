import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Compass,
  LineChart,
  Radio,
  Share2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { cn } from "../../../lib/utils";
import {
  getOperateReels,
  type MarketingMedia,
  type OperateReelKey,
} from "../../../lib/marketingMedia";
import {
  SocialPlatformIcon,
  SOCIAL_BRAND_TILE,
  type SocialBrandPlatform,
} from "../../../components/social/SocialPlatformIcon";
import { MarketingMediaFrame } from "./MarketingMediaFrame";
import { MarketingMediaReel } from "./MarketingMediaReel";

const PLATFORMS: SocialBrandPlatform[] = ["youtube", "instagram", "tiktok", "facebook"];

const EMPTY_REELS: Record<OperateReelKey, MarketingMedia[]> = {
  publish: [],
  feed: [],
  schedule: [],
  analytics: [],
  planning: [],
  workflow: [],
  suggest: [],
};

const FEATURES = [
  {
    key: "publish" as const,
    title: "Social publishing",
    line: "Go Live to YouTube, Instagram, TikTok, and Facebook from one desk.",
    path: "/feed",
    chip: "Live",
    icon: Share2,
    span: "md:col-span-7",
    height: "h-[200px] md:h-[228px]",
    cut: "whip" as const,
    camera: "trailer" as const,
    intervalMs: 3400,
  },
  {
    key: "feed" as const,
    title: "Creator feed",
    line: "Your posts, follows, and engagement — the home your audience lives in.",
    path: "/feed",
    chip: "Feed",
    icon: Radio,
    span: "md:col-span-5",
    height: "h-[200px] md:h-[228px]",
    cut: "dissolve" as const,
    camera: "kenburns" as const,
    intervalMs: 4200,
  },
  {
    key: "schedule" as const,
    title: "Scheduling",
    line: "Queue clips and stills for the windows that actually convert.",
    path: "/dashboard",
    chip: "Calendar",
    icon: CalendarClock,
    span: "md:col-span-4",
    height: "h-[188px]",
    cut: "push" as const,
    camera: "drift" as const,
    intervalMs: 4800,
  },
  {
    key: "analytics" as const,
    title: "Social analytics",
    line: "Views, watch time, and platform split after you publish.",
    path: "/analytics",
    chip: "Measure",
    icon: LineChart,
    span: "md:col-span-4",
    height: "h-[188px]",
    cut: "dissolve" as const,
    camera: "cinematic" as const,
    intervalMs: 5200,
  },
  {
    key: "planning" as const,
    title: "Week planning",
    line: "A command week: drafts, scheduled, Live — what ships next.",
    path: "/dashboard",
    chip: "Plan",
    icon: Compass,
    span: "md:col-span-4",
    height: "h-[188px]",
    cut: "cut" as const,
    camera: "kenburns" as const,
    intervalMs: 2800,
  },
  {
    key: "workflow" as const,
    title: "AI workflow",
    line: "The next best move, ranked — not another generic tip list.",
    path: "/dashboard",
    chip: "Coach",
    icon: Workflow,
    span: "md:col-span-6",
    height: "h-[210px] md:h-[224px]",
    cut: "push" as const,
    camera: "cinematic" as const,
    intervalMs: 4000,
  },
  {
    key: "suggest" as const,
    title: "Content suggestions",
    line: "Niche-aware ideas for clips, stills, and captions ready to generate.",
    path: "/coach",
    chip: "Ideas",
    icon: Sparkles,
    span: "md:col-span-6",
    height: "h-[210px] md:h-[224px]",
    cut: "mix" as const,
    camera: "auto" as const,
    intervalMs: 2200,
  },
];

function Thumb({ media, className }: { media?: MarketingMedia; className?: string }) {
  return (
    <span className={cn("relative overflow-hidden rounded-md bg-white/10 shrink-0", className)}>
      <MarketingMediaFrame media={media || null} showCredit={false} />
    </span>
  );
}

function Overlay({
  kind,
  items,
}: {
  kind: OperateReelKey;
  items: MarketingMedia[];
}) {
  if (kind === "publish") {
    return (
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-2">
          {PLATFORMS.map((p) => (
            <span
              key={p}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm",
                SOCIAL_BRAND_TILE[p],
              )}
            >
              <SocialPlatformIcon platform={p} size={14} variant="mono" />
            </span>
          ))}
          <span className="ms-auto rounded-full bg-teal-500/25 px-2.5 py-1 text-[10px] font-bold text-teal-100 border border-teal-300/30">
            Ready to Live
          </span>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/45 backdrop-blur-md p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
            <span>Clutch highlight · 0:18</span>
            <span className="text-teal-300">Queue → YT + TT</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary to-teal-400" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "feed") {
    const rows = [
      { title: "Gold-hour look", meta: "Live · 2.4k views" },
      { title: "Beauty close-up", meta: "On feed" },
      { title: "Gourmet plate", meta: "On feed" },
    ];
    return (
      <div className="flex h-full flex-col justify-end gap-1.5">
        {rows.map((row, i) => (
          <div
            key={row.title}
            className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-black/50 backdrop-blur-md px-2 py-1.5"
          >
            <Thumb media={items[i]} className="h-9 w-9" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{row.title}</p>
              <p className="text-[10px] text-white/60">{row.meta}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "schedule") {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    return (
      <div className="flex h-full flex-col justify-end">
        <div className="grid grid-cols-7 gap-1.5 rounded-xl border border-white/15 bg-black/45 backdrop-blur-md p-2.5">
          {days.map((d, i) => (
            <div key={`${d}-${i}`} className="text-center">
              <p className="text-[9px] font-bold text-white/50 mb-1">{d}</p>
              <div
                className={cn(
                  "h-9 rounded-lg border text-[9px] font-bold flex items-center justify-center",
                  i === 3
                    ? "border-teal-400/50 bg-teal-500/30 text-teal-100"
                    : i === 1 || i === 5
                      ? "border-white/15 bg-white/10 text-white/80"
                      : "border-white/10 bg-black/30 text-white/35",
                )}
              >
                {i === 3 ? "3" : i === 1 || i === 5 ? "1" : "·"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "analytics") {
    return (
      <div className="flex h-full items-end">
        <div className="grid w-full grid-cols-3 gap-2">
          {[
            ["124k", "Views"],
            ["8.2%", "ER"],
            ["4", "Live"],
          ].map(([n, l]) => (
            <div
              key={l}
              className="rounded-lg border border-white/15 bg-black/50 backdrop-blur-md px-2 py-2.5"
            >
              <p className="font-display text-lg font-bold text-white leading-none">{n}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/55 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "planning") {
    const rows = [
      ["Mon", "Draft beauty still"],
      ["Thu", "Live clip window"],
      ["Sat", "Gourmet + caption"],
    ];
    return (
      <div className="flex h-full flex-col justify-end gap-1.5">
        {rows.map(([day, task], i) => (
          <div
            key={day}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/50 backdrop-blur-md px-2 py-1.5 text-[11px]"
          >
            <Thumb media={items[i]} className="h-8 w-8" />
            <span className="w-8 font-bold text-teal-300">{day}</span>
            <span className="text-white/85 truncate">{task}</span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "workflow") {
    return (
      <div className="flex h-full flex-col justify-end gap-2">
        {[
          { n: "01", t: "Publish the Thursday clip first", s: "Peak window · 7–9pm" },
          { n: "02", t: "Connect Instagram for Live stats", s: "Unlock platform split" },
        ].map((row, i) => (
          <div
            key={row.n}
            className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 backdrop-blur-md px-2.5 py-2"
          >
            <Thumb media={items[i]} className="h-11 w-11 rounded-lg" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-teal-300">{row.n}</p>
              <p className="text-[12px] font-bold text-white mt-0.5 truncate">{row.t}</p>
              <p className="text-[10px] text-white/55">{row.s}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const ideas = [
    { label: "9:16 clip", niche: "Gaming" },
    { label: "Beauty still", niche: "Glam" },
    { label: "Travel reel", niche: "Aerial" },
    { label: "AI look", niche: "Influencer" },
  ];

  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-1.5">
      {ideas.map((idea, i) => (
        <div
          key={idea.label}
          className="relative overflow-hidden rounded-xl border border-white/15 bg-black/30"
        >
          <MarketingMediaFrame media={items[i] || null} showCredit={false} imgClassName="home-kenburns" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2">
            <p className="text-[11px] font-bold text-white leading-none">{idea.label}</p>
            <p className="text-[9px] font-semibold text-white/65 mt-0.5">{idea.niche}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OperateV2() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const go = (path: string) => navigate(user ? path : "/signup");
  const [reels, setReels] = useState(EMPTY_REELS);

  useEffect(() => {
    let cancelled = false;
    void getOperateReels().then((m) => {
      if (!cancelled) setReels(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="platform" className="relative scroll-mt-24 pt-8 md:pt-12 pb-10 md:pb-14 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 start-1/3 w-[50%] h-[40%] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      <div className="ui-container-landing">
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-10">
          <p className="ui-landing-label !mb-4">Operate the week</p>
          <h2 className="ui-landing-title mx-auto">
            Publish, schedule, and grow <br />
            <span className="brand-text-gradient">after the create click.</span>
          </h2>
          <p className="ui-landing-description mx-auto !mb-0">
            Social Live, your creator feed, calendars, analytics, week plans, and AI that
            suggests the next workflow — not just another studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const items = reels[f.key];
            const isSuggest = f.key === "suggest";
            return (
              <motion.button
                key={f.key}
                type="button"
                onClick={() => go(f.path)}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.05, duration: 0.45 }}
                className={cn(
                  "group text-start rounded-2xl border border-border/60 bg-card overflow-hidden",
                  "hover:border-border hover:shadow-[0_28px_60px_-36px_rgba(0,0,0,0.5)] transition-shadow",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                  f.span,
                )}
              >
                <div className={cn("relative overflow-hidden bg-zinc-950", f.height)}>
                  {!isSuggest && (
                    <>
                      <MarketingMediaReel
                        items={items}
                        intervalMs={f.intervalMs}
                        cut={f.cut}
                        camera={f.camera}
                        showNiche={false}
                      />
                      <div className="absolute inset-0 z-[6] bg-gradient-to-t from-black/80 via-black/35 to-black/15 pointer-events-none" />
                    </>
                  )}
                  <div className={cn("absolute inset-0 z-10 p-3 md:p-3.5", isSuggest && "p-2 md:p-2.5")}>
                    <Overlay kind={f.key} items={items} />
                  </div>
                </div>
                <div className="p-4 md:p-5 pt-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={14} className="text-teal-500" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {f.chip}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                    {f.line}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
                    Open
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
