import React from "react";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Loader2, 
  FileEdit, 
  AlertCircle, 
  Trash2 
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
    published: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    publishing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    processing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    generation_failed: "bg-red-500/10 text-red-500 border-red-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
    moderation_rejected: "bg-destructive/10 text-destructive border-destructive/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    deleted: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  const icons: Record<string, React.ReactNode> = {
    published: <CheckCircle2 size={12} />,
    publishing: <Loader2 size={12} className="animate-spin" />,
    processing: <Clock size={12} />,
    draft: <FileEdit size={12} />,
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
        variants[safeStatus] || "bg-muted/50 text-muted-foreground border-border"
      )}
    >
      {icons[safeStatus] || <Clock size={12} />}
      {t(`content_library.status.${safeStatus}`, { defaultValue: defaultLabelMap[safeStatus] || safeStatus })}
    </Badge>
  );
};
