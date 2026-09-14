import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Download,
  RefreshCw,
  Plus,
  Check,
  Link2,
  Loader2,
  Copy,
  Clapperboard,
} from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import { AuthenticatedImage } from "../../../components/AuthenticatedImage";
import {
  MediaTileSelectCheckbox,
  mediaTileSelectionRing,
} from "../../../components/MediaTileSelectCheckbox";
import { CanvasPanelProps } from "../types";
import { getStatusBadge, getTypeBadge } from "./RecentGenerations/statusStyles";
import { StatusPill } from "./RecentGenerations/StatusPill";
import { MemeTemplatePreview } from "./MemeTemplatePreview";
import { MemeWeekPlanCanvas } from "./MemeWeekPlanCanvas";
import nxclipLogo from "../../../contents/images/nexa-logo.png";

export function CanvasPanel({
  resultImage,
  isGenerating,
  error,
  handleGenerate,
  handleRetry,
  canRetry,
  handleDownload,
  variations,
  setResultImage,
  brightness,
  setBrightness: _setBrightness,
  contrast,
  setContrast: _setContrast,
  saturation,
  setSaturation: _setSaturation,
  aspectRatio,
  onPublishClick,
  onAnimateAsClipClick,
  isAnimatingAsClip,
  isPublishing,
  isPublished,
  watermarked: _watermarked,
  contentStatus,
  mode = "image",
  memeMode,
  memeTemplate,
  slotTexts = {},
  prompt,
  basePrompt,
  refinePrompt,
  willCreateNewImage = true,
  onStartFreshDraft,
  previewReady = false,
  onPreviewReady,
  libraryPickerOpen = false,
  onLibraryPickerOpenChange,
  libraryImages = [],
  referenceContentIds = [],
  toggleReferenceContent,
  maxReferences = 2,
  orderedReferenceChips = [],
  captionSuggestions = [],
  selectedCaption,
  generatedHashtags = [],
  selectedHashtags = [],
  onSelectCaption,
  onSelectHashtagSet,
  weekPlanCanvasOpen = false,
  weekPlanDays = [],
  weekPlanSelectedIndex = 0,
  onWeekPlanSelectDay,
  activeWeekPlan = null,
  isActivatingWeekPlan = false,
  isCancellingWeekPlan = false,
  canActivateWeekPlan = false,
  onActivateWeekPlan,
  onCancelWeekPlan,
  onUseWeekPlanDay,
  onCloseWeekPlanCanvas,
  memeTemplates = [],
}: CanvasPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const statusBadge = getStatusBadge(contentStatus || (isPublished ? "published" : "draft"));
  const typeBadge = getTypeBadge({
    type: mode === "meme" ? "meme" : "image",
    style: mode === "meme" ? "meme" : undefined,
  });
  const libraryCandidates = libraryImages.filter((h) => h.id && h.url);
  // Image + AI/hybrid meme can pick references in the canvas preview.
  const showLibraryBrowser =
    libraryPickerOpen &&
    !isGenerating &&
    (mode === "image" || (mode === "meme" && memeMode !== "template"));

  const normalizedCaptions = (() => {
    const fromSuggestions = (captionSuggestions || []).map((c) => String(c || "").trim()).filter(Boolean);
    if (fromSuggestions.length > 0) return fromSuggestions;
    const selected = String(selectedCaption || "").trim();
    return selected ? [selected] : [];
  })();

  const normalizedHashtagSets = (() => {
    const raw = generatedHashtags || [];
    if (!Array.isArray(raw) || raw.length === 0) {
      const selected = (selectedHashtags || [])
        .map((tag) => String(tag || "").replace(/^#/, "").trim())
        .filter(Boolean);
      return selected.length > 0 ? [selected] : [];
    }
    if (typeof raw[0] === "string") {
      const flat = (raw as unknown as string[])
        .map((tag) => String(tag || "").replace(/^#/, "").trim())
        .filter(Boolean);
      return flat.length > 0 ? [flat] : [];
    }
    return (raw as string[][])
      .map((set) =>
        (Array.isArray(set) ? set : [set])
          .map((tag) => String(tag || "").replace(/^#/, "").trim())
          .filter(Boolean),
      )
      .filter((set) => set.length > 0);
  })();

  const hasCaptionOrHashtagPreview =
    normalizedCaptions.length > 0 || normalizedHashtagSets.length > 0;

  const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
      case "16:9":
        return "aspect-video";
      case "9:16":
        return "aspect-[9/16]";
      case "4:5":
        return "aspect-[4/5]";
      default:
        return "aspect-square";
    }
  };

  /** Widths chosen so every ratio renders at a similar readable height. */
  const getFrameWidthClass = (ratio: string) => {
    switch (ratio) {
      case "16:9":
        return "w-full max-w-[36rem]";
      case "9:16":
        return "w-[46%] max-w-[13rem]";
      case "4:5":
        return "w-[52%] max-w-[14.5rem]";
      default:
        return "w-[60%] max-w-[16.8rem]";
    }
  };

  const getStageWidthClass = (ratio: string) =>
    ratio === "16:9" ? "max-w-3xl" : "max-w-lg";

  const showTemplatePreview =
    mode === "meme" &&
    (memeMode === "template" || memeMode === "hybrid") &&
    !!memeTemplate &&
    !showLibraryBrowser;

  // Backend composes template/hybrid memes only in supported ratios, so the
  // preview frame must match the effective ratio, not the raw picker value.
  const effectiveAspectRatio =
    showTemplatePreview &&
    memeTemplate &&
    !memeTemplate.supportedAspectRatios.includes(
      aspectRatio as (typeof memeTemplate.supportedAspectRatios)[number],
    )
      ? memeTemplate.defaultAspectRatio
      : aspectRatio;

  return (
    <div className="flex-1 flex flex-col gap-4 h-full min-h-0">
      <Card className="flex-1 flex flex-col relative overflow-hidden glass border-border group min-h-[400px] h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute inset-0 dots-pattern opacity-[0.15] pointer-events-none" />

        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto flex p-3 md:p-4",
            showLibraryBrowser
              ? "items-stretch justify-stretch"
              : resultImage && previewReady && !isGenerating
                ? "items-start justify-center"
                : "items-center justify-center",
          )}
        >
          <AnimatePresence mode="wait">
            {weekPlanCanvasOpen && weekPlanDays.length > 0 ? (
              <motion.div
                key="week-plan"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0"
              >
                <MemeWeekPlanCanvas
                  templates={memeTemplates}
                  days={weekPlanDays}
                  selectedIndex={weekPlanSelectedIndex}
                  onSelectDay={(index) => onWeekPlanSelectDay?.(index)}
                  aspectRatio={effectiveAspectRatio}
                  activePlan={activeWeekPlan}
                  isActivating={isActivatingWeekPlan}
                  isCancelling={isCancellingWeekPlan}
                  canActivate={canActivateWeekPlan}
                  onActivate={() => onActivateWeekPlan?.()}
                  onCancel={() => onCancelWeekPlan?.()}
                  onUseDay={() => onUseWeekPlanDay?.()}
                  onClose={() => onCloseWeekPlanCanvas?.()}
                />
              </motion.div>
            ) : showLibraryBrowser ? (
              <motion.div
                key="library-picker"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full h-full min-h-0 flex flex-col gap-3 px-1"
              >
                <div className="flex items-start justify-between gap-3 shrink-0">
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-base font-display font-bold text-foreground">
                      Pick references
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tap to select · {referenceContentIds.length}/{maxReferences} selected
                      {orderedReferenceChips.length > 0
                        ? ` · ${orderedReferenceChips.map((c) => c.label).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => onLibraryPickerOpenChange?.(false)}
                  >
                    Done
                  </Button>
                </div>

                {libraryCandidates.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground max-w-sm">
                      No library images yet. Generate or upload first, then pick them as references here.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pb-2">
                      {libraryCandidates.map((item) => {
                        const id = item.id!;
                        const selected = referenceContentIds.includes(id);
                        const orderIndex = orderedReferenceChips.findIndex(
                          (c) => c.source === "library" && c.removeId === id,
                        );
                        const atCap = !selected && referenceContentIds.length >= maxReferences;
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={atCap}
                            onClick={() => toggleReferenceContent?.(id)}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border transition-all text-left",
                              mediaTileSelectionRing(selected),
                              !selected && atCap
                                ? "border-border/40 opacity-40 cursor-not-allowed"
                                : !selected
                                  ? "border-border/50 hover:border-white/25"
                                  : "",
                            )}
                            title={item.title || item.prompt || "Library image"}
                          >
                            <AuthenticatedImage
                              src={item.url}
                              alt={item.title || "ref"}
                              className="absolute inset-0 h-full w-full object-cover"
                              wrapperClassName="!absolute !inset-0 !h-full !w-full"
                              disableRemoteFallback
                            />
                            {selected ? (
                              <>
                                <MediaTileSelectCheckbox
                                  checked
                                  visible
                                  badge={
                                    orderIndex >= 0
                                      ? orderedReferenceChips[orderIndex].label.replace(/\D/g, "") ||
                                        orderIndex + 1
                                      : undefined
                                  }
                                  className="absolute top-2 left-2 z-10 pointer-events-none"
                                  ariaLabel={
                                    orderIndex >= 0
                                      ? orderedReferenceChips[orderIndex].label
                                      : "Selected reference"
                                  }
                                />
                                {orderIndex >= 0 ? (
                                  <span className="absolute bottom-1.5 left-1.5 right-1.5 z-10 truncate rounded-md bg-black/50 px-1.5 py-0.5 text-center text-[9px] font-bold text-white/90 backdrop-blur-sm border border-white/10 pointer-events-none">
                                    {orderedReferenceChips[orderIndex].label}
                                  </span>
                                ) : null}
                              </>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : !resultImage && !isGenerating && !error && showTemplatePreview ? (
              <motion.div
                key="template-preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  "w-full flex flex-col gap-3 pb-2 my-auto",
                  getStageWidthClass(effectiveAspectRatio),
                )}
              >
                <div
                  className={cn("relative mx-auto", getFrameWidthClass(effectiveAspectRatio))}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-[20px] border border-dashed border-primary/40 bg-zinc-950/40",
                      getAspectRatioClass(effectiveAspectRatio),
                    )}
                  >
                    <MemeTemplatePreview
                      template={memeTemplate!}
                      slotTexts={slotTexts}
                      aspectRatio={effectiveAspectRatio}
                      withBaseImage={memeMode === "hybrid"}
                      className="absolute inset-0 h-full w-full"
                    />
                    <div className={cn("absolute bottom-3 z-20", isRTL ? "right-3" : "left-3")}>
                      <span className="text-[10px] font-semibold tracking-wider text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                        {effectiveAspectRatio}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {memeTemplate!.name} — dimmed text is placeholder copy showing where your
                  {memeMode === "hybrid" ? " text lands over the AI image." : " text will land."}
                </p>
              </motion.div>
            ) : !resultImage && !isGenerating && !error ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "w-full flex flex-col gap-4 pb-2 my-auto items-center",
                  getStageWidthClass(aspectRatio),
                )}
              >
                <div
                  className={cn(
                    "relative mx-auto overflow-hidden rounded-[20px] border border-dashed border-border/60 bg-foreground/[0.03]",
                    getFrameWidthClass(aspectRatio),
                    getAspectRatioClass(aspectRatio),
                  )}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
                    <div className="relative">
                      <img
                        src={nxclipLogo}
                        alt=""
                        aria-hidden
                        className="h-11 w-11 md:h-14 md:w-14 rounded-xl opacity-50 shadow-lg"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute -top-2 -right-2"
                      >
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary fill-primary/20" />
                      </motion.div>
                    </div>
                    <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md bg-black/40 text-white/90 border border-white/10">
                      {mode === "meme" ? `Meme · ${aspectRatio}` : aspectRatio}
                    </span>
                  </div>
                </div>

                <div className="text-center max-w-md px-2">
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">
                    {t("image_studio.canvas.ready_to_create")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mode === "meme"
                      ? "Choose a meme mode, add your prompt or template text, and generate a draft preview here."
                      : "Choose your setup, optionally attach reference images, and generate a draft preview here."}
                  </p>
                </div>
              </motion.div>
            ) : error && !isGenerating && !resultImage ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center max-w-md p-8 rounded-lg bg-destructive/10 border border-destructive/20 my-auto"
              >
                <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center text-destructive mx-auto mb-4">
                  <X size={32} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t("image_studio.canvas.failed")}</h3>
                <p className="text-sm text-destructive/80 mb-6">{error}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {canRetry && handleRetry ? (
                    <Button variant="brand-gradient" onClick={handleRetry}>
                      Retry generation
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {t("image_studio.canvas.try_again")}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stage"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "w-full flex flex-col gap-3 pb-2",
                  getStageWidthClass(aspectRatio),
                )}
              >
                <div
                  className={cn(
                    "relative mx-auto group/img",
                    getFrameWidthClass(aspectRatio),
                  )}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-[20px] border border-border/50 bg-zinc-950/40 shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
                      getAspectRatioClass(aspectRatio),
                    )}
                  >
                    {resultImage ? (
                      <AuthenticatedImage
                        key={resultImage}
                        src={resultImage}
                        alt="Generated"
                        priority
                        disableRemoteFallback
                        onLoad={() => onPreviewReady?.()}
                        onError={() => onPreviewReady?.()}
                        style={{
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                        }}
                        className={cn(
                          "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
                          previewReady && !isGenerating ? "opacity-100" : "opacity-0",
                        )}
                        wrapperClassName="!absolute !inset-0 !h-full !w-full !bg-transparent"
                        placeholderAspectRatio={
                          aspectRatio === "16:9"
                            ? "16 / 9"
                            : aspectRatio === "9:16"
                              ? "9 / 16"
                              : "1 / 1"
                        }
                      />
                    ) : null}

                    {(isGenerating || !previewReady || !resultImage) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900/90 via-zinc-900/80 to-zinc-950/95">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <motion.div
                            className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-primary/25 to-transparent"
                            animate={{ top: ["-30%", "100%"] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                        <div className="relative">
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-primary/70 border-t-transparent animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center space-y-1 px-4 relative z-10">
                          <h4 className="text-sm md:text-base font-display font-bold text-foreground">
                            {isGenerating ? t("image_studio.canvas.generating") : "Finishing preview…"}
                          </h4>
                          <p className="text-[11px] text-muted-foreground animate-pulse">
                            {isGenerating
                              ? t("image_studio.canvas.crafting")
                              : "Image is ready — loading into the frame"}
                          </p>
                        </div>
                      </div>
                    )}

                    {previewReady && !isGenerating && statusBadge ? (
                      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
                        <StatusPill badge={typeBadge} />
                        <StatusPill badge={statusBadge} />
                      </div>
                    ) : null}

                    <div className={cn("absolute bottom-3 z-20", isRTL ? "right-3" : "left-3")}>
                      <span className="inline-flex items-center text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md bg-black/55 text-white/95 border border-white/15 backdrop-blur-md shadow-sm">
                        {mode === "meme" ? `Meme · ${aspectRatio}` : aspectRatio}
                      </span>
                    </div>

                    {previewReady && !isGenerating && resultImage ? (
                      <div
                        className={cn(
                          "absolute bottom-3 z-20 flex items-center gap-1.5 transition-opacity duration-200",
                          "opacity-0 pointer-events-none group-hover/img:opacity-100 group-hover/img:pointer-events-auto",
                          "focus-within:opacity-100 focus-within:pointer-events-auto",
                          isRTL ? "left-3" : "right-3",
                        )}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Animate in Clip Studio"
                              disabled={isAnimatingAsClip || isPublishing}
                              onClick={onAnimateAsClipClick}
                              className="h-8 w-8 rounded-full backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition-all duration-200 bg-black/55 hover:bg-black/75 hover:scale-105 disabled:opacity-60"
                            >
                              {isAnimatingAsClip ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Clapperboard className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Animate in Clip Studio</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={isPublished ? "Published" : "Publish to Feed"}
                              disabled={isPublishing || isPublished}
                              onClick={onPublishClick}
                              className={cn(
                                "h-8 w-8 rounded-full backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition-all duration-200",
                                isPublished
                                  ? "bg-emerald-500/80 cursor-default"
                                  : "bg-black/55 hover:bg-black/75 hover:scale-105 disabled:opacity-60",
                              )}
                            >
                              {isPublishing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isPublished ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {isPublished ? "Published" : isPublishing ? "Publishing…" : "Publish to Feed"}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Download"
                              onClick={() => handleDownload(resultImage)}
                              className="h-8 w-8 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center border border-white/10 hover:bg-black/75 hover:scale-105 transition-all duration-200"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{t("image_studio.history.download")}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Copy image URL"
                              onClick={() => {
                                navigator.clipboard.writeText(resultImage);
                                toast.success("Image URL copied to clipboard!");
                              }}
                              className="h-8 w-8 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center border border-white/10 hover:bg-black/75 hover:scale-105 transition-all duration-200"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Copy Image URL</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>
                </div>

                {previewReady && !isGenerating ? (
                  <div className="w-full space-y-3 shrink-0">
                    {(basePrompt?.trim() ||
                      refinePrompt?.trim() ||
                      prompt?.trim() ||
                      hasCaptionOrHashtagPreview) && (
                      <div className="flex items-baseline justify-between gap-2 px-0.5">
                        <p className="text-xs font-semibold text-foreground">AI suggestions</p>
                        {hasCaptionOrHashtagPreview ? (
                          <p className="text-[11px] text-muted-foreground">
                            Click a caption or hashtag set to select
                          </p>
                        ) : null}
                      </div>
                    )}

                    {/* Prompt */}
                    {basePrompt?.trim() || refinePrompt?.trim() || prompt?.trim() ? (
                      <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                            Prompt
                          </p>
                          <button
                            type="button"
                            aria-label="Copy all prompts"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                            onClick={() => {
                              const parts = [
                                basePrompt?.trim() ? `Base prompt:\n${basePrompt.trim()}` : "",
                                refinePrompt?.trim() ? `Last refine:\n${refinePrompt.trim()}` : "",
                                !basePrompt?.trim() && !refinePrompt?.trim() && prompt?.trim()
                                  ? prompt.trim()
                                  : "",
                              ].filter(Boolean);
                              void navigator.clipboard.writeText(parts.join("\n\n"));
                              toast.success("Prompt copied");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="px-3 py-2.5 space-y-3">
                          {basePrompt?.trim() ? (
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  Base prompt
                                </p>
                                <button
                                  type="button"
                                  aria-label="Copy base prompt"
                                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(basePrompt.trim());
                                    toast.success("Base prompt copied");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                                {basePrompt.trim()}
                              </p>
                            </div>
                          ) : null}
                          {refinePrompt?.trim() ? (
                            <div className={cn(basePrompt?.trim() && "pt-3 border-t border-border/40")}>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  Last refine
                                </p>
                                <button
                                  type="button"
                                  aria-label="Copy refine prompt"
                                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(refinePrompt.trim());
                                    toast.success("Refine prompt copied");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                                {refinePrompt.trim()}
                              </p>
                            </div>
                          ) : !basePrompt?.trim() && prompt?.trim() ? (
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  Prompt
                                </p>
                                <button
                                  type="button"
                                  aria-label="Copy prompt"
                                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(prompt.trim());
                                    toast.success("Prompt copied");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                                {prompt.trim()}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </section>
                    ) : null}

                    {/* Captions */}
                    {normalizedCaptions.length > 0 ? (
                      <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                            Captions
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {normalizedCaptions.length}
                            </span>
                            <button
                              type="button"
                              aria-label="Copy all captions"
                              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                              onClick={() => {
                                void navigator.clipboard.writeText(normalizedCaptions.join("\n\n"));
                                toast.success("Captions copied");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="px-3 py-2.5 space-y-2">
                          {normalizedCaptions.map((cap, idx) => {
                            const active = selectedCaption === cap;
                            return (
                              <div
                                key={`${cap}-${idx}`}
                                className={cn(
                                  "rounded-lg border transition-colors",
                                  active
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border/50 bg-muted/20 text-foreground/90",
                                )}
                              >
                                <div className="flex items-start gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onSelectCaption?.(cap)}
                                    className="flex-1 text-left px-3 py-2.5 text-sm leading-relaxed"
                                  >
                                    {cap}
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Copy caption"
                                    className="mt-1.5 mr-1.5 h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void navigator.clipboard.writeText(cap);
                                      toast.success("Caption copied");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}

                    {/* Hashtags */}
                    {normalizedHashtagSets.length > 0 ? (
                      <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                            Hashtags
                          </p>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {normalizedHashtagSets.length}{" "}
                            {normalizedHashtagSets.length === 1 ? "set" : "sets"}
                          </span>
                        </div>
                        <div className="px-3 py-2.5 space-y-2">
                          {normalizedHashtagSets.map((tags, idx) => {
                            const active =
                              selectedHashtags.length === tags.length &&
                              tags.every((tag) => selectedHashtags.includes(tag));
                            const tagsText = tags.map((t) => `#${t}`).join(" ");
                            return (
                              <div
                                key={`htags-${idx}`}
                                className={cn(
                                  "rounded-xl border transition-colors",
                                  active
                                    ? "border-primary bg-primary/10"
                                    : "border-border/50 bg-muted/15",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectHashtagSet?.(tags)}
                                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                  >
                                    Set {idx + 1}
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Copy hashtag set ${idx + 1}`}
                                    className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                                    onClick={() => {
                                      void navigator.clipboard.writeText(tagsText);
                                      toast.success("Hashtags copied");
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onSelectHashtagSet?.(tags)}
                                  className="w-full text-left px-3 pb-2.5 pt-1.5"
                                >
                                  <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className={cn(
                                          "inline-flex items-center rounded-md px-2.5 py-1 text-sm leading-snug font-medium",
                                          active
                                            ? "bg-primary/15 text-foreground"
                                            : "bg-muted/60 text-foreground/90",
                                        )}
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}

                    {!hasCaptionOrHashtagPreview ? (
                      <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground">
                          Captions and hashtags will appear here after generation.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {previewReady && !isGenerating && variations.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {variations.map((v, i) => (
                      <button
                        key={`${v}-${i}`}
                        type="button"
                        onClick={() => {
                          setResultImage(v);
                          onPreviewReady?.();
                        }}
                        className={cn(
                          "w-16 h-16 rounded-lg overflow-hidden border shrink-0",
                          mediaTileSelectionRing(resultImage === v),
                          resultImage === v ? "" : "border-border/50",
                        )}
                      >
                        <AuthenticatedImage
                          src={v}
                          alt={`Variation ${i + 1}`}
                          className="w-full h-full object-cover"
                          disableRemoteFallback
                        />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {resultImage && previewReady && !isGenerating && (
          <div className="p-4 border-t border-border/50 bg-background/95 backdrop-blur-md shrink-0 flex flex-wrap justify-center items-center gap-3 relative z-30 shadow-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9 text-xs font-bold" onClick={handleGenerate}>
                  <RefreshCw className="h-4 w-4" />
                  {willCreateNewImage ? "Generate" : "Refine draft"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                {willCreateNewImage
                  ? "Creates a new draft from the current prompt and options."
                  : "Updates this draft in place using the current preview as the base. Same action as the left panel button."}
              </TooltipContent>
            </Tooltip>
            {!willCreateNewImage && onStartFreshDraft ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-bold text-muted-foreground"
                onClick={onStartFreshDraft}
              >
                Create as new
              </Button>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
