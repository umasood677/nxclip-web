import React, { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Clipboard,
  Copy,
  Download,
  Info,
  Link2,
  Maximize2,
  MoreHorizontal,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AuthenticatedImage } from "../../../../components/AuthenticatedImage";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import { cn } from "../../../../lib/utils";
import { GenerationHistoryItem } from "../../types";
import { formatCreatedDate, formatCreatedTime, getDisplayStatusBadge } from "./statusStyles";
import { StatusPill } from "./StatusPill";
import { resolveLibraryTitle } from "../../../ContentLibrary/lib/title";

const TRANSITION_MS = 0.2;

export interface GenerationCardProps {
  item: GenerationHistoryItem;
  /** Numeric width/height of the media. Undefined means the ratio is unknown. */
  aspectRatio?: number;
  /** Reports the loaded image's size so items without a ratio can be laid out. */
  onMediaLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onReuse: (item: GenerationHistoryItem) => void;
  onDownload: (url: string) => void;
  onOpen: (item: GenerationHistoryItem) => void;
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="h-7 w-7 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center border border-white/10 hover:bg-black/75 transition-all duration-200"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function GenerationCardComponent({
  item,
  aspectRatio,
  onMediaLoad,
  onReuse,
  onDownload,
  onOpen,
}: GenerationCardProps) {
  const [hovered, setHovered] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const displayTitle = resolveLibraryTitle(
    {
      title: item.title,
      prompt: item.prompt,
      captions: item.captions,
      storageKey: item.storageKey,
    },
    "Untitled Creation",
  );

  const statusBadge = getDisplayStatusBadge(item);
  const createdDate = formatCreatedDate(item.timestamp);
  const createdTime = formatCreatedTime(item.timestamp);

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  useEffect(() => {
    if (!detailOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailOpen, closeDetail]);

  useEffect(() => {
    if (!detailOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        closeDetail();
      }
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [detailOpen, closeDetail]);

  const copyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = item.basePrompt || item.prompt;
    if (!text) {
      toast.message("No prompt saved for this item");
      return;
    }
    void navigator.clipboard.writeText(text);
    toast.success(item.refinePrompt ? "Base prompt copied" : "Prompt copied");
  };

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(item.url);
    toast.success("Image URL copied");
  };

  const captionTags = (item.captions || []).filter(Boolean);
  const hashtagTags = Array.from(
    new Set((item.hashtagSets || []).flat().map((t) => String(t || "").replace(/^#/, "").trim()).filter(Boolean)),
  );

  return (
    <motion.article
      layout={false}
      className={cn(
        "relative h-full group/card rounded-[24px]",
        // Clip media to the rounded frame, but keep hover chrome from being
        // cropped when the tile is a narrow 9:16.
        hovered ? "overflow-visible z-20" : "overflow-hidden",
        "bg-card/40 border border-border/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
        "transition-shadow duration-200",
        hovered && "shadow-[0_16px_40px_rgba(0,0,0,0.22)]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMoreOpen(false);
      }}
      animate={{
        y: hovered ? -4 : 0,
      }}
      transition={{ duration: TRANSITION_MS, ease: "easeOut" }}
    >
      {/* Media is clipped to the rounded frame; hover chrome sits above so
          narrow 9:16 tiles do not crop the toolbar. */}
      <div className="relative h-full w-full">
        <div className="absolute inset-0 overflow-hidden rounded-[24px]">
          <AuthenticatedImage
            key={item.mediaRevision || item.storageKey || item.url}
            src={item.url}
            alt={displayTitle}
            disableRemoteFallback
            loading="lazy"
            className={cn(
              "absolute inset-0 h-full w-full transition-[filter] duration-200 cursor-pointer",
              // Unknown ratio: letterbox rather than crop the caption off a meme.
              aspectRatio ? "object-cover" : "object-contain",
              hovered && "brightness-[0.88]",
            )}
            wrapperClassName="!absolute !inset-0 !h-full !w-full !bg-transparent"
            onClick={() => onOpen(item)}
            onLoad={(e) =>
              onMediaLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
            }
          />

          {/* Bottom gradient overlay */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 pointer-events-none",
              "bg-gradient-to-t from-black/80 via-black/35 to-transparent",
              hovered ? "pt-24 pb-3 px-3.5" : "pt-16 pb-3 px-3.5",
            )}
          >
            <div className="pointer-events-auto space-y-1.5">
              {statusBadge ? <StatusPill badge={statusBadge} /> : null}
              <button
                type="button"
                id={titleId}
                className="text-left w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailOpen(true);
                }}
              >
                <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 drop-shadow-sm">
                  {displayTitle}
                </p>
              </button>

              <AnimatePresence initial={false}>
                {hovered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: TRANSITION_MS }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/75 font-medium">
                      <span>{createdDate}</span>
                      <span>{createdTime}</span>
                      {item.style ? <span className="capitalize">{item.style}</span> : null}
                      {item.aspectRatio ? <span>{item.aspectRatio}</span> : null}
                      {item.basePrompt || item.prompt ? (
                        <span>{(item.basePrompt || item.prompt || "").length} chars</span>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Hover toolbar — top right (status lives in bottom overlay to avoid overlap) */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: TRANSITION_MS }}
              className="absolute top-2 right-2 z-20 flex flex-wrap justify-end items-center gap-1 max-w-[calc(100%-0.5rem)]"
            >
              <IconBtn label="Copy prompt" onClick={copyPrompt}>
                <Clipboard className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label="Copy image URL" onClick={copyUrl}>
                <Link2 className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                label="Download"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item.url);
                }}
              >
                <Download className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                label="Open details"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailOpen(true);
                }}
              >
                <Info className="h-3.5 w-3.5" />
              </IconBtn>
              <div className="relative">
                <IconBtn
                  label="More actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreOpen((v) => !v);
                  }}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </IconBtn>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: TRANSITION_MS }}
                      className="absolute right-0 top-9 w-40 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-1 z-30"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen(false);
                          onReuse(item);
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reuse prompt
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen(false);
                          onOpen(item);
                        }}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        Open in studio
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen(false);
                          setDetailOpen(true);
                        }}
                      >
                        <Info className="h-3.5 w-3.5" />
                        Open details
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail popup */}
      <AnimatePresence>
        {detailOpen && (
          <motion.div
            ref={popupRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: TRANSITION_MS }}
            className="absolute inset-3 z-40 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-white/10 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <AuthenticatedImage
                    key={item.mediaRevision || item.storageKey || item.url}
                    src={item.url}
                    alt=""
                    disableRemoteFallback
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-white line-clamp-2">{displayTitle}</p>
                  <p className="text-[10px] text-white/45">
                    {createdDate} · {createdTime}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close details"
                  className="h-7 w-7 rounded-full bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 shrink-0"
                  onClick={closeDetail}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {item.id ? (
                <button
                  type="button"
                  className="group/id w-full text-left rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10 transition-colors"
                  title="Copy Generation ID"
                  onClick={() => {
                    void navigator.clipboard.writeText(item.id!);
                    toast.success("Generation ID copied");
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">
                      Content ID
                    </span>
                    <Copy className="h-3 w-3 text-white/40 group-hover/id:text-white/80 shrink-0" />
                  </div>
                  <p className="text-[10px] text-white/80 font-mono leading-snug break-all">
                    {item.id}
                  </p>
                </button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[11px]">
              {item.basePrompt ? (
                <DetailRow
                  label="Base prompt"
                  onCopy={() => {
                    void navigator.clipboard.writeText(item.basePrompt || "");
                    toast.success("Base prompt copied");
                  }}
                >
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{item.basePrompt}</p>
                </DetailRow>
              ) : item.prompt ? (
                <DetailRow
                  label="Prompt"
                  onCopy={() => {
                    void navigator.clipboard.writeText(item.prompt || "");
                    toast.success("Prompt copied");
                  }}
                >
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{item.prompt}</p>
                </DetailRow>
              ) : null}

              {item.refinePrompt ? (
                <DetailRow
                  label="Last refine"
                  onCopy={() => {
                    void navigator.clipboard.writeText(item.refinePrompt || "");
                    toast.success("Refine prompt copied");
                  }}
                >
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{item.refinePrompt}</p>
                </DetailRow>
              ) : null}

              {item.title ? (
                <DetailRow
                  label="Title"
                  onCopy={() => {
                    void navigator.clipboard.writeText(item.title || "");
                    toast.success("Title copied");
                  }}
                >
                  <p className="text-white/90 leading-relaxed">{item.title}</p>
                </DetailRow>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {statusBadge ? (
                  <DetailRow label="Status">
                    <span className="text-white/90">{statusBadge.label}</span>
                  </DetailRow>
                ) : null}
                {typeof item.watermarked === "boolean" ? (
                  <DetailRow label="Watermark">
                    <span className="text-white/90">
                      {item.watermarked ? "Watermarked" : "Watermark Free"}
                    </span>
                  </DetailRow>
                ) : null}
                {item.style ? (
                  <DetailRow label="Style">
                    <span className="text-white/90 capitalize">{item.style}</span>
                  </DetailRow>
                ) : null}
                {item.aspectRatio ? (
                  <DetailRow label="Aspect ratio">
                    <span className="text-white/90">{item.aspectRatio}</span>
                  </DetailRow>
                ) : null}
                {item.type ? (
                  <DetailRow label="Type">
                    <span className="text-white/90 capitalize">{item.type}</span>
                  </DetailRow>
                ) : null}
                {item.basePrompt || item.prompt ? (
                  <DetailRow label="Prompt length">
                    <span className="text-white/90">
                      {(item.basePrompt || item.prompt || "").length} chars
                      {item.refinePrompt ? ` · refine ${item.refinePrompt.length}` : ""}
                    </span>
                  </DetailRow>
                ) : null}
              </div>

              {captionTags.length > 0 ? (
                <DetailRow
                  label="Captions"
                  onCopy={() => {
                    void navigator.clipboard.writeText(captionTags.join("\n\n"));
                    toast.success("Captions copied");
                  }}
                >
                  <div className="space-y-1.5">
                    {captionTags.map((caption, idx) => (
                      <div
                        key={`cap-${idx}`}
                        className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/85 leading-relaxed flex items-start gap-1"
                      >
                        <span className="flex-1">{caption}</span>
                        <button
                          type="button"
                          aria-label="Copy caption"
                          className="h-5 w-5 shrink-0 rounded text-white/50 hover:text-white flex items-center justify-center"
                          onClick={() => {
                            void navigator.clipboard.writeText(caption);
                            toast.success("Caption copied");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </DetailRow>
              ) : null}

              {hashtagTags.length > 0 ? (
                <DetailRow
                  label={`Hashtags (${hashtagTags.length})`}
                  onCopy={() => {
                    void navigator.clipboard.writeText(hashtagTags.map((t) => `#${t}`).join(" "));
                    toast.success("Hashtags copied");
                  }}
                >
                  <div className="flex flex-wrap gap-2">
                    {hashtagTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 rounded-md border border-white/10 bg-white/10 text-white/95 text-sm font-medium leading-snug"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              ) : null}
            </div>

            <div className="p-2.5 border-t border-white/10 flex gap-1.5">
              <button
                type="button"
                className="flex-1 h-8 rounded-lg bg-white/10 text-white text-[11px] font-semibold hover:bg-white/15 flex items-center justify-center gap-1.5"
                onClick={() => onReuse(item)}
              >
                <RefreshCw className="h-3 w-3" />
                Reuse
              </button>
              <button
                type="button"
                className="flex-1 h-8 rounded-lg bg-white/10 text-white text-[11px] font-semibold hover:bg-white/15 flex items-center justify-center gap-1.5"
                onClick={() => onDownload(item.url)}
              >
                <Download className="h-3 w-3" />
                Download
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/15 flex items-center justify-center"
                aria-label="Copy prompt"
                onClick={copyPrompt}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function DetailRow({
  label,
  children,
  onCopy,
}: {
  label: string;
  children: React.ReactNode;
  onCopy?: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-[0.16em] font-bold text-white/40">{label}</p>
        {onCopy ? (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            className="h-5 w-5 rounded text-white/40 hover:text-white flex items-center justify-center"
            onClick={onCopy}
          >
            <Copy className="h-3 w-3" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export const GenerationCard = memo(GenerationCardComponent);
