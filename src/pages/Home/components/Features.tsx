import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Image as ImageIcon,
  Scissors,
  BrainCircuit,
  ArrowRight,
  Film,
  Sparkles,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";

export default function Features() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);

  const handleLinkClick = (path: string) => {
    if (user) {
      navigate(path);
    } else {
      navigate("/login");
    }
  };

  const features = [
    {
      title: t("features.image_studio.title"),
      description: t("features.image_studio.description"),
      icon: ImageIcon,
      image:
        "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800&h=500",
      path: "/create/image",
      color: "from-blue-500/20 to-transparent",
    },
    {
      title: t("features.clip_trimmer.title"),
      description: t("features.clip_trimmer.description"),
      icon: Scissors,
      image:
        "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&q=80&w=800&h=500",
      path: "/create/clip",
      color: "from-teal-500/20 to-transparent",
    },
    {
      title: t("features.creator_coach.title"),
      description: t("features.creator_coach.description"),
      icon: BrainCircuit,
      image:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800&h=500",
      path: "/coach",
      badge: t("features.creator_coach.badge"),
      color: "from-amber-500/20 to-transparent",
    },
  ];

  const storySteps = [
    t("features.story_engine.step_upload"),
    t("features.story_engine.step_plan"),
    t("features.story_engine.step_produce"),
  ];

  return (
    <section id="features" className="ui-landing-section">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 rounded-full blur-[140px]" />
      </div>

      <div className="ui-container-landing">
        <div className="text-center mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="ui-landing-label"
          >
            <span>{t("features.label")}</span>
          </motion.div>
          <h2 className="ui-landing-title mx-auto max-w-4xl">
            {t("features.title_line1")} <br />
            <span className="brand-text-gradient">{t("features.title_line2")}</span>
          </h2>
          <p className="ui-landing-description mx-auto">
            {t("features.description")}
          </p>
        </div>

        {/* AI Story Engine — featured depiction under intro */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 md:mb-24"
        >
          <button
            type="button"
            onClick={() => handleLinkClick("/create/story-engine")}
            className="group w-full text-left rounded-2xl border border-border/70 bg-card/50 backdrop-blur-xl overflow-hidden transition-colors hover:border-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="relative p-8 md:p-10 flex flex-col justify-center min-h-[280px]">
                <div className="inline-flex items-center gap-2 w-fit mb-5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 text-[10px] font-bold border border-orange-500/25 tracking-wide uppercase">
                  <Sparkles size={12} />
                  {t("features.story_engine.badge")}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-600/30">
                    <Film size={22} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-black text-foreground tracking-tight leading-none group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {t("features.story_engine.title")}
                  </h3>
                </div>
                <p className="text-sm md:text-base font-medium text-muted-foreground leading-relaxed max-w-md mb-8">
                  {t("features.story_engine.description")}
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {storySteps.map((step, i) => (
                    <span
                      key={step}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-[11px] font-bold text-foreground"
                    >
                      <span className="text-orange-600 dark:text-orange-400 tabular-nums">
                        0{i + 1}
                      </span>
                      {step}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[12px] font-black text-orange-700 dark:text-orange-300 transition-all group-hover:gap-4">
                  <span>{t("features.story_engine.cta")}</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Visual story-plan mock */}
              <div className="relative border-t lg:border-t-0 lg:border-s border-border/60 bg-muted/30 p-6 md:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.12),transparent_55%)] pointer-events-none" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("features.story_engine.plan_label")}
                    </p>
                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">
                      9:16 · Short
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-2">
                    <p className="text-[11px] font-bold text-foreground">
                      {t("features.story_engine.mock_summary_title")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("features.story_engine.mock_summary")}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/60 bg-background/70 overflow-hidden"
                      >
                        <div
                          className={`aspect-[9/14] ${
                            i === 0
                              ? "bg-orange-500/25"
                              : i === 1
                                ? "bg-teal-500/20"
                                : "bg-amber-500/20"
                          }`}
                        />
                        <div className="px-2 py-1.5 text-[9px] font-bold text-muted-foreground truncate">
                          {t(`features.story_engine.mock_clip_${i + 1}`)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      t("features.story_engine.mock_act_hook"),
                      t("features.story_engine.mock_act_peak"),
                      t("features.story_engine.mock_act_cta"),
                    ].map((act, i) => (
                      <div
                        key={act}
                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                      >
                        <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 w-10 shrink-0">
                          ACT {i + 1}
                        </span>
                        <span className="text-[11px] font-medium text-foreground truncate">
                          {act}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </button>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleLinkClick(feature.path)}
              className="ui-glass-card group flex flex-col h-full rounded-xl overflow-hidden cursor-pointer"
            >
              <div className="ui-feature-card-image-wrap bg-muted">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover transition-transform duration-1000 will-change-transform scale-[1.02] group-hover:scale-[1.08] opacity-80 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${feature.color} opacity-60 group-hover:opacity-40 transition-opacity`}
                />
                <div className="ui-feature-card-icon-capsule">
                  <feature.icon size={22} />
                </div>
              </div>

              <div className="flex flex-col flex-grow p-6 pt-0">
                {feature.badge && (
                  <div className="inline-flex mb-4 w-fit px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                    {feature.badge}
                  </div>
                )}
                <h3 className="text-xl font-display font-black text-foreground mb-3 group-hover:text-primary transition-colors tracking-tight leading-none">
                  {feature.title}
                </h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                <div className="mt-auto pt-8 flex items-center gap-2 text-[12px] font-black text-primary transition-all group-hover:gap-4">
                  <span>{t("features.elite_tooling")}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
