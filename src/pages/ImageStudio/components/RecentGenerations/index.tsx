import React from "react";
import { useTranslation } from "react-i18next";
import { History, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";
import { GenerationHistoryItem } from "../../types";
import { GenerationMasonry } from "./GenerationMasonry";

export interface RecentGenerationsGalleryProps {
  items: GenerationHistoryItem[];
  onReuse: (item: GenerationHistoryItem) => void;
  onDownload: (url: string) => void;
  onOpen: (item: GenerationHistoryItem) => void;
  onClearAll?: () => void;
  onGenerateFirst?: () => void;
  className?: string;
}

export function RecentGenerationsGallery({
  items,
  onReuse,
  onDownload,
  onOpen,
  onClearAll,
  onGenerateFirst,
  className,
}: RecentGenerationsGalleryProps) {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        "rounded-[24px] border border-border/50 bg-card/30 backdrop-blur-md shadow-xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-5 border-b border-border/40">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <History size={22} />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-display font-bold text-foreground truncate">
              {t("image_studio.history.title", { defaultValue: "Recent Generations" })}
            </h4>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
              {t("image_studio.history.studio_history", { defaultValue: "Studio history" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {items.length > 0 ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
              {t("image_studio.history.items_count", {
                count: items.length,
                defaultValue: `${items.length} ${items.length === 1 ? "item" : "items"}`,
              })}
            </span>
          ) : null}
          {items.length > 0 && onClearAll ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 uppercase tracking-wider"
            >
              {t("image_studio.history.clear_all", { defaultValue: "Clear All" })}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8">
        {items.length === 0 ? (
          <div className="py-16 md:py-20 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-[24px] bg-muted/10 px-6 text-center">
            <div className="relative w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-5">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary/70" />
            </div>
            <h5 className="text-sm font-bold text-foreground mb-1">No generations yet</h5>
            <p className="text-xs text-muted-foreground max-w-sm mb-5">
              Generate your first image above. Reference uploads stay out of this gallery.
            </p>
            {onGenerateFirst ? (
              <Button variant="brand-gradient" size="sm" className="gap-2 font-bold" onClick={onGenerateFirst}>
                <Sparkles className="h-3.5 w-3.5" />
                Generate your first image
              </Button>
            ) : null}
          </div>
        ) : (
          <GenerationMasonry
            items={items}
            onReuse={onReuse}
            onDownload={onDownload}
            onOpen={onOpen}
          />
        )}
      </div>
    </section>
  );
}
