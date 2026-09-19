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
  SocialPlatformIcon,
  SOCIAL_BRAND_TILE,
  type SocialBrandPlatform,
} from "../../../components/social/SocialPlatformIcon";

const PLATFORMS: SocialBrandPlatform[] = ["youtube", "instagram", "tiktok", "facebook"];

const FEATURES = [
  {
    key: "publish",
    title: "Social publishing",
    line: "Go Live to YouTube, Instagram, TikTok, and Facebook from one desk.",
    path: "/feed",
    chip: "Live",
    icon: Share2,
    span: "md:col-span-7",
    preview: "publish" as const,
  },
  {
    key: "feed",
    title: "Creator feed",
    line: "Your posts, follows, and engagement — the home your audience lives in.",
    path: "/feed",
    chip: "Feed",
    icon: Radio,
    span: "md:col-span-5",
    preview: "feed" as const,
  },
  {
    key: "schedule",
    title: "Scheduling",
    line: "Queue clips and stills for the windows that actually convert.",
    path: "/dashboard",
    chip: "Calendar",
    icon: CalendarClock,
    span: "md:col-span-4",
    preview: "schedule" as const,
  },
  {
    key: "analytics",
    title: "Social analytics",
    line: "Views, watch time, and platform split after you publish.",
    path: "/analytics",
    chip: "Measure",
    icon: LineChart,
    span: "md:col-span-4",
    preview: "analytics" as const,
  },
  {
    key: "planning",
    title: "Week planning",
    line: "A command week: drafts, scheduled, Live — what ships next.",
    path: "/dashboard",
    chip: "Plan",
    icon: Compass,
    span: "md:col-span-4",
    preview: "planning" as const,
  },
  {
    key: "workflow",
    title: "AI workflow",
    line: "The next best move, ranked — not another generic tip list.",
    path: "/dashboard",
    chip: "Coach",
    icon: Workflow,
    span: "md:col-span-6",
    preview: "workflow" as const,
  },
  {
    key: "suggest",
    title: "Content suggestions",
    line: "Niche-aware ideas for clips, stills, and captions ready to generate.",
    path: "/coach",
    chip: "Ideas",
    icon: Sparkles,
    span: "md:col-span-6",
    preview: "suggest" as const,
  },
];

function Preview({ kind }: { kind: (typeof FEATURES)[number]["preview"] }) {
  if (kind === "publish") {
    return (
      <div className="space-y-3">
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
          <span className="ms-auto rounded-full bg-teal-500/15 px-2.5 py-1 text-[10px] font-bold text-teal-300">
            Ready to Live
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
            <span>Clutch highlight · 0:18</span>
            <span className="text-teal-300">Queue → YT + TT</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary to-teal-400" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "feed") {
    return (
      <div className="space-y-2">
        {["Night city still", "Beauty close-up", "Food plate"].map((title, i) => (
          <div
            key={title}
            className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2"
          >
            <span className="h-8 w-8 rounded-md bg-gradient-to-br from-white/20 to-white/5" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{title}</p>
              <p className="text-[10px] text-white/55">{i === 0 ? "Live · 2.4k views" : "On feed"}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "schedule") {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    return (
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={`${d}-${i}`} className="text-center">
            <p className="text-[9px] font-bold text-white/45 mb-1">{d}</p>
            <div
              className={cn(
                "h-10 rounded-lg border text-[9px] font-bold flex items-center justify-center",
                i === 3
                  ? "border-teal-400/40 bg-teal-500/20 text-teal-200"
                  : i === 1 || i === 5
                    ? "border-white/10 bg-white/5 text-white/70"
                    : "border-white/5 bg-black/20 text-white/30",
              )}
            >
              {i === 3 ? "3" : i === 1 || i === 5 ? "1" : "·"}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "analytics") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[
          ["124k", "Views"],
          ["8.2%", "ER"],
          ["4", "Live"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-lg border border-white/10 bg-black/30 px-2 py-2.5">
            <p className="font-display text-lg font-bold text-white leading-none">{n}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/45 mt-1">{l}</p>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "planning") {
    return (
      <div className="space-y-1.5">
        {[
          ["Mon", "Draft beauty still"],
          ["Thu", "Live clip window"],
          ["Sat", "Meme + caption"],
        ].map(([day, task]) => (
          <div key={day} className="flex items-center gap-2 text-[11px]">
            <span className="w-8 font-bold text-teal-300">{day}</span>
            <span className="text-white/75">{task}</span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "workflow") {
    return (
      <div className="space-y-2">
        {[
          { n: "01", t: "Publish the Thursday clip first", s: "Peak window · 7–9pm" },
          { n: "02", t: "Connect Instagram for Live stats", s: "Unlock platform split" },
        ].map((row) => (
          <div key={row.n} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
            <p className="text-[10px] font-bold text-teal-300">{row.n}</p>
            <p className="text-[12px] font-bold text-white mt-0.5">{row.t}</p>
            <p className="text-[10px] text-white/50">{row.s}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {["9:16 clip", "Beauty still", "Food reel", "Caption pack"].map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/80"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function OperateV2() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const go = (path: string) => navigate(user ? path : "/signup");

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
                <div className="relative p-4 md:p-5 bg-gradient-to-br from-zinc-950 to-zinc-900 min-h-[148px]">
                  <Preview kind={f.preview} />
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
