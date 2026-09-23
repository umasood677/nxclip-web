import { useMemo } from "react";
import { motion } from "motion/react";
import { Download, Share, Smartphone, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { usePWA } from "../../../contexts/PwaContext";
import { PWA_INSTALL, PWA_SURFACES } from "../../../lib/pwaCopy";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";

export default function InteractiveAppV2() {
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const { isInstallable, isInstalled, isIos, showPrompt } = usePWA();

  const helper = useMemo(() => {
    if (isInstalled) return "Already installed. Launch it from your home screen or dock.";
    if (isIos) return "On iPhone or iPad: tap Share, then Add to Home Screen.";
    if (isInstallable) return "Install now to pin Creator OS beside your other apps.";
    return "In Chrome or Edge, use the install icon in the address bar — or wait for the install prompt.";
  }, [isInstalled, isIos, isInstallable]);

  const handleInstall = async () => {
    if (isInstalled) {
      navigate(user ? "/create" : "/signup");
      return;
    }
    if (isInstallable) {
      await showPrompt();
      return;
    }
    if (isIos) return;
    navigate(user ? "/create" : "/signup");
  };

  return (
    <section id="interactive-app" className="relative py-12 md:py-16 overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute top-0 start-1/2 -translate-x-1/2 w-[70%] h-[48%] bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.08),transparent_70%)]" />
      </div>

      <div className="ui-container-landing">
        <div className="max-w-5xl mx-auto rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-soft-lg">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.28em] uppercase text-teal-600 dark:text-teal-400 mb-4"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {PWA_INSTALL.badge}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl md:text-4xl font-black tracking-tight text-foreground mb-4"
              >
                {PWA_INSTALL.title}
                <Sparkles className="inline-block ms-2 h-5 w-5 text-amber-400 align-text-top" />
              </motion.h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {PWA_INSTALL.body}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-3">{helper}</p>

              <div className="flex flex-wrap gap-2 mt-5">
                {PWA_SURFACES.map((surface) => (
                  <button
                    key={surface.href}
                    type="button"
                    onClick={() => navigate(user ? surface.href : "/signup")}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-border bg-background/60 text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {surface.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-3 w-full sm:w-auto sm:min-w-[220px]">
              <Button
                variant="brand-premium"
                size="lg"
                className="h-12 px-6 font-bold w-full"
                onClick={() => void handleInstall()}
              >
                {isInstalled ? (
                  <>Open Creator OS</>
                ) : isIos && !isInstallable ? (
                  <>
                    <Share className="h-4 w-4" />
                    Add to Home Screen
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {PWA_INSTALL.ctaLong}
                  </>
                )}
              </Button>
              {isIos && !isInstalled && (
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Safari → Share → Add to Home Screen
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
