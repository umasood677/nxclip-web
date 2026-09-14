import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { SocialPlatformIcon } from "../../components/social/SocialPlatformIcon";
import type { SocialPlatform } from "../../services/apiClient";
import { Loader2 } from "lucide-react";

type ClipPublishPreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirming: boolean;
  videoSrc?: string | null;
  title: string;
  caption: string;
  hashtags: string[];
  hook?: string;
  topText?: string;
  bottomText?: string;
  platforms: SocialPlatform[];
};

export function ClipPublishPreview({
  open,
  onOpenChange,
  onConfirm,
  confirming,
  videoSrc,
  title,
  caption,
  hashtags,
  hook,
  topText,
  bottomText,
  platforms,
}: ClipPublishPreviewProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (confirming && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg bg-card/95 border-border backdrop-blur-xl p-5 rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold">
            {t("clip_editor.polish.publish_preview.title", { defaultValue: "Review post" })}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("clip_editor.polish.publish_preview.subtitle", {
              defaultValue: "This is what goes live on your feed and selected socials.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="aspect-[9/16] w-full max-w-[140px] mx-auto rounded-xl overflow-hidden bg-muted border border-border relative">
            {videoSrc ? (
              <video src={videoSrc} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground px-2 text-center">
                {t("clip_editor.polish.publish_preview.no_preview", { defaultValue: "No preview" })}
              </div>
            )}
            {hook ? (
              <div className="absolute top-8 inset-x-1 text-center pointer-events-none">
                <span className="inline-block bg-black/70 text-yellow-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {hook}
                </span>
              </div>
            ) : null}
            {topText ? (
              <div className="absolute top-2 inset-x-1 text-center pointer-events-none">
                <span className="inline-block text-white text-[9px] font-black uppercase drop-shadow">
                  {topText}
                </span>
              </div>
            ) : null}
            {bottomText ? (
              <div className="absolute bottom-2 inset-x-1 text-center pointer-events-none">
                <span className="inline-block text-white text-[9px] font-black uppercase drop-shadow">
                  {bottomText}
                </span>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 min-w-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("clip_editor.polish.details.clip_title")}
              </p>
              <p className="text-sm font-semibold truncate">{title || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("clip_editor.polish.details.caption")}
              </p>
              <p className="text-xs whitespace-pre-wrap break-words max-h-28 overflow-y-auto">
                {caption || "—"}
              </p>
            </div>
            {hashtags.length ? (
              <div className="flex flex-wrap gap-1">
                {hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {hook ? (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">
                  {t("clip_editor.polish.publish_preview.hook", { defaultValue: "Hook" })}:{" "}
                </span>
                {hook}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              {platforms.length ? (
                platforms.map((platform) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground"
                  >
                    <SocialPlatformIcon platform={platform} size={12} variant="mono" />
                    {platform}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {t("clip_editor.polish.publish_preview.feed_only", {
                    defaultValue: "NxClip feed only — no social accounts selected.",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
            className="text-xs font-semibold rounded-xl"
          >
            {t("clip_editor.overlays.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirming}
            className="text-xs font-bold rounded-xl"
          >
            {confirming ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                {t("clip_editor.polish.publish_preview.publishing", { defaultValue: "Publishing..." })}
              </>
            ) : (
              t("clip_editor.polish.publish_preview.confirm", { defaultValue: "Publish now" })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
