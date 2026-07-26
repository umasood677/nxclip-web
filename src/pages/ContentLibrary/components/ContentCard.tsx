import React from "react";
import { 
  MoreVertical, 
  Eye, 
  Calendar, 
  Image as ImageIcon, 
  Video, 
  Clapperboard, 
  ExternalLink, 
  Download, 
  Trash2,
  FileEdit,
  UploadCloud,
  Check
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContentDto, extractValidImageUrl } from "../../../services/apiClient";
import { AuthenticatedImage } from "../../../components/AuthenticatedImage";
import { StatusBadge } from "./StatusBadge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

interface ContentCardProps {
  item: ContentDto;
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

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onViewDetails,
  onDownload,
  onDelete,
  onEdit,
  onPublish,
  isRtl = false,
  priority,
  index,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const { t } = useTranslation();
  const isPriority = priority ?? (typeof index === "number" && index < 4);
  const thumb =
    extractValidImageUrl(item) ||
    (item.id ? `/content/${item.id}/media` : "") ||
    "";
  const type = (item.contentType || (item as unknown as Record<string, unknown>).type || "image") as string;
  const statusLabel = ((item.status as string) || "draft").replace(/_/g, " ");

  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
    } else {
      onViewDetails(item.id);
    }
  };

  let formattedDate = "-";
  try {
    const dateVal = item.createdAt;
    if (dateVal) {
      const d = new Date(dateVal as string);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString();
      }
    }
  } catch {
    formattedDate = "-";
  }

  const renderTypeBadge = () => {
    switch (type) {
      case "clip":
      case "video":
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
            <Video size={12} className="text-primary" />
            <span>{t("content_library.types.clip", { defaultValue: "Clip" })}</span>
          </div>
        );
      case "meme":
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
            <Clapperboard size={12} className="text-amber-400" />
            <span>{t("content_library.types.meme", { defaultValue: "Meme" })}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
            <ImageIcon size={12} className="text-blue-400" />
            <span>{t("content_library.types.image", { defaultValue: "Image" })}</span>
          </div>
        );
    }
  };

  return (
    <div 
      className={cn(
        "group relative bg-card/60 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300 flex flex-col justify-between",
        isSelected 
          ? "border-primary ring-1 ring-primary shadow-xl shadow-primary/20" 
          : "border-white/10 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
      )}
    >
      {/* Selection Checkbox (Visible on hover or when in selection mode) */}
      <div 
        className={cn(
          "absolute top-3 left-3 z-30 transition-all duration-200",
          isSelectionMode || isSelected ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSelect) onToggleSelect();
          }}
          className={cn(
            "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
            isSelected 
              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "bg-black/40 backdrop-blur-md border-white/20 hover:border-primary/50 text-white"
          )}
        >
          {isSelected && <Check size={14} strokeWidth={4} />}
        </button>
      </div>

      {/* Thumbnail Header */}
      <div 
        className="relative aspect-video w-full bg-zinc-900 overflow-hidden cursor-pointer group/thumb"
        onClick={handleCardClick}
      >
        <AuthenticatedImage
          src={thumb}
          alt={item.title || item.caption || "Content Preview"}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            !isSelected && "group-hover/thumb:scale-105",
            isSelected && "scale-105 opacity-80"
          )}
          priority={isPriority}
          referrerPolicy="no-referrer"
        />
        
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            {renderTypeBadge()}
          </div>
          <div className="pointer-events-auto">
            <StatusBadge status={(item.status as string) || "draft"} />
          </div>
        </div>

        {/* Hover Quick View Overlay (Only if not in selection mode) */}
        {!isSelectionMode && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px] p-2">
            {item.status === "draft" && onEdit ? (
              <Button 
                size="sm" 
                variant="brand-gradient" 
                className="gap-1.5 text-xs font-bold shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
              >
                <FileEdit size={14} />
                {t("content_library.actions.edit_draft", { defaultValue: "Edit Draft" })}
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="secondary" 
                className="gap-1.5 text-xs font-bold shadow-lg bg-white/90 text-zinc-900 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(item.id);
                }}
              >
                <Eye size={14} />
                {t("content_library.actions.view_details", { defaultValue: "View Details" })}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between" onClick={handleCardClick}>
        <div>
          <h3 
            className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors cursor-pointer"
            onClick={() => onViewDetails(item.id)}
            title={item.title || item.caption || "Untitled Creation"}
          >
            {item.title || item.caption || t("common.untitled", { defaultValue: "Untitled Creation" })}
          </h3>
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-muted-foreground/70" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-muted/20 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium capitalize">
          <StatusBadge status={(item.status as string) || "draft"} />
          <span className="text-muted-foreground/80">{statusLabel}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48 ui-dialog-shell">
            {item.status === "draft" && onPublish && (
              <DropdownMenuItem 
                className="gap-2 cursor-pointer font-bold text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10" 
                onClick={() => onPublish(item)}
              >
                <UploadCloud size={14} /> 
                {t("content_library.actions.publish_to_feed", { defaultValue: "Publish to Feed" })}
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem 
                className="gap-2 cursor-pointer font-bold text-primary focus:text-primary" 
                onClick={() => onEdit(item)}
              >
                <FileEdit size={14} /> 
                {item.status === "draft" 
                  ? t("content_library.actions.edit_draft", { defaultValue: "Edit Draft" })
                  : t("content_library.actions.edit_in_studio", { defaultValue: "Edit in Studio" })}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="gap-2 cursor-pointer font-medium" 
              onClick={() => onViewDetails(item.id)}
            >
              <ExternalLink size={14} /> 
              {t("content_library.actions.view_details", { defaultValue: "View Details" })}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="gap-2 cursor-pointer font-medium" 
              onClick={() => onDownload(item)}
            >
              <Download size={14} /> 
              {t("content_library.actions.download", { defaultValue: "Download" })}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 size={14} /> 
              {t("content_library.actions.delete", { defaultValue: "Delete" })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
