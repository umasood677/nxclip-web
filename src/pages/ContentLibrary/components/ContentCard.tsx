import React, { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Clapperboard,
  Copy,
  Download,
  ExternalLink,
  FileEdit,
  Image as ImageIcon,
  Info,
  MoreHorizontal,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContentDto, contentMediaRevision, extractValidImageUrl } from "../../../services/apiClient";
import { AuthenticatedImage } from "../../../components/AuthenticatedImage";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import {
  formatCreatedDate,
  formatCreatedTime,
  getDisplayStatusBadge,
  isReferenceAsset,
} from "../../ImageStudio/components/RecentGenerations/statusStyles";
import { StatusPill } from "../../ImageStudio/components/RecentGenerations/StatusPill";
import { isIncompleteLibraryItem, resolveLibraryTitle } from "../lib/title";
import { resolveItemAspectRatio } from "../lib/aspectRatio";
import { cssAspectRatio, normalizeAspectToken } from "../../../components/JustifiedGallery";
import nxclipLogo from "../../../contents/images/nexa-logo.png";

const TRANSITION_MS = 0.2;
interface ContentCardProps {
  item: ContentDto;
  /** Numeric width/height when the card sits inside a JustifiedGallery slot. */
  aspectRatio?: number;
  /** Reports the loaded image's size so items stored without a ratio can be laid out. */
  onMediaLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onViewDetails: (id: string) => void;
  onDownload: (item: ContentDto) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: ContentDto) => void;
  onPublish?: (item: ContentDto) => void;
  isRtl?: boolean;
  priority?: boolean;
  index?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function IconBtn({
  label,
  onClick,
  children,
  tone = "default",
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200",
            "border shadow-[0_6px_18px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95",
            tone === "danger"
              ? "bg-rose-500 border-rose-400/80 text-white hover:bg-rose-400"
              : "bg-zinc-950/85 backdrop-blur-md border-white/40 text-white hover:bg-zinc-900 hover:border-white/60",
          )}
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

function ContentCardComponent({
  item,
  aspectRatio,
  onMediaLoad,
  onViewDetails,
  onDownload,
  onDelete,
  onEdit,
  onPublish,
  priority,
  index,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: ContentCardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setImageFailed(false);
  }, [
    item.id,
    item.thumbnailUrl,
    item.cdnUrl,
    item.imageUrl,
    item.storageKey,
    item.status,
    item.updatedAt,
    item.prompt,
  ]);

  const isPriority = priority ?? (typeof index === "number" && index < 4);
  const mediaRevision = contentMediaRevision(item);
  const thumb =
    extractValidImageUrl(item) ||
    (item.id ? `/content/${item.id}/media` : "") ||
    "";
  const incomplete = isIncompleteLibraryItem(item) || !thumb || imageFailed;
  const resolvedAspect = resolveItemAspectRatio(item);
  const tileAspect = cssAspectRatio(resolvedAspect);
  const type = (item.contentType || "image") as string;
  const isReference = isReferenceAsset(item);
  const isDraft = !isReference && item.status === "draft";
  const statusBadge = getDisplayStatusBadge(item);

  const createdTs = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();
  const createdDate = formatCreatedDate(createdTs);
  const createdTime = formatCreatedTime(createdTs);

  const displayTitle = resolveLibraryTitle(
    item,
    t("common.untitled", { defaultValue: "Untitled Creation" }),
  );

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

  const typeLabel =
    type === "clip" || type === "video"
      ? t("content_library.types.clip", { defaultValue: "Clip" })
      : type === "meme"
        ? t("content_library.types.meme", { defaultValue: "Meme" })
        : t("content_library.types.image", { defaultValue: "Image" });

  const TypeIcon =
    type === "clip" || type === "video" ? Video : type === "meme" ? Clapperboard : ImageIcon;

  const handlePrimaryClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (isDraft && onEdit) {
      onEdit(item);
      return;
    }
    onViewDetails(item.id);
  };

  return (
    <motion.article
      layout={false}
      className={cn(
        "relative h-full group/card rounded-[24px] overflow-hidden",
        "bg-card/40 border shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
        "transition-shadow duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/40 shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
          : "border-border/40",
        hovered && !isSelected && "shadow-[0_16px_40px_rgba(0,0,0,0.22)] z-10",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMoreOpen(false);
      }}
      animate={{
        y: hovered ? -4 : 0,
        scale: hovered ? 1.02 : 1,
      }}
      transition={{ duration: TRANSITION_MS, ease: "easeOut" }}
    >
      {/* The justified row already sizes this slot to the media ratio, so the
          frame just fills it — re-declaring aspect-ratio here could round to a
          hairline of card background below the image. */}
      <div className="relative h-full w-full">
        {incomplete ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#6b7280]"
          >
            <img
              src={nxclipLogo}
              alt="nxclip.ai"
              className="w-[72px] h-[72px] max-w-[40%] max-h-[40%] object-contain grayscale brightness-125 contrast-75 opacity-55 select-none pointer-events-none"
              referrerPolicy="no-referrer"
              draggable={false}
            />
            {resolvedAspect ? (
              <span className="absolute bottom-3 left-3 z-20 text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-md bg-black/55 text-white/95 border border-white/15 backdrop-blur-md">
                {normalizeAspectToken(resolvedAspect)}
              </span>
            ) : null}
            <button
              type="button"
              aria-label="Delete incomplete item"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-rose-500 border border-rose-400/80 text-white flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.45)] hover:bg-rose-400 hover:scale-105 z-30"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        ) : (
          <AuthenticatedImage
            key={mediaRevision || thumb}
            src={thumb}
            alt={displayTitle}
            disableRemoteFallback
            loading="lazy"
            priority={isPriority}
            placeholderAspectRatio={tileAspect}
            wrapperClassName="!absolute !inset-0 !h-full !w-full !bg-transparent"
            loadTimeoutMs={10000}
            className={cn(
              "absolute inset-0 h-full w-full transition-[filter] duration-200 cursor-pointer",
              // Unknown ratio: letterbox rather than crop captions off a meme.
              aspectRatio ? "object-cover" : "object-contain",
              hovered && "brightness-[0.88]",
              isSelected && "brightness-[0.8]",
            )}
            onClick={handlePrimaryClick}
            onLoad={(e) =>
              onMediaLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
            }
            onError={() => setImageFailed(true)}
          />
        )}

        {/* Selection checkbox — top-left, clear of right toolbar */}
        <div
          className={cn(
            "absolute z-30 transition-all duration-200 top-2.5 left-2.5",
            isSelectionMode || isSelected || hovered
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none",
          )}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={isSelected ? "Deselect" : "Select"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
              "bg-black/45 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.35)]",
              "hover:bg-black/55",
            )}
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/90 bg-white/95",
              )}
            >
              {isSelected ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}
            </span>
          </button>
        </div>

        {/* Hover toolbar — right side only; delete lives under More */}
        <AnimatePresence>
          {hovered && !isSelectionMode && !incomplete && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: TRANSITION_MS }}
              className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 max-w-[calc(100%-3.25rem)]"
            >
              {isDraft && onEdit ? (
                <IconBtn
                  label={t("content_library.actions.edit_draft", { defaultValue: "Edit Draft" })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                >
                  <FileEdit className="h-4 w-4" strokeWidth={2.25} />
                </IconBtn>
              ) : null}
              <IconBtn
                label={t("content_library.actions.download", { defaultValue: "Download" })}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item);
                }}
              >
                <Download className="h-4 w-4" strokeWidth={2.25} />
              </IconBtn>
              <IconBtn
                label="Details"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailOpen(true);
                }}
              >
                <Info className="h-4 w-4" strokeWidth={2.25} />
              </IconBtn>
              <div className="relative shrink-0">
                <IconBtn
                  label="More actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreOpen((v) => !v);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
                </IconBtn>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: TRANSITION_MS }}
                      className="absolute right-0 top-9 w-48 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-1 z-30"
                    >
                      {isDraft && onPublish ? (
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoreOpen(false);
                            onPublish(item);
                          }}
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          {t("content_library.actions.publish_to_feed", {
                            defaultValue: "Publish to Feed",
                          })}
                        </button>
                      ) : null}
                      {onEdit ? (
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/90 hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoreOpen(false);
                            onEdit(item);
                          }}
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          {isDraft
                            ? t("content_library.actions.edit_draft", { defaultValue: "Edit Draft" })
                            : t("content_library.actions.edit_in_studio", {
                                defaultValue: "Edit in Studio",
                              })}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen(false);
                          onViewDetails(item.id);
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("content_library.actions.view_details", { defaultValue: "View Details" })}
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen(false);
                          onDownload(item);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("content_library.actions.download", { defaultValue: "Download" })}
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen(false);
                          onDelete(item.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("content_library.actions.delete", { defaultValue: "Delete" })}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom overlay — Status + title on image (same design for complete + incomplete tiles) */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 pointer-events-none",
            "bg-gradient-to-t from-black/85 via-black/40 to-transparent",
            hovered ? "pt-24 pb-3 px-3.5" : "pt-16 pb-3 px-3.5",
          )}
        >
          <div className="pointer-events-auto space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {statusBadge ? <StatusPill badge={statusBadge} /> : null}
              <AnimatePresence initial={false}>
                {hovered && !incomplete ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: TRANSITION_MS }}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/45 backdrop-blur-md border border-white/15 text-white/95 inline-flex items-center gap-1"
                  >
                    <TypeIcon size={11} className="text-white/80" />
                    {typeLabel}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <button
              type="button"
              id={titleId}
              className="text-left w-full min-w-0"
              title={displayTitle}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelectionMode && onToggleSelect) onToggleSelect();
                else setDetailOpen(true);
              }}
            >
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 drop-shadow-sm break-words [overflow-wrap:anywhere]">
                {displayTitle}
              </p>
            </button>

            <AnimatePresence initial={false}>
              {hovered && !incomplete && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: TRANSITION_MS }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/75 font-medium">
                    <span>{createdDate}</span>
                    <span>{createdTime}</span>
                    {item.style ? <span className="capitalize">{item.style}</span> : null}
                    {resolvedAspect ? <span>{normalizeAspectToken(resolvedAspect)}</span> : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
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
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-[#6b7280] flex items-center justify-center">
                  {incomplete ? (
                    <img
                      src={nxclipLogo}
                      alt=""
                      className="w-8 h-8 object-contain grayscale opacity-55"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                  ) : (
                    <AuthenticatedImage
                      key={mediaRevision || thumb}
                      src={thumb}
                      alt=""
                      disableRemoteFallback
                      className="w-full h-full object-cover"
                    />
                  )}
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
                  title="Copy Content ID"
                  onClick={() => {
                    void navigator.clipboard.writeText(item.id);
                    toast.success("Content ID copied");
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
              {item.prompt ? (
                <DetailRow label="Prompt">
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{item.prompt}</p>
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
                <DetailRow label="Type">
                  <span className="text-white/90 capitalize">{typeLabel}</span>
                </DetailRow>
                {item.style ? (
                  <DetailRow label="Style">
                    <span className="text-white/90 capitalize">{item.style}</span>
                  </DetailRow>
                ) : null}
                {resolvedAspect ? (
                  <DetailRow label="Aspect ratio">
                    <span className="text-white/90">{normalizeAspectToken(resolvedAspect)}</span>
                  </DetailRow>
                ) : null}
              </div>
            </div>

            <div className="p-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
              {isDraft && onPublish ? (
                <button
                  type="button"
                  className="flex-1 min-w-[40%] h-8 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/30 flex items-center justify-center gap-1.5"
                  onClick={() => {
                    closeDetail();
                    onPublish(item);
                  }}
                >
                  <UploadCloud className="h-3 w-3" />
                  Publish
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  className="flex-1 min-w-[40%] h-8 rounded-lg bg-white/10 text-white text-[11px] font-semibold hover:bg-white/15 flex items-center justify-center gap-1.5"
                  onClick={() => {
                    closeDetail();
                    onEdit(item);
                  }}
                >
                  <FileEdit className="h-3 w-3" />
                  {isDraft ? "Edit" : "Studio"}
                </button>
              ) : null}
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/15 flex items-center justify-center"
                aria-label="Download"
                onClick={() => onDownload(item)}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 flex items-center justify-center"
                aria-label="Delete"
                onClick={() => {
                  closeDetail();
                  onDelete(item.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-[0.16em] font-bold text-white/40">{label}</p>
      {children}
    </div>
  );
}

export const ContentCard = memo(ContentCardComponent);
