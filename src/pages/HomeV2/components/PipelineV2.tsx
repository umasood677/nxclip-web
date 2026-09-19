import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Share2, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getPipelineReels, type MarketingMedia } from "../../../lib/marketingMedia";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { MarketingMediaReel } from "./MarketingMediaReel";
import { cn } from "../../../lib/utils";

const STEPS = [
  {
    key: "create" as const,
    n: "01",
    title: "Create",
    desc: "Generate cinematic stills, memes, and clips across every niche.",
    cta: "Start creating",
    path: "/create",
    accent: "from-primary/80 to-transparent",
    Icon: Sparkles,
  },
  {
    key: "moderate" as const,
    n: "02",
    title: "Moderate",
    desc: "Safety and quality checks before anything goes public.",
    cta: "See Library",
    path: "/my-content",
    accent: "from-amber-500/70 to-transparent",
    Icon: CheckCircle2,
  },
  {
    key: "publish" as const,
    n: "03",
    title: "Publish",
    desc: "Post influencer-ready assets to your Feed, then go Live on YouTube, Instagram, or TikTok.",
    cta: "Go to Feed",
    path: "/feed",
    accent: "from-teal-500/80 to-transparent",
    Icon: Share2,
  },
];

export default function PipelineV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [media, setMedia] = useState<{
    create: MarketingMedia[];
    moderate: MarketingMedia[];
    publish: MarketingMedia[];
  }>({ create: [], moderate: [], publish: [] });

  useEffect(() => {
    let cancelled = false;
    void getPipelineReels().then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (path: string) => navigate(user ? path : "/signup");

  return (
    <section id="how-it-works" className="relative scroll-mt-24 pt-6 md:pt-8 pb-10 md:pb-14 overflow-hidden">
      <div className="ui-container-landing">
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-10">
          <p className="ui-landing-label !mb-4">{t("how_it_works.label")}</p>
          <h2 className="ui-landing-title mx-auto">
            {t("how_it_works.title")} <br />
            <span className="brand-text-gradient">{t("how_it_works.title_gradient")}</span>
          </h2>
          <p className="ui-landing-description mx-auto !mb-0">
            {t("how_it_works.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <div className="hidden md:block absolute top-[38%] start-[14%] end-[14%] h-px bg-gradient-to-r from-primary/50 via-amber-400/40 to-teal-500/50 -z-0" />

          {STEPS.map((step, i) => {
            const Icon = step.Icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative z-10 group rounded-2xl overflow-hidden border border-border/70 bg-card shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)] transition-shadow duration-300 hover:shadow-[0_28px_70px_-28px_rgba(0,0,0,0.55)]"
              >
                <div className="relative aspect-[4/5] sm:aspect-[5/6] md:aspect-[3/4] overflow-hidden bg-muted">
                  <MarketingMediaReel
                    items={media[step.key]}
                    intervalMs={step.key === "create" ? 2800 : step.key === "publish" ? 2100 : 4800}
                    cut={step.key === "create" ? "dissolve" : step.key === "publish" ? "whip" : "push"}
                    camera={step.key === "publish" ? "handheld" : step.key === "moderate" ? "drift" : "kenburns"}
                    showNiche={false}
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-t via-black/45 to-black/20", step.accent)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  <div className="absolute top-3 start-3 end-3 z-20 flex flex-col items-start gap-2.5 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-2xl font-black text-white tracking-tight drop-shadow-md">
                        {step.n}
                      </span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 border border-white/25 text-white backdrop-blur-md">
                        <Icon size={14} />
                      </span>
                    </div>

                    {step.key === "create" && (
                      <div className="rounded-xl border border-white/20 bg-black/55 backdrop-blur-md px-3 py-2 text-[11px] text-white/90 font-medium max-w-[90%]">
                        “Lookbook · Viral reels · Cinematic grade”
                      </div>
                    )}
                    {step.key === "moderate" && (
                      <div className="flex flex-col gap-1.5">
                        {["Brand safe", "Quality pass", "Ready"].map((label) => (
                          <span
                            key={label}
                            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-bold text-emerald-100"
                          >
                            <CheckCircle2 size={11} />
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {step.key === "publish" && (
                      <div className="flex flex-wrap gap-2">
                        {["Feed", "YT", "IG", "TT"].map((p) => (
                          <span
                            key={p}
                            className="rounded-lg bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-20 p-5 space-y-2">
                    <h3 className="font-display text-2xl font-bold text-white">{step.title}</h3>
                    <p className="text-[13px] text-white/75 font-medium leading-relaxed">
                      {step.desc}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-0 font-bold text-teal-300 hover:text-white hover:bg-transparent"
                      onClick={() => go(step.path)}
                    >
                      {step.cta}
                      <ArrowRight size={14} className="ms-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
