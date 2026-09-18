import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getHeroReelMedia, type MarketingMedia } from "../../../lib/marketingMedia";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { MarketingMediaReel, NicheTicker } from "./MarketingMediaReel";

export default function HeroV2() {
  const { t } = useTranslation();
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
    document.getElementById("pipeline")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32 md:pt-36 pb-8 md:pb-10">
      {/* Soft liveliness — Flow / vid.ai style atmosphere, not competing media */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-24 start-1/2 -translate-x-1/2 w-[90vw] h-[50vh] rounded-full bg-primary/15 blur-[100px]"
          animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 end-[-10%] w-[45vw] h-[40vh] rounded-full bg-teal-500/10 blur-[90px]"
          animate={{ opacity: [0.2, 0.4, 0.2], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 dots-pattern opacity-[0.035]" />
      </div>

      <div className="ui-container-hero relative z-10 w-full">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-bold tracking-[0.28em] uppercase text-teal-600 dark:text-teal-400 mb-6"
          >
            NXCLIP
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="ui-hero-title !mb-6 md:!mb-8"
          >
            {t("hero.title_line1")} <br />
            <span className="brand-text-gradient">{t("hero.title_line2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="ui-hero-subtitle !mb-8 md:!mb-10"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button variant="brand-premium" size="lg" className="h-12 px-8 font-bold" onClick={primary}>
              {user ? "Open Creator Hub" : "Get started free"}
              <ArrowRight size={16} className="ms-1.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 font-bold border-border/80 bg-background/50 backdrop-blur-sm"
              onClick={secondary}
            >
              <Play size={14} className="me-1.5 fill-current" />
              See how it works
            </Button>
          </motion.div>
          <NicheTicker />
        </div>

        {/* One dominant hero stage — isolated from capability tiles below */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.28, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 md:mt-10 mx-auto max-w-5xl"
        >
          <div className="absolute -inset-3 md:-inset-5 rounded-[1.75rem] bg-gradient-to-br from-primary/25 via-transparent to-teal-500/20 blur-2xl opacity-70" />
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl md:rounded-3xl overflow-hidden border border-white/15 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/30">
            <MarketingMediaReel
              items={reel}
              intervalMs={5200}
              cut="cinematic"
              camera="auto"
              nicheTabs
              showNiche={false}
              className="z-10"
            />
            <div className="absolute inset-0 z-[6] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.42)_100%)]" />
            <div className="absolute inset-0 z-[6] pointer-events-none opacity-40 bg-gradient-to-tr from-teal-950/35 via-transparent to-fuchsia-950/25" />
            <motion.div
              className="absolute inset-0 z-[12] border border-white/10 rounded-2xl md:rounded-3xl pointer-events-none"
              animate={{ opacity: [0.4, 0.75, 0.4] }}
              transition={{ duration: 4.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
