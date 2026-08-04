import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FileEdit,
  AlertCircle,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useTranslation();
  const safeStatus = (status || "draft").toLowerCase();

  const variants: Record<string, string> = {
    published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    publishing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    processing: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    draft: "bg-amber-400/25 text-amber-300 border-amber-400/50",
    reference: "bg-violet-500/25 text-violet-300 border-violet-400/50",
    generation_failed: "bg-red-500/15 text-red-400 border-red-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    moderation_rejected: "bg-destructive/10 text-destructive border-destructive/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    deleted: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  const icons: Record<string, React.ReactNode> = {
    published: <CheckCircle2 size={12} />,
    publishing: <Loader2 size={12} className="animate-spin" />,
    processing: <Clock size={12} />,
    draft: <FileEdit size={12} />,
    reference: <ImagePlus size={12} />,
    generation_failed: <AlertCircle size={12} />,
    failed: <AlertCircle size={12} />,
    moderation_rejected: <XCircle size={12} />,
    rejected: <XCircle size={12} />,
    deleted: <Trash2 size={12} />,
  };

  const defaultLabelMap: Record<string, string> = {
    published: "Published",
    publishing: "Publishing",
    processing: "Processing",
    draft: "Draft",
    reference: "Reference",
    generation_failed: "Generation Failed",
    failed: "Failed",
    moderation_rejected: "Moderation Rejected",
    rejected: "Rejected",
    deleted: "Deleted",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-bold uppercase tracking-widest text-[10px] px-3 py-1 shrink-0",
        variants[safeStatus] || "bg-muted/50 text-muted-foreground border-border",
      )}
    >
      {icons[safeStatus] || <Clock size={12} />}
      {t(`content_library.status.${safeStatus}`, {
        defaultValue: defaultLabelMap[safeStatus] || safeStatus,
      })}
    </Badge>
  );
};
