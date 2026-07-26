import { Upload, FileVideo, AlertCircle, ChevronRight } from "lucide-react";
import { useState, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { triggerHaptic } from "../../lib/vibration";
import { contentApi, putToUploadUrl } from "../../services/apiClient";
import { toast } from "sonner";

export default function ClipUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFlow = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    triggerHaptic("heavy");

    try {
      const uploadRes = await contentApi.requestUploadUrl(
        file.name,
        file.type || "application/octet-stream",
        file.size
      );

      toast.info(`Uploading ${file.name}`, {
        description: "POST /content/upload-url → binary PUT",
      });

      setProgress(30);
      await putToUploadUrl(
        uploadRes.uploadUrl,
        file,
        file.type || "application/octet-stream"
      );
      setProgress(100);

      triggerHaptic("success");
      toast.success("Upload complete", {
        description: `contentId: ${uploadRes.contentId}`,
      });
      setTimeout(() => {
        navigate(
          `/create/clip/${uploadRes.contentId || uploadRes.assetId}/edit?step=trim`
        );
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed", {
        description: Array.isArray(err?.message)
          ? err.message.join(", ")
          : err?.message || "An error occurred while uploading gameplay.",
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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-0">
      <div className="mb-8 md:mb-12">
        <h2 className="ui-title text-2xl md:text-3xl mb-4">Upload your gameplay</h2>
        <p className="ui-subtitle text-sm md:text-base">
          Drop your raw footage and let nxclip.ai do the magic.
        </p>
      </div>

      <div
        onDragOver={(e) => (e.preventDefault(), setIsDragging(true))}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            await handleUploadFlow(file);
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-12 md:p-20 text-center transition-all ${
          isDragging ? "border-primary bg-primary/5" : "border-border bg-card/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            {isUploading ? (
              <div className="text-sm font-bold font-mono">{progress}%</div>
            ) : (
              <Upload size={28} />
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground mb-1">
              {isUploading ? "Uploading…" : "Drop gameplay here"}
            </p>
            <p className="text-sm text-muted-foreground">
              MP4, MOV, or image assets up to plan limits
            </p>
          </div>
          <Button
            variant="brand-gradient"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <FileVideo size={16} />
            Choose file
            <ChevronRight size={16} />
          </Button>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-2">
            <AlertCircle size={12} />
            Binary PUT goes to the signed upload URL from the gateway.
          </p>
        </div>
      </div>
    </div>
  );
}
