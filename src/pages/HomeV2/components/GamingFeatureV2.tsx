import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { GAME_TITLES } from "../../../lib/marketingCatalog";
import { getGamingFeatureMedia, type MarketingMedia } from "../../../lib/marketingMedia";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { MarketingMediaReel } from "./MarketingMediaReel";

export default function GamingFeatureV2() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [stage, setStage] = useState<MarketingMedia[]>([]);
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getGamingFeatureMedia().then((items) => {
      if (!cancelled) setStage(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setTitleIndex((n) => (n + 1) % GAME_TITLES.length);
    }, 2400);
    return () => window.clearInterval(t);
  }, []);

  const go = () => navigate(user ? "/create" : "/signup");
  const title = GAME_TITLES[titleIndex % GAME_TITLES.length];

  return (
    <section id="gaming" className="relative scroll-mt-24 py-6 md:py-8 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 start-0 w-[40%] h-[40%] bg-teal-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="ui-container-landing">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 lg:items-center">
          <div className="lg:col-span-5 text-start">
            <p className="ui-landing-label !mb-2 inline-flex items-center gap-2">
              <Gamepad2 size={12} />
              Gaming
            </p>
            <h2 className="font-display font-black tracking-[-0.05em] text-[28px] sm:text-[34px] leading-[0.95] text-foreground mb-3">
              Clips for the titles
              <br />
              <span className="brand-text-gradient italic">creators ship this week.</span>
            </h2>
            <p className="text-[14px] sm:text-[15px] leading-relaxed font-medium text-foreground/65 max-w-md mb-4">
              Straight-on play, trailer cuts, and title type on the reel — not a wall of empty cards.
            </p>
            <Button variant="brand-premium" className="h-10 px-5 font-bold" onClick={go}>
              Create gaming content
              <ArrowRight size={15} className="ms-1.5" />
            </Button>
          </div>

          <motion.button
            type="button"
            onClick={go}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card text-start h-[200px] sm:h-[240px] lg:h-[260px]"
          >
            <MarketingMediaReel
              items={stage}
              intervalMs={3200}
              cut="mix"
              camera="auto"
              showNiche={false}
            />
            <div className="absolute inset-0 z-[6] pointer-events-none bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-0 z-10 flex flex-col justify-end p-5 sm:p-6 pointer-events-none">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.28em] text-teal-200/90 mb-1.5">
                Now on the slate
              </p>
              <h3 className="font-display font-black italic tracking-[-0.04em] text-white text-[32px] sm:text-[40px] lg:text-[46px] leading-[0.88] drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                {title}
              </h3>
              <p className="mt-2 text-[12px] font-medium text-white/70 max-w-sm">
                Trailer-grade motion. Title type sits on the clip.
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    </section>
  );
}
