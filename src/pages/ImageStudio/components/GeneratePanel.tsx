import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings2,
  Sparkles,
  Loader2,
  Maximize2,
  X,
  Zap,
  RefreshCw,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  ImagePlus,
  Library,
  Info,
  Copy,
} from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Separator } from "../../../components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import { GeneratePanelProps } from "../types";
import { ScrollableSuggestions } from "./ScrollableSuggestions";
import { AuthenticatedImage } from "../../../components/AuthenticatedImage";

const PROMPT_HELPERS = [
  "cinematic lighting",
  "studio portrait",
  "clean background",
  "editorial product shot",
  "bold headline",
  "viral social creative",
  "brand campaign",
  "founder portrait",
  "street photography",
  "minimal poster",
  "playful illustration",
  "pixel art",
  "cartoon style",
  "realistic render",
  "luxury packaging",
  "food photography",
  "dramatic shadows",
  "soft light",
  "professional thumbnail",
  "meme punchline",
];

export function GeneratePanel({
  mode,
  setMode,
  memeMode,
  setMemeMode,
  prompt,
  setPrompt,
  title,
  setTitle,
  isGeneratingTitle,
  handleGenerateTitle,
  style,
  setStyle,
  aspectRatio,
  setAspectRatio,
  isGenerating,
  handleGenerate,
  activeSuggestions,
  refreshSuggestions,
  STYLE_PRESETS,
  handleSuggestionClick,
  generationsLeft,
  dailyGenerationLimit = 10,
  setIsQuickEditOpen,
  topText,
  setTopText,
  bottomText,
  setBottomText,
  memeTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  slotTexts,
  setSlotText,
  lighting,
  setLighting,
  negativePrompt,
  setNegativePrompt,
  caption,
  setCaption,
  isGeneratingCaption: _isGeneratingCaption,
  handleGenerateCaption: _handleGenerateCaption,
  resultImage,
  captionSuggestions,
  history,
  libraryImages,
  handleReuseGeneration,
  setIsConfirmClearOpen,
  referenceContentIds,
  toggleReferenceContent,
  referenceUploads,
  orderedReferenceChips,
  onUploadReference,
  onRemoveReferenceUpload,
  onClearReferences,
  isUploadingReference,
  maxReferences,
  referencePlanHint,
  willCreateNewImage,
  onStartFreshDraft,
  onScrollToHistory,
  libraryPickerOpen = false,
  onLibraryPickerOpenChange,
  className,
}: GeneratePanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [activeWordIsHash, setActiveWordIsHash] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeTemplate =
    mode === "meme" && memeMode !== "ai"
      ? memeTemplates.find((tpl) => tpl.id === selectedTemplateId) || null
      : null;
  // Composer clamps unsupported ratios to the template default, so don't offer them.
  const supportedRatios = activeTemplate?.supportedAspectRatios || null;

  const selectedTemplate = memeTemplates.find((t) => t.id === selectedTemplateId) || null;
  // Only template/hybrid memes are constrained by the template's supported ratios;
  // AI meme + plain image can use any aspect ratio.
  const aspectRatioConstraint =
    mode === "meme" && memeMode !== "ai" && selectedTemplate
      ? selectedTemplate.supportedAspectRatios
      : null;

  const needsPrompt = mode !== "meme" || memeMode !== "template";
  const promptOk = !needsPrompt || (!!prompt.trim() && prompt.length <= 500);
  const templateOk =
    mode !== "meme" ||
    memeMode === "ai" ||
    (!!selectedTemplateId &&
      (memeTemplates.find((t) => t.id === selectedTemplateId)?.slots || []).every((s) =>
        (slotTexts[s.id] || "").trim(),
      ));
  const canGenerate =
    !isGenerating && promptOk && templateOk && generationsLeft !== 0 && !isUploadingReference;
  const selectedRefCount = referenceContentIds.length + referenceUploads.length;
  const libraryCandidateCount = libraryImages.filter((h) => h.id && h.url).length;
  const recentPromptItems = history
    .filter((item) => (item.prompt || "").trim().length >= 3)
    // Keep only the latest prompt — full history already lives in Recent Generations.
    .slice(0, 1);

  React.useEffect(() => {
    const lastWhitespaceIdx = Math.max(prompt.lastIndexOf(" "), prompt.lastIndexOf("\n"));
    const lastWord = lastWhitespaceIdx === -1 ? prompt : prompt.slice(lastWhitespaceIdx + 1);

    if (!lastWord) {
      setTagSuggestions([]);
      return;
    }

    const isHash = lastWord.startsWith("#");
    const searchWord = (isHash ? lastWord.slice(1) : lastWord).toLowerCase();

    if (searchWord.length >= 1) {
      const filtered = PROMPT_HELPERS.filter(
        (kw) => kw.toLowerCase().startsWith(searchWord) && kw.toLowerCase() !== searchWord,
      );
      setTagSuggestions(filtered.slice(0, 5));
      setActiveWordIsHash(isHash);
    } else {
      setTagSuggestions([]);
    }
  }, [prompt]);

  const handleTagSuggestSelect = (tag: string) => {
    const lastWhitespaceIdx = Math.max(prompt.lastIndexOf(" "), prompt.lastIndexOf("\n"));
    const insertVal = activeWordIsHash ? `#${tag}` : tag;

    if (lastWhitespaceIdx === -1) {
      setPrompt(insertVal + " ");
    } else {
      setPrompt(prompt.slice(0, lastWhitespaceIdx + 1) + insertVal + " ");
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col border-border glass shrink-0 h-full overflow-hidden",
        isRTL && "rtl",
        className,
      )}
    >
      <ScrollArea className={cn("flex-1 min-h-0", isRTL && "text-right")}>
        <div className="p-4 space-y-4">
          {/* Header + tip */}
          <div className="space-y-2">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-lg w-fit",
                isRTL && "flex-row-reverse",
              )}
            >
              <Settings2 size={10} className="text-primary" />
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                {t("image_studio.config.title")}
              </Label>
            </div>
            <div className="flex gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
              <Info size={12} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-foreground/75 leading-relaxed">
                {mode === "meme"
                  ? "Tip: choose a meme mode, set aspect ratio, write your idea, then generate. Open Advanced for style extras."
                  : "Tip: set aspect ratio, describe your image, optionally attach references, then generate. Open Advanced for styles and enhancers."}
              </p>
            </div>
          </div>

          {/* 1. Studio Mode */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Studio mode
            </Label>
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as "image" | "meme")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="image" className="text-[10px]">
                  {t("common.create_image")}
                </TabsTrigger>
                <TabsTrigger value="meme" className="text-[10px]">
                  {t("common.create_meme")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Meme essentials stay in default config */}
          <AnimatePresence>
            {mode === "meme" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Meme mode
                  </Label>
                  <Tabs
                    value={memeMode}
                    onValueChange={(v) => setMemeMode(v as "ai" | "template" | "hybrid")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 h-8">
                      <TabsTrigger value="ai" className="text-[10px]">
                        AI
                      </TabsTrigger>
                      <TabsTrigger value="template" className="text-[10px]">
                        Template
                      </TabsTrigger>
                      <TabsTrigger value="hybrid" className="text-[10px]">
                        Hybrid
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {memeMode === "ai" && "AI draws the full meme from your prompt + captions."}
                    {memeMode === "template" &&
                      "Pick a layout and fill text slots — server composes SVG."}
                    {memeMode === "hybrid" &&
                      "AI generates a base, then template text is overlaid."}
                  </p>
                </div>

                {(memeMode === "template" || memeMode === "hybrid") && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Template
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {memeTemplates.map((tpl) => {
                        const active = selectedTemplateId === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={cn(
                              "text-left rounded-xl border p-2.5 transition-all",
                              active
                                ? "border-teal-500 bg-teal-500/10 ring-1 ring-teal-500/30"
                                : "border-border/50 bg-muted/15 hover:border-border",
                            )}
                          >
                            <div
                              className="h-8 rounded-lg mb-2 border border-white/5"
                              style={{ background: tpl.previewGradient }}
                            />
                            <p className="text-[10px] font-semibold leading-tight">{tpl.name}</p>
                          </button>
                        );
                      })}
                    </div>
                    {selectedTemplateId && (
                      <div className="space-y-2 pt-1">
                        {(
                          memeTemplates.find((t) => t.id === selectedTemplateId)?.slots || []
                        ).map((slot) => (
                          <div key={slot.id} className="space-y-1">
                            <div className="flex justify-between px-0.5">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {slot.label}
                              </Label>
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                {(slotTexts[slot.id] || "").length}/{slot.maxLength}
                              </span>
                            </div>
                            <Input
                              value={slotTexts[slot.id] || ""}
                              onChange={(e) =>
                                setSlotText(slot.id, e.target.value.slice(0, slot.maxLength))
                              }
                              placeholder={slot.placeholder || slot.label}
                              className="h-9 text-xs md:text-xs placeholder:text-xs bg-muted/30 border-border/50"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {memeMode === "ai" && (
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("image_studio.meme.top_text")}
                      </Label>
                      <Input
                        placeholder={t("image_studio.meme.top_placeholder")}
                        value={topText}
                        onChange={(e) => setTopText(e.target.value.slice(0, 50))}
                        className="h-9 text-xs md:text-xs placeholder:text-xs bg-muted/30 border-border/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("image_studio.meme.bottom_text")}
                      </Label>
                      <Input
                        placeholder={t("image_studio.meme.bottom_placeholder")}
                        value={bottomText}
                        onChange={(e) => setBottomText(e.target.value.slice(0, 50))}
                        className="h-9 text-xs md:text-xs placeholder:text-xs bg-muted/30 border-border/50"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. Aspect Ratio */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Aspect ratio
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                {
                  id: "1:1",
                  label: "Square",
                  ratio: "1:1",
                  icon: <Square className="h-3 w-3 shrink-0" />,
                },
                {
                  id: "16:9",
                  label: "Landscape",
                  ratio: "16:9",
                  icon: <RectangleHorizontal className="h-3 w-3 shrink-0" />,
                },
                {
                  id: "9:16",
                  label: "Portrait",
                  ratio: "9:16",
                  icon: <RectangleVertical className="h-3 w-3 shrink-0" />,
                },
              ].map((item) => {
                const active = aspectRatio === item.id;
                // Template/hybrid memes only compose in the ratios the template
                // supports; other ratios render a broken, letterboxed layout.
                const unsupported =
                  !!aspectRatioConstraint && !aspectRatioConstraint.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={unsupported}
                    onClick={() => setAspectRatio(item.id)}
                    title={
                      unsupported
                        ? `${selectedTemplate?.name || "This template"} does not support ${item.ratio}`
                        : undefined
                    }
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 transition-all text-center",
                      unsupported
                        ? "border-border/40 bg-muted/10 text-muted-foreground/40 cursor-not-allowed opacity-50"
                        : active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "border-border/50 bg-muted/20 text-foreground hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    {item.icon}
                    <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold leading-none",
                        unsupported
                          ? "text-muted-foreground/40"
                          : active
                            ? "text-primary-foreground/85"
                            : "text-muted-foreground",
                      )}
                    >
                      {item.ratio}
                    </span>
                  </button>
                );
              })}
            </div>
            {aspectRatioConstraint && aspectRatioConstraint.length < 3 ? (
              <p className="text-[10px] text-muted-foreground leading-snug">
                {selectedTemplate?.name} supports {aspectRatioConstraint.join(", ")} only.
              </p>
            ) : null}
          </div>

          {/* 3. References — image + AI/hybrid meme */}
          {(mode === "image" || (mode === "meme" && memeMode !== "template")) && (
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  References
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {selectedRefCount}/{maxReferences}
                    {referencePlanHint ? ` · ${referencePlanHint}` : ""}
                  </span>
                  {selectedRefCount > 0 && (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                      onClick={onClearReferences}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Image 1…{maxReferences} left→right = model order
                {referencePlanHint
                  ? ` · ${referencePlanHint}: max ${maxReferences}`
                  : ` · max ${maxReferences}`}
                .
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-[10px] font-bold gap-1.5"
                  disabled={selectedRefCount >= maxReferences || isUploadingReference}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingReference ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  Upload
                </Button>
                <Button
                  type="button"
                  variant={libraryPickerOpen ? "secondary" : "outline"}
                  className="h-9 text-[10px] font-bold gap-1.5"
                  onClick={() => {
                    const next = !libraryPickerOpen;
                    onLibraryPickerOpenChange?.(next);
                    if (next && libraryCandidateCount === 0) {
                      onScrollToHistory?.();
                    }
                  }}
                >
                  <Library className="h-3.5 w-3.5" />
                  {libraryPickerOpen ? "Close library" : "Pick from library"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadReference(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {orderedReferenceChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {orderedReferenceChips.map((item) => (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "group/ref relative h-12 w-12 shrink-0 rounded-md overflow-hidden border bg-muted/40",
                            item.status === "uploading"
                              ? "border-primary/50"
                              : "border-border/60 hover:border-primary/40",
                          )}
                        >
                          {item.previewUrl ? (
                            item.source === "library" ? (
                              <AuthenticatedImage
                                src={item.previewUrl}
                                alt={item.label}
                                className="h-full w-full object-cover"
                                disableRemoteFallback
                              />
                            ) : (
                              <img
                                src={item.previewUrl}
                                alt={item.label}
                                className={cn(
                                  "h-full w-full object-cover",
                                  item.status === "uploading" && "opacity-60",
                                )}
                              />
                            )
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/65 text-[8px] font-bold text-white text-center leading-4">
                            {item.label}
                          </span>
                          {item.status === "uploading" ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Remove ${item.label}`}
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-background border border-border/70 text-muted-foreground opacity-0 group-hover/ref:opacity-100 flex items-center justify-center shadow-sm transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.source === "upload") {
                                  onRemoveReferenceUpload(item.removeId);
                                } else {
                                  toggleReferenceContent(item.removeId);
                                }
                              }}
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px]">
                        {item.status === "uploading"
                          ? `Uploading ${item.label}…`
                          : `${item.label} (${item.source === "upload" ? "upload" : "library"})`}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Prompt */}
          <div className="space-y-2">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Prompt
              </Label>
              <div className="flex items-center gap-0.5">
                {prompt.trim() ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    aria-label="Copy prompt"
                    onClick={() => {
                      void navigator.clipboard.writeText(prompt.trim());
                      toast.success("Prompt copied");
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                  >
                    <Copy size={12} />
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsQuickEditOpen(true)}
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                >
                  <Maximize2 size={12} />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Textarea
                placeholder={
                  mode === "meme"
                    ? "Describe the meme idea, joke, or scene you want to create..."
                    : "Describe the image you want to create..."
                }
                className={cn(
                  "min-h-[100px] resize-none bg-muted/30 border-border/50 focus:border-primary/50 text-xs md:text-xs placeholder:text-xs p-3",
                  prompt.length > 500 && "border-red-500",
                  isRTL && "text-right",
                )}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              {prompt ? (
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className={cn(
                    "absolute top-2 p-1 text-muted-foreground hover:text-foreground rounded-md",
                    isRTL ? "left-2" : "right-2",
                  )}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <AnimatePresence>
              {tagSuggestions.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {tagSuggestions.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer text-[10px] py-0.5 px-2"
                        onClick={() => handleTagSuggestSelect(tag)}
                      >
                        {activeWordIsHash ? `#${tag}` : tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className={cn("flex px-1", isRTL ? "justify-start" : "justify-end")}>
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  prompt.length > 500 ? "text-red-500 font-bold" : "text-muted-foreground",
                )}
              >
                {prompt.length}/500
              </span>
            </div>
          </div>

          {/* 5. Title (optional) */}
          <div className="space-y-2">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {mode === "meme" ? "Meme title" : "Image title"}{" "}
                <span className="normal-case tracking-normal font-medium opacity-70">
                  (optional)
                </span>
              </Label>
              <div className="flex items-center gap-0.5">
                {title.trim() ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    aria-label="Copy title"
                    onClick={() => {
                      void navigator.clipboard.writeText(title.trim());
                      toast.success("Title copied");
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                  >
                    <Copy size={12} />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] font-bold uppercase gap-1.5 text-primary hover:bg-primary/10"
                  onClick={handleGenerateTitle}
                  disabled={isGeneratingTitle || !prompt}
                >
                  {isGeneratingTitle ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI suggest
                </Button>
              </div>
            </div>
            <Input
              placeholder={
                mode === "meme" ? "Name this meme draft (optional)" : "Name this image draft (optional)"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "h-9 text-xs md:text-xs placeholder:text-xs bg-muted/30 border-border/50",
                isRTL && "text-right",
              )}
            />
          </div>

          {/* Compact generations meter */}
          <div
            className={cn(
              "flex items-center justify-between px-1",
              isRTL && "flex-row-reverse",
            )}
          >
            <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
              <Zap size={10} className="text-primary" />
              <span className="text-[10px] text-muted-foreground">
                {dailyGenerationLimit == null
                  ? "Unlimited generations"
                  : `${generationsLeft ?? dailyGenerationLimit}/${dailyGenerationLimit} left today`}
              </span>
            </div>
            <Button
              variant="link"
              className="h-auto p-0 text-[10px] text-primary/70"
              onClick={() => {
                window.location.href = "/pricing";
              }}
            >
              Upgrade
            </Button>
          </div>

          <Separator className="bg-border/40" />

          {/* Advanced Configuration — clear clickable section */}
          <Accordion className="w-full">
            <AccordionItem
              value="advanced"
              className={cn(
                "rounded-xl border-0 overflow-hidden",
                "bg-muted/40 ring-1 ring-border/60",
                "data-[open]:ring-primary/30 data-[open]:bg-muted/55",
              )}
            >
              <AccordionTrigger
                className={cn(
                  "group/adv px-3.5 py-3.5 hover:no-underline hover:bg-muted/70 transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  isRTL && "flex-row-reverse",
                )}
              >
                <div className={cn("flex items-center gap-3 min-w-0", isRTL && "flex-row-reverse")}>
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/15 border border-primary/25 text-primary flex items-center justify-center group-hover/adv:bg-primary/25 transition-colors">
                    <Settings2 className="h-4 w-4" />
                  </div>
                  <div className={cn("min-w-0 text-left", isRTL && "text-right")}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground tracking-wide">
                        Advanced configuration
                      </span>
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-border/70"
                      >
                        Optional
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Styles, captions, lighting &amp; more — click to expand
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-5 px-3.5 pb-4 pt-1 border-t border-border/40">
                {/* Style suggestions */}
                <div className="space-y-2">
                  <div
                    className={cn(
                      "flex items-center justify-between",
                      isRTL && "flex-row-reverse",
                    )}
                  >
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Suggestions · {style || "cinematic"}
                    </Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={refreshSuggestions}
                    >
                      <RefreshCw size={10} className={cn(isGenerating && "animate-spin")} />
                    </Button>
                  </div>
                  <ScrollableSuggestions
                    items={activeSuggestions}
                    onSelect={handleSuggestionClick}
                    truncateLimit={18}
                  />
                </div>

                {/* Caption studio — edit caption; suggestions come from generate */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Caption studio
                  </Label>
                  <Textarea
                    placeholder="Add or edit a caption for publish…"
                    className="min-h-[72px] resize-none bg-muted/30 border-border/50 text-xs md:text-xs placeholder:text-xs p-3"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                  {captionSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        Suggestions from your last generate — tap to use
                      </p>
                      <ScrollableSuggestions
                        items={captionSuggestions}
                        onSelect={setCaption}
                        selectedValue={caption}
                        truncateLimit={22}
                      />
                    </div>
                  )}
                </div>

                {/* Style presets — image only */}
                {mode === "image" ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Style presets
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_PRESETS.filter((p) => p.id !== "meme").map((p) => (
                        <Button
                          key={p.id}
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-16 flex flex-col gap-1.5 text-[10px] p-1 border-border/50 bg-muted/20",
                            style === p.id && "border-primary bg-primary/5",
                          )}
                          onClick={() => setStyle(p.id)}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                          <span
                            className={cn(
                              "font-bold uppercase tracking-wider",
                              style === p.id ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {p.label}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Enhancers */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Enhancers · lighting / tone
                  </Label>
                  <Select
                    value={lighting || undefined}
                    onValueChange={(v) => setLighting(typeof v === "string" ? v : "")}
                  >
                    <SelectTrigger className="h-9 w-full text-xs md:text-xs bg-muted/30 border-border/50">
                      <SelectValue placeholder="None selected">
                        {lighting === "neon"
                          ? "Neon"
                          : lighting === "golden"
                            ? "Golden hour"
                            : lighting === "dramatic"
                              ? "Dramatic"
                              : lighting === "natural"
                                ? "Natural"
                                : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural" className="text-xs">
                        Natural
                      </SelectItem>
                      <SelectItem value="neon" className="text-xs">
                        Neon
                      </SelectItem>
                      <SelectItem value="golden" className="text-xs">
                        Golden hour
                      </SelectItem>
                      <SelectItem value="dramatic" className="text-xs">
                        Dramatic
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {lighting ? (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                      onClick={() => setLighting("")}
                    >
                      Clear enhancer
                    </button>
                  ) : null}
                </div>

                {/* Negative prompt */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Negative prompt
                  </Label>
                  <Input
                    placeholder="Things to avoid (appended to your prompt)"
                    className="h-9 text-xs md:text-xs placeholder:text-xs bg-muted/30 border-border/50"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Added as “Avoid: …” when you generate. The API has no separate negative field.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Recent prompts — outside Advanced */}
          {recentPromptItems.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
              <div
                className={cn(
                  "flex items-center justify-between",
                  isRTL && "flex-row-reverse",
                )}
              >
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Last prompt
                </Label>
                {/* Intentionally no clear control here — Clear All on Recent Generations
                    is the only delete path; this X previously opened the same API wipe. */}
              </div>
              <div className="space-y-2">
                {recentPromptItems.map((item) => (
                  <button
                    key={item.id || item.timestamp}
                    type="button"
                    onClick={() => handleReuseGeneration(item)}
                    className="w-full text-left p-2.5 rounded-md bg-muted/30 border border-border/50 hover:border-primary/30 space-y-1"
                  >
                    <p className="text-[10px] text-foreground/80 line-clamp-2 leading-relaxed">
                      {item.basePrompt || item.prompt}
                    </p>
                    {item.refinePrompt ? (
                      <p className="text-[9px] text-muted-foreground line-clamp-1">
                        Last refine: {item.refinePrompt}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      {item.style ? (
                        <Badge variant="outline" className="text-[8px] h-4 px-1">
                          {item.style}
                        </Badge>
                      ) : null}
                      {item.aspectRatio ? (
                        <Badge variant="outline" className="text-[8px] h-4 px-1">
                          {item.aspectRatio}
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
        <Button
          variant={generationsLeft === 0 ? "secondary" : "brand-gradient"}
          className={cn(
            "w-full font-bold shadow-lg shadow-primary/20",
            generationsLeft === 0 && "bg-muted text-muted-foreground",
            isRTL && "flex-row-reverse",
          )}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className={cn(isRTL ? "ml-2" : "mr-2", "h-4 w-4 animate-spin")} />
              {t("image_studio.buttons.generating")}
            </>
          ) : (
            <>
              <Zap className={cn(isRTL ? "ml-2" : "mr-2", "h-4 w-4 fill-current")} />
              {willCreateNewImage
                ? t("image_studio.buttons.generate", { defaultValue: "Generate" })
                : "Refine draft"}
            </>
          )}
        </Button>
        {!willCreateNewImage && !isGenerating && (
          <p className="mt-1.5 text-[10px] text-center text-muted-foreground">
            Same action as the canvas button: updates this draft in place using the current preview as
            the base. Change the prompt and click again. Adding or changing references switches to
            Generate (new {mode === "meme" ? "meme" : "image"}, no previous base).
          </p>
        )}
        {willCreateNewImage && !isGenerating && resultImage && (
          <p className="mt-1.5 text-[10px] text-center text-muted-foreground">
            Creates a new {mode === "meme" ? "meme" : "image"} from the current options. After it
            succeeds, AI drafts can be refined in place; use “Create as new” to start fresh.
          </p>
        )}
        {!willCreateNewImage && !isGenerating && resultImage && onStartFreshDraft && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-8 text-[10px] font-bold text-muted-foreground"
            onClick={onStartFreshDraft}
          >
            Create as new
          </Button>
        )}
        {mode === "meme" && memeMode === "template" && !isGenerating && (
          <p className="mt-1.5 text-[10px] text-center text-amber-600/90 dark:text-amber-400/90">
            Template memes are composed from the template + text slots. Same template and same text
            produce the same image — change the captions to get a new result.
          </p>
        )}
        {isUploadingReference && (
          <p className="mt-1.5 text-[10px] text-center text-muted-foreground">
            Wait for reference uploads to finish before generating.
          </p>
        )}
      </div>
    </Card>
  );
}
