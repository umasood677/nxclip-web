import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getHeroReelMedia, type MarketingMedia } from "../../../lib/marketingMedia";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { MarketingMediaReel } from "./MarketingMediaReel";

const PULSE = ["Create", "Publish", "Measure"] as const;

export default function HeroV2() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [reel, setReel] = useState<MarketingMedia[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getHeroReelMedia().then((items) => {
      if (!cancelled) setReel(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const primary = () => navigate(user ? "/create" : "/signup");
  const secondary = () => {
    document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-24 md:pt-28 pb-6 md:pb-8 min-h-[100svh] flex flex-col justify-end"
    >
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_55%,transparent)_72%)]" />
        <motion.div
          className="absolute -top-16 -start-10 w-[70vw] h-[40vh] rounded-full bg-teal-500/12 dark:bg-teal-400/10 blur-[90px]"
          animate={{ opacity: [0.35, 0.6, 0.35], x: [0, 18, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[20%] -end-16 w-[55vw] h-[38vh] rounded-full bg-primary/10 blur-[100px]"
          animate={{ opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="ui-container-hero relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-12 lg:items-end">
          <div className="lg:col-span-6 xl:col-span-5 text-start">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-5 md:mb-7"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-teal-500 animate-ping opacity-40" />
                <span className="relative h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" />
              </span>
              <span className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase text-foreground/60">
                Live
              </span>
              <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-semibold text-foreground/45">
                {PULSE.map((item, i) => (
                  <span key={item} className="inline-flex items-center gap-2.5">
                    {i > 0 && <span className="text-teal-600/50 dark:text-teal-400/40">/</span>}
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="font-display font-black tracking-[-0.065em] text-foreground leading-[0.86]"
            >
              <span className="block text-[18vw] sm:text-[72px] md:text-[84px] lg:text-[92px]">
                Viral
              </span>
              <span className="mt-1 block text-[8.4vw] sm:text-[34px] md:text-[40px] lg:text-[44px] font-semibold tracking-[-0.04em] text-foreground/72">
                content, redefined
              </span>
              <span className="mt-3 inline-flex items-baseline gap-2">
                <span className="text-[11vw] sm:text-[48px] md:text-[56px] italic font-black text-teal-700 dark:text-teal-300">
                  by AI
                </span>
                <span
                  aria-hidden
                  className="mb-1.5 h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-300"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 md:mt-6 max-w-[34rem] text-[15px] sm:text-[17px] leading-relaxed font-medium text-foreground/70"
            >
              Create, publish, and grow from one OS — feed, schedule, and analytics included.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-2.5 sm:gap-3"
            >
              <Button
                variant="brand-premium"
                size="lg"
                className="h-12 w-full sm:w-auto px-7 font-bold text-[15px]"
                onClick={primary}
              >
                {user ? "Open Creator Hub" : "Start creating"}
                <ArrowRight size={16} className="ms-1.5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full sm:w-auto px-6 font-semibold text-[15px] border-foreground/15 bg-background/70"
                onClick={secondary}
              >
                <Play size={13} className="me-1.5 fill-current" />
                See the platform
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 xl:col-span-7 relative"
          >
            <div className="absolute -inset-3 rounded-[1.6rem] bg-gradient-to-br from-teal-500/20 via-transparent to-primary/20 blur-2xl opacity-70" />
            <div className="relative aspect-[16/11] sm:aspect-[16/10] lg:aspect-[16/11] rounded-2xl overflow-hidden border border-foreground/10 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)]">
              <MarketingMediaReel
                items={reel}
                intervalMs={5200}
                cut="cinematic"
                camera="auto"
                nicheTabs
                showNiche={false}
                className="z-10"
              />
              <div className="absolute inset-0 z-[6] pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
