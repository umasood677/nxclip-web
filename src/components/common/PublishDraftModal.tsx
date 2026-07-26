import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileEdit, 
  UploadCloud, 
  Loader2, 
  Sparkles,
  ArrowRight,
  ImageIcon,
  Type,
  FileText
} from "lucide-react";
import { contentApi, extractValidImageUrl, ContentDto } from "../../services/apiClient";
import { toast } from "sonner";

export interface DraftValidationResult {
  hasTitle: boolean;
  hasMedia: boolean;
  hasCaption: boolean;
  missingItems: string[];
  isReady: boolean;
  titleVal: string;
  captionVal: string;
  mediaUrl: string;
}

export function validateDraftForPublish(item: any): DraftValidationResult {
  if (!item) {
    return {
      hasTitle: false,
      hasMedia: false,
      hasCaption: false,
      missingItems: ["Post Title", "Media Asset (Image)", "Caption / Description"],
      isReady: false,
      titleVal: "",
      captionVal: "",
      mediaUrl: "",
    };
  }

  const titleVal = (item.title || item.content || item.prompt || "").toString().trim();
  const captionVal = (item.caption || item.description || "").toString().trim();
  const rawMedia = extractValidImageUrl(item) || item.imageUrl || item.thumbnailUrl || item.mediaUrl || item.image || "";
  const mediaUrl = typeof rawMedia === "string" ? rawMedia.trim() : "";

  const hasTitle = Boolean(titleVal && titleVal.length > 0 && titleVal !== "Draft Creation");
  const hasMedia = Boolean(mediaUrl && mediaUrl.length > 5);
  const hasCaption = Boolean(captionVal && captionVal.length > 0);

  const missingItems: string[] = [];
  if (!hasTitle) missingItems.push("Post Title");
  if (!hasMedia) missingItems.push("Image / Visual Asset");
  if (!hasCaption) missingItems.push("Caption or Description");

  return {
    hasTitle,
    hasMedia,
    hasCaption,
    missingItems,
    isReady: hasTitle && hasMedia && hasCaption,
    titleVal,
    captionVal,
    mediaUrl,
  };
}

interface PublishDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | ContentDto | null;
  onPublishSuccess?: (publishedId: string) => void;
}

export const PublishDraftModal: React.FC<PublishDraftModalProps> = ({
  isOpen,
  onClose,
  item,
  onPublishSuccess,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);

  if (!item) return null;

  const validation = validateDraftForPublish(item);

  const handleEditDraft = () => {
    onClose();
    navigate("/create/image", {
      state: {
        draftId: item.id,
        title: validation.titleVal,
        prompt: validation.titleVal || validation.captionVal,
        imageUrl: validation.mediaUrl,
        description: validation.captionVal,
        caption: validation.captionVal,
        mode: item.contentType === "meme" ? "meme" : "image",
        item,
      },
    });
    toast.info("Navigating to Image Studio to complete draft...");
  };

  const handleDirectPublish = async () => {
    if (!item.id) return;
    setIsPublishing(true);
    try {
      await contentApi.publish(item.id, {
        title: validation.titleVal,
        caption: validation.captionVal,
        description: validation.captionVal,
      });

      toast.success("Draft published successfully! Your post is now live on the feed.");
      if (onPublishSuccess) {
        onPublishSuccess(item.id);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to publish draft:", err);
      toast.error("Publishing Failed", {
        description: err?.message || "Could not publish draft at this time.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/95 border-border backdrop-blur-xl shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            {validation.isReady ? (
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <UploadCloud size={20} />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={20} />
              </div>
            )}
            <DialogTitle className="text-lg font-bold text-foreground">
              {validation.isReady
                ? "Publish Draft to Creator Feed"
                : "Draft Incomplete for Publishing"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {validation.isReady
              ? "All required fields are completed! Confirm publishing to make this post live."
              : "Before publishing to feed, please make sure all required items below are complete."}
          </DialogDescription>
        </DialogHeader>

        {/* Requirements Checklist */}
        <div className="my-4 space-y-2.5">
          <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Publish Requirements Checklist
          </p>

          <div className="space-y-2 text-xs">
            {/* Title Check */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              validation.hasTitle 
                ? "bg-emerald-500/5 border-emerald-500/20 text-foreground" 
                : "bg-rose-500/5 border-rose-500/20 text-foreground"
            }`}>
              <div className="flex items-center gap-2.5">
                <Type size={15} className={validation.hasTitle ? "text-emerald-400" : "text-rose-400"} />
                <div>
                  <p className="font-bold">Post Title / Name</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                    {validation.hasTitle ? validation.titleVal : "Missing post title"}
                  </p>
                </div>
              </div>
              {validation.hasTitle ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-bold">
                  Required
                </Badge>
              )}
            </div>

            {/* Media Asset Check */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              validation.hasMedia 
                ? "bg-emerald-500/5 border-emerald-500/20 text-foreground" 
                : "bg-rose-500/5 border-rose-500/20 text-foreground"
            }`}>
              <div className="flex items-center gap-2.5">
                <ImageIcon size={15} className={validation.hasMedia ? "text-emerald-400" : "text-rose-400"} />
                <div>
                  <p className="font-bold">Image / Visual Asset</p>
                  <p className="text-[11px] text-muted-foreground">
                    {validation.hasMedia ? "Image asset attached & ready" : "No image generated or uploaded"}
                  </p>
                </div>
              </div>
              {validation.hasMedia ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-bold">
                  Required
                </Badge>
              )}
            </div>

            {/* Caption / Description Check */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              validation.hasCaption 
                ? "bg-emerald-500/5 border-emerald-500/20 text-foreground" 
                : "bg-rose-500/5 border-rose-500/20 text-foreground"
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText size={15} className={validation.hasCaption ? "text-emerald-400" : "text-rose-400"} />
                <div>
                  <p className="font-bold">Caption or Description</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                    {validation.hasCaption ? validation.captionVal : "Missing caption/description"}
                  </p>
                </div>
              </div>
              {validation.hasCaption ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-bold">
                  Required
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warning or Success Message Box */}
        {!validation.isReady ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200/90 text-xs flex items-start gap-2.5 mb-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Action Needed</p>
              <p className="text-[11px] text-amber-200/80 leading-normal mt-0.5">
                You can complete the missing items by editing this draft in Image Studio. Click below to edit and finish.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200/90 text-xs flex items-start gap-2.5 mb-2">
            <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Ready for Live Feed</p>
              <p className="text-[11px] text-emerald-200/80 leading-normal mt-0.5">
                All checks passed! Publishing will make this draft visible to your audience.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isPublishing} 
            className="text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>

          {!validation.isReady ? (
            <Button
              variant="brand-gradient"
              onClick={handleEditDraft}
              className="gap-2 text-xs font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              <FileEdit size={14} />
              Edit Draft in Studio
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              variant="brand-gradient"
              onClick={handleDirectPublish}
              disabled={isPublishing}
              className="gap-2 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20"
            >
              {isPublishing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  Publish Post Now
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
