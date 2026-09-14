import { Upload, FileVideo, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import { useState, useRef, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { triggerHaptic } from "../../lib/vibration";
import { contentApi, putToUploadUrl } from "../../services/apiClient";
import { toast } from "sonner";
import { StudioPlanBanner } from "../../components/StudioPlanBanner";
import { useCreatorStudioContext } from "../../hooks/useCreatorStudioContext";
import { buildStudioHrefForPlanDay, inferClipCreationPath, recordedFootagePhrase } from "../../lib/weekPlan";

export default function ClipUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    dueToday,
    categoryLabel,
    niches,
    nicheDialogOpen,
    setNicheDialogOpen,
    confirmNicheChange,
    hasWeekPlan,
    weekPlan,
    applyDuePrompt,
  } = useCreatorStudioContext("clip");

  const planDayParam = searchParams.get("planDay");
  const promptParam = searchParams.get("prompt");
  const planDayFromUrl = planDayParam
    ? weekPlan?.days.find((d) => d.day.toLowerCase() === planDayParam.toLowerCase())
    : null;
  const coachDay = planDayFromUrl || dueToday;
  const aiClipPath =
    coachDay && inferClipCreationPath(coachDay) === "image_first";
  const imageStudioHref =
    coachDay
      ? buildStudioHrefForPlanDay(coachDay, categoryLabel, niches)
      : `/create/image?prompt=${encodeURIComponent(promptParam || applyDuePrompt())}&forClip=1&ratio=9:16`;

  const handleUploadFlow = async (file: File) => {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      toast.error("Please upload a video file");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    triggerHaptic("heavy");

    try {
      const uploadRes = await contentApi.requestUploadUrl(
        file.name,
        file.type || "video/mp4",
        file.size
      );

      toast.info(`Uploading ${file.name}`, {
        description: "Signed URL → binary PUT → confirm-upload",
      });

      setProgress(35);
      await putToUploadUrl(
        uploadRes.uploadUrl,
        file,
        file.type || "video/mp4"
      );
      setProgress(75);

      const contentId = uploadRes.contentId || uploadRes.assetId;
      try {
        await contentApi.confirmUpload(contentId);
      } catch (confirmErr) {
        console.warn("confirm-upload warning", confirmErr);
        toast.message("Upload saved — confirming media…");
      }
      setProgress(100);

      triggerHaptic("success");
      toast.success("Clip ready to edit", {
        description: coachDay
          ? `Coach brief: ${coachDay.title || coachDay.theme}`
          : `contentId: ${contentId}`,
      });
      const planQs = planDayParam ? `&planDay=${encodeURIComponent(planDayParam)}` : "";
      setTimeout(() => {
        navigate(`/create/clip/${contentId}/edit?step=trim${planQs}`);
      }, 400);
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed", {
        description: Array.isArray(err?.message)
          ? err.message.join(", ")
          : err?.message || "An error occurred while uploading.",
      });
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUploadFlow(file);
    }
  };

  const nicheHint = categoryLabel
    ? `${categoryLabel}${niches.length ? ` · ${niches.slice(0, 2).join(", ")}` : ""}`
    : "your onboarded niche";
  const footagePhrase = recordedFootagePhrase(categoryLabel, niches);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-0 space-y-6">
      <StudioPlanBanner
        toolLabel="Clip Studio"
        categoryLabel={categoryLabel}
        niches={niches}
        hasWeekPlan={hasWeekPlan}
        dueToday={dueToday}
        onApplyDue={() => {
          if (dueToday) navigate(buildStudioHrefForPlanDay(dueToday, categoryLabel, niches));
        }}
        onRequestNicheChange={() => setNicheDialogOpen(true)}
        nicheDialogOpen={nicheDialogOpen}
        onNicheDialogOpenChange={setNicheDialogOpen}
        onConfirmNicheChange={confirmNicheChange}
      />

      {aiClipPath ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-bold text-foreground">
                This clip starts from a base image
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                nxClip builds most coach clips as{" "}
                <strong className="text-foreground">Image Studio → Animate → Clip Studio</strong>.
                Generate a 9:16 still with the coach prompt first, then animate it into a short for{" "}
                {nicheHint}. Only upload here if you already have {footagePhrase}.
              </p>
              {promptParam ? (
                <p className="text-[11px] text-muted-foreground/90 pt-1 line-clamp-2">
                  Coach brief: {promptParam}
                </p>
              ) : null}
            </div>
          </div>
          <Button type="button" className="w-full sm:w-auto gap-2" onClick={() => navigate(imageStudioHref)}>
            <Sparkles className="h-4 w-4" />
            Create base image in Image Studio
          </Button>
        </div>
      ) : null}

      <div className="mb-2 md:mb-4">
        <h2 className="ui-title text-2xl md:text-3xl mb-2">Upload your clip</h2>
        <p className="ui-subtitle text-sm md:text-base">
          Drop raw footage for {nicheHint}. We’ll open the editor with your real video after confirm-upload.
        </p>
        {coachDay && !aiClipPath && (
          <p className="mt-2 text-xs text-amber-200/90">
            Coach tip ({coachDay.contentType}): {coachDay.title || coachDay.theme}
          </p>
        )}
      </div>

      <div
        onDragOver={(e) => (e.preventDefault(), setIsDragging(true))}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) await handleUploadFlow(file);
        }}
        className={`relative border-2 border-dashed rounded-2xl p-10 md:p-16 text-center transition-colors ${
          isDragging ? "border-teal-400 bg-teal-500/10" : "border-border/60 bg-muted/10"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <FileVideo className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm font-semibold mb-1">Drag & drop a video</p>
        <p className="text-xs text-muted-foreground mb-4">
          MP4, MOV, or WebM — for {footagePhrase} or other pre-recorded video
        </p>
        <Button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? `Uploading… ${progress}%` : "Choose file"}
        </Button>
        {isUploading && (
          <div className="mt-4 h-1.5 w-full max-w-xs mx-auto rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          {aiClipPath
            ? "Upload is optional for AI-generated clips. Use Image Studio first unless you have your own video file."
            : "Free plans may watermark rendered exports. After upload you’ll trim, polish, and publish in Clip Studio."}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="gap-1 text-xs"
        asChild
      >
        <Link to="/create">
          Back to Create Hub <ChevronRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
