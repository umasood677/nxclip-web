import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Film, Scissors, Sparkles } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getCapabilityReels,
  type MarketingMedia,
} from "../../../lib/marketingMedia";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { MarketingMediaReel } from "./MarketingMediaReel";

type CapKey = "imageStudio" | "meme" | "viralClips" | "clipEditor" | "coach";

type CapDef = {
  key: CapKey;
  title: string;
  line: string;
  chip: string;
  path: string;
  cta: string;
  variant?: "meme" | "editor" | "coach" | "clip";
  portrait?: boolean;
  intervalMs: number;
  cut: "dissolve" | "cut" | "whip" | "zoom" | "flash" | "push" | "mix";
  camera: "none" | "kenburns" | "handheld" | "crashzoom" | "drift" | "cinematic" | "trailer";
  /** 12-col span — paired tiles in a row share one fixed height for alignment. */
  span: string;
  height: string;
};

/**
 * Two precise bento rows (7+5 / 5+7 on md, 8+4 / 4+8 on lg) plus a full-width
 * coach band. Equal heights per row keep mixed aspect media visually ordered
 * instead of cascading into a scattered masonry.
 */
const CAPS: CapDef[] = [
  {
    key: "imageStudio",
    title: "Image Studio",
    line: "Cinematic AI stills across Gaming, Fashion, Food, Travel, Beauty, and more.",
    chip: "AI Image",
    path: "/create/image",
    cta: "Try Image Studio",
    intervalMs: 3600,
    cut: "mix",
    camera: "cinematic",
    span: "md:col-span-7 lg:col-span-8",
    height: "h-[240px] sm:h-[260px] md:h-[300px] lg:h-[320px]",
  },
  {
    key: "meme",
    title: "Meme Generator",
    line: "Punchlines with caption chrome — ready to post.",
    chip: "Meme",
    path: "/create/image?type=meme",
    cta: "Make a meme",
    variant: "meme",
    intervalMs: 1500,
    cut: "cut",
    camera: "none",
    span: "md:col-span-5 lg:col-span-4",
    height: "h-[240px] sm:h-[260px] md:h-[300px] lg:h-[320px]",
  },
  {
    key: "viralClips",
    title: "Viral Clips",
    line: "Trend-speed shorts — whip pans, quick cuts, feed-native motion.",
    chip: "Short-form",
    path: "/create/clip",
    cta: "Explore clips",
    variant: "clip",
    portrait: true,
    intervalMs: 1900,
    cut: "whip",
    camera: "handheld",
    span: "md:col-span-5 lg:col-span-4",
    height: "h-[240px] sm:h-[260px] md:h-[300px] lg:h-[320px]",
  },
  {
    key: "clipEditor",
    title: "Clip Studio",
    line: "Trim, smash-cut, and crash-zoom highlights like an editor bay.",
    chip: "Edit",
    path: "/create/clip",
    cta: "Open Clip Studio",
    variant: "editor",
    intervalMs: 1700,
    cut: "flash",
    camera: "crashzoom",
    span: "md:col-span-7 lg:col-span-8",
    height: "h-[240px] sm:h-[260px] md:h-[300px] lg:h-[320px]",
  },
  {
    key: "coach",
    title: "Creator Coach",
    line: "Week plans and strategy when you’re ready to grow.",
    chip: "Strategy",
    path: "/coach",
    cta: "Meet your Coach",
    variant: "coach",
    intervalMs: 5600,
    cut: "dissolve",
    camera: "drift",
    span: "md:col-span-12",
    height: "h-[200px] sm:h-[220px] md:h-[240px] lg:h-[260px]",
  },
];

function CapChrome({ variant }: { variant?: CapDef["variant"] }) {
  if (variant === "meme") {
    return (
      <>
        <div className="absolute inset-x-0 top-0 z-10 bg-black/85 py-2 text-center text-[11px] font-black uppercase tracking-widest text-white">
          When the clutch hits different
        </div>
        <div className="absolute inset-x-0 bottom-[5rem] z-10 bg-black/85 py-2 text-center text-[11px] font-black uppercase tracking-widest text-white md:bottom-[5.25rem]">
          GG EZ
        </div>
      </>
    );
  }
  if (variant === "editor") {
    return (
      <div className="absolute inset-x-3 top-3 z-10 space-y-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-teal-500 px-2 py-0.5 text-[9px] font-bold text-white">
            Trim
          </span>
          <Scissors size={12} className="text-white/80" />
        </div>
        <div className="h-2 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full w-[42%] bg-white relative">
            <span className="absolute -top-1 end-0 h-4 w-1 rounded-sm bg-teal-400" />
            <span className="absolute -top-1 start-[70%] h-4 w-1 rounded-sm bg-rose-400" />
          </div>
        </div>
      </div>
    );
  }
  if (variant === "clip") {
    return (
      <div className="absolute top-3 end-3 z-10 rounded-md bg-black/55 px-2 py-1 text-[9px] font-bold text-white/90 backdrop-blur-sm">
        0:12 · Shorts
      </div>
    );
  }
  if (variant === "coach") {
    return (
      <div className="absolute top-3 start-3 end-3 z-10 space-y-2 pointer-events-none">
        <div className="rounded-xl border border-white/15 bg-black/60 backdrop-blur-md p-3 max-w-xs">
          <p className="text-[10px] text-white/90 font-medium leading-snug">
            Post 3 clips this week — Thursday evening is your peak window.
          </p>
        </div>
        <div className="rounded-lg border border-teal-400/30 bg-teal-500/20 px-2.5 py-1.5 text-[9px] font-bold text-teal-100 w-fit">
          Week plan · 5 days ready
        </div>
      </div>
    );
  }
  return null;
}

function CapCard({
  def,
  items,
  loggedIn,
  index,
}: {
  def: CapDef;
  items: MarketingMedia[];
  loggedIn: boolean;
  index: number;
}) {
  const navigate = useNavigate();
  const go = () => navigate(loggedIn ? def.path : "/login");

  return (
    <motion.button
      type="button"
      onClick={go}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative isolate text-start overflow-hidden rounded-2xl border border-border/50 bg-card",
        "shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] transition-shadow duration-300",
        "hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.55)]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
        def.span,
        def.height,
      )}
    >
      <div className="absolute inset-0 overflow-hidden bg-muted">
        <MarketingMediaReel
          items={items}
          portrait={def.portrait}
          intervalMs={def.intervalMs}
          cut={def.cut}
          camera={def.camera}
          showNiche={def.key === "imageStudio" || def.key === "viralClips"}
        />
      </div>
      <div className="absolute inset-0 z-[6] bg-gradient-to-t from-black/95 via-black/45 to-black/15 pointer-events-none" />
      <CapChrome variant={def.variant} />

      <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 md:p-4 space-y-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-8">
        <span className="inline-flex rounded-md bg-white/15 border border-white/20 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
          {def.chip}
        </span>
        <h3 className="font-display text-base md:text-lg font-bold text-white tracking-tight">
          {def.title}
        </h3>
        <p className="text-[11px] md:text-[12px] text-white/75 font-medium leading-snug line-clamp-2">
          {def.line}
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-300 pt-0.5">
          {def.cta}
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.button>
  );
}

export default function CapabilitiesV2() {
  const { t } = useTranslation();
  const user = useAppSelector(selectAuthUser);
  const [media, setMedia] = useState<Record<CapKey, MarketingMedia[]>>({
    imageStudio: [],
    meme: [],
    viralClips: [],
    clipEditor: [],
    coach: [],
  });

  useEffect(() => {
    let cancelled = false;
    void getCapabilityReels().then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="features" className="relative scroll-mt-24 pt-6 md:pt-10 pb-8 md:pb-12 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/3 end-0 w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px]" />
      </div>
      <div className="ui-container-landing">
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-10">
          <p className="ui-landing-label !mb-4">{t("features.label")}</p>
          <h2 className="ui-landing-title mx-auto">
            {t("features.title_line1")} <br />
            <span className="brand-text-gradient">{t("features.title_line2")}</span>
          </h2>
          <p className="ui-landing-description mx-auto !mb-0">
            {t("features.description")}
          </p>
        </div>

        {/* AI Story Engine — live site is HomeV2; must live here (not only /home-old Features) */}
        <motion.button
          type="button"
          onClick={() => navigate(user ? "/create/story-engine" : "/login")}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="group w-full text-start mb-5 md:mb-6 rounded-2xl border border-border/60 bg-card overflow-hidden shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] transition-shadow hover:shadow-[0_28px_60px_-28px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        >
          <div className="grid lg:grid-cols-2">
            <div className="relative p-6 md:p-8 flex flex-col justify-center min-h-[240px]">
              <div className="inline-flex items-center gap-2 w-fit mb-4 px-2.5 py-1 rounded-md bg-orange-500/15 text-orange-200 text-[9px] font-bold border border-orange-400/25 tracking-wide uppercase">
                <Sparkles size={11} />
                {t("features.story_engine.badge")}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
                  <Film size={20} />
                </div>
                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {t("features.story_engine.title")}
                </h3>
              </div>
              <p className="text-[13px] md:text-[14px] font-medium text-foreground/70 leading-relaxed max-w-md mb-5">
                {t("features.story_engine.description")}
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  t("features.story_engine.step_upload"),
                  t("features.story_engine.step_plan"),
                  t("features.story_engine.step_produce"),
                ].map((step, i) => (
                  <span
                    key={step}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[10px] font-bold text-foreground"
                  >
                    <span className="text-orange-500 tabular-nums">0{i + 1}</span>
                    {step}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-orange-400">
                {t("features.story_engine.cta")}
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </div>

            <div className="relative border-t lg:border-t-0 lg:border-s border-border/50 bg-muted/20 p-5 md:p-6 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.14),transparent_55%)]" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("features.story_engine.plan_label")}
                  </p>
                  <span className="text-[9px] font-bold text-orange-400">9:16 · Short</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground">
                    {t("features.story_engine.mock_summary_title")}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("features.story_engine.mock_summary")}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/50 bg-background/70 overflow-hidden"
                    >
                      <div
                        className={cn(
                          "aspect-[9/12]",
                          i === 0
                            ? "bg-orange-500/30"
                            : i === 1
                              ? "bg-teal-500/25"
                              : "bg-amber-500/25",
                        )}
                      />
                      <div className="px-1.5 py-1 text-[8px] font-bold text-muted-foreground truncate">
                        {t(`features.story_engine.mock_clip_${i + 1}`)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {[
                    t("features.story_engine.mock_act_hook"),
                    t("features.story_engine.mock_act_peak"),
                    t("features.story_engine.mock_act_cta"),
                  ].map((act, i) => (
                    <div
                      key={act}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/70 px-2.5 py-1.5"
                    >
                      <span className="text-[9px] font-black text-orange-500 w-9 shrink-0">
                        ACT {i + 1}
                      </span>
                      <span className="text-[10px] font-medium text-foreground truncate">
                        {act}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {CAPS.map((cap, i) => (
            <CapCard
              key={cap.key}
              def={cap}
              items={media[cap.key]}
              loggedIn={!!user}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
