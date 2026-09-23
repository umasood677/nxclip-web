import { useState, useEffect } from "react";
import { usePWA } from "../contexts/PwaContext";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share, Sparkles, X, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import { safeLocalStorage } from "../lib/safeStorage";
import { PWA_INSTALL } from "../lib/pwaCopy";

interface PwaInstallPromptProps {
  variant?: "banner" | "card" | "compact";
  className?: string;
  onDismiss?: () => void;
  /** Keep the card visible for iOS / browsers without beforeinstallprompt */
  allowManual?: boolean;
}

export function PwaInstallPrompt({
  variant = "card",
  className,
  onDismiss,
  allowManual = false,
}: PwaInstallPromptProps) {
  const { isInstallable, isInstalled, isIos, showPrompt } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasDismissed = safeLocalStorage.getItem("nx_inline_pwa_dismissed") === "true";
    if (hasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    try {
      const outcome = await showPrompt();
      if (outcome === "accepted") {
        console.log("[PWA User Action] User opted to install");
      }
    } catch (err) {
      console.error("[PWA Install Error]", err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    safeLocalStorage.setItem("nx_inline_pwa_dismissed", "true");
    if (onDismiss) onDismiss();
  };

  const canShow = !isInstalled && !dismissed && (isInstallable || (allowManual && isIos));
  if (!canShow) {
    return null;
  }

  const ctaLabel = isIos && !isInstallable ? "Add to Home Screen" : PWA_INSTALL.cta;
  const CtaIcon = isIos && !isInstallable ? Share : Download;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        {variant === "compact" ? (
          <div className="flex items-center justify-between gap-3 bg-card/80 border border-border p-3 rounded-xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 text-primary">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 leading-none">
                  {PWA_INSTALL.title}
                  <Sparkles className="h-3 w-3 text-amber-400" />
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Full-screen canvas, no browser bars
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss prompt"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="brand-premium"
                onClick={() => void handleInstall()}
                disabled={!isInstallable}
                className="h-8 text-[11px] font-bold rounded-lg px-3 flex items-center gap-1"
              >
                {ctaLabel}
                <CtaIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : variant === "banner" ? (
          <div className="bg-card border border-primary/15 p-4 rounded-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-teal-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
              <div className="flex items-start gap-3.5">
                <div className="bg-background/90 border border-border p-2.5 rounded-lg shrink-0 shadow-lg text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-teal-600 dark:text-teal-400 uppercase bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/15">
                      {PWA_INSTALL.badge}
                    </span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1.5">{PWA_INSTALL.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">{PWA_INSTALL.body}</p>
                  {isIos && !isInstallable && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Safari → Share → Add to Home Screen
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs h-9 rounded-xl font-medium"
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="brand-premium"
                  onClick={() => void handleInstall()}
                  disabled={!isInstallable}
                  className="text-xs h-9 px-4 font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <CtaIcon className="h-3.5 w-3.5" />
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border p-5 rounded-2xl shadow-3xl text-foreground relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 bg-teal-500/10 p-1.5 px-2.5 rounded-lg border border-teal-500/20 text-teal-600 dark:text-teal-400">
                <Smartphone className="h-4 w-4" />
                <span className="text-[9px] font-bold tracking-widest uppercase">{PWA_INSTALL.badge}</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground bg-muted border border-border hover:border-foreground/20 p-1.5 rounded-lg transition-all"
                aria-label="Close widget"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4">
              <h4 className="text-base font-bold font-display tracking-tight text-foreground flex items-center gap-1.5">
                {PWA_INSTALL.title}
                <Sparkles className="h-4 w-4 text-amber-400" />
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">{PWA_INSTALL.body}</p>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1 text-xs h-9 font-medium rounded-xl"
              >
                {PWA_INSTALL.later}
              </Button>
              <Button
                onClick={() => void handleInstall()}
                variant="brand-premium"
                disabled={!isInstallable}
                className="flex-1 text-xs h-9 font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                <CtaIcon className="h-3.5 w-3.5" />
                {ctaLabel}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
