import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getGamingFeatureMedia, type MarketingMedia } from "../../../lib/marketingMedia";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { MarketingMediaFrame } from "./MarketingMediaFrame";
import { MarketingMediaReel } from "./MarketingMediaReel";

type TitleCard = { title: string; line: string; media: MarketingMedia | null };

const GAME_WASH: Record<string, string> = {
  "Rocket League": "from-orange-600/55 via-sky-500/25 to-transparent",
  Roblox: "from-red-600/50 via-rose-400/20 to-transparent",
  "Street Fighter": "from-red-700/55 via-amber-500/20 to-transparent",
  Fortnite: "from-violet-600/50 via-sky-400/25 to-transparent",
  "League of Legends": "from-amber-600/50 via-indigo-800/30 to-transparent",
  Valorant: "from-rose-600/55 via-red-950/30 to-transparent",
};

export default function GamingFeatureV2() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [stage, setStage] = useState<MarketingMedia[]>([]);
  const [titles, setTitles] = useState<TitleCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getGamingFeatureMedia().then((m) => {
      if (cancelled) return;
      setStage(m.stage);
      setTitles(m.titles);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = () => navigate(user ? "/create" : "/signup");

  return (
    <section id="gaming" className="relative scroll-mt-24 pt-4 md:pt-6 pb-8 md:pb-12 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 start-0 w-[55%] h-[50%] bg-teal-500/8 rounded-full blur-[120px]" />
      </div>

      <div className="ui-container-landing">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
          <div className="max-w-2xl">
            <p className="ui-landing-label !mb-3 inline-flex items-center gap-2">
              <Gamepad2 size={12} />
              Gaming first
            </p>
            <h2 className="ui-landing-title !mb-3">
              Built for the games <br />
              <span className="brand-text-gradient">creators ship this week.</span>
            </h2>
            <p className="ui-landing-description !mb-0 max-w-xl">
              Rocket League, Roblox, Street Fighter, Fortnite, League of Legends — clips,
              thumbs, and memes with the same grade as beauty and viral.
            </p>
          </div>
          <Button variant="brand-premium" className="h-11 px-5 font-bold shrink-0" onClick={go}>
            Create gaming content
            <ArrowRight size={16} className="ms-1.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
          <motion.button
            type="button"
            onClick={go}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card text-start h-[240px] sm:h-[280px] lg:h-auto min-h-[280px]"
          >
            <MarketingMediaReel
              items={stage}
              intervalMs={2800}
              cut="mix"
              camera="trailer"
              showNiche={false}
            />
            <div className="absolute inset-0 z-[6] bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 p-5">
              <span className="inline-flex rounded-md bg-teal-500/25 border border-teal-300/30 px-2 py-0.5 text-[9px] font-bold tracking-wide text-teal-100">
                Live slate
              </span>
              <h3 className="mt-2 font-display text-2xl font-black text-white tracking-tight">
                Today’s competitive reel
              </h3>
              <p className="mt-1 text-[13px] font-medium text-white/75">
                Arena energy, neon grade, trailer cuts — not a keyboard close-up.
              </p>
            </div>
          </motion.button>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-3.5">
            {titles.map((card, i) => (
              <motion.button
                key={card.title}
                type="button"
                onClick={go}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card text-start aspect-[4/5] sm:aspect-auto sm:h-[168px] lg:h-[188px]"
              >
                <MarketingMediaFrame media={card.media} showCredit={false} imgClassName="home-kenburns" />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${GAME_WASH[card.title] || "from-black/70"} pointer-events-none`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="font-display text-[15px] font-bold text-white tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-white/70 leading-snug line-clamp-2">
                    {card.line}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
