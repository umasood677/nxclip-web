/**
 * Event Highlight Composer — upload 2–8 event clips, AI-arrange, open Clip Editor.
 */
import { Upload, Film, Sparkles, AlertCircle } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { contentApi, putToUploadUrl } from "../../services/apiClient";
import { triggerHaptic } from "../../lib/vibration";
import { useAppSelector } from "../../store/hooks";
import { selectAuthProfile } from "../../store/slices/authSlice";

type Aspect = "9:16" | "16:9";
type Preset = "teaser" | "reel";

export default function EventHighlight() {
  const navigate = useNavigate();
  const profile = useAppSelector(selectAuthProfile);
  const plan = (profile?.plan || "FREE").toUpperCase();
  const planOk = plan === "PRO" || plan === "STUDIO";

  const [files, setFiles] = useState<File[]>([]);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [preset, setPreset] = useState<Preset>("reel");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = planOk && files.length >= 2 && files.length <= 8 && !busy;

  const hint = useMemo(() => {
    if (!planOk) return "Event Highlight requires PRO or STUDIO.";
    if (files.length < 2) return "Add 2–8 event video clips.";
    if (files.length > 8) return "Maximum 8 clips.";
    return preset === "teaser"
      ? "Teaser preset targets up to ~3 minutes."
      : "Highlight reel targets up to ~15 minutes.";
  }, [planOk, files.length, preset]);

  const onPick = (list: FileList | null) => {
    if (!list?.length) return;
    const videos = Array.from(list).filter(
      (f) => f.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(f.name),
    );
    setFiles((prev) => [...prev, ...videos].slice(0, 8));
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setProgress(5);
    triggerHaptic("heavy");
    try {
      const sourceContentIds: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const uploadRes = await contentApi.requestUploadUrl(
          file.name,
          file.type || "video/mp4",
          file.size,
        );
        await putToUploadUrl(uploadRes.uploadUrl, file, file.type || "video/mp4");
        const contentId = uploadRes.contentId || uploadRes.assetId;
        try {
          await contentApi.confirmUpload(contentId);
        } catch {
          /* non-fatal */
        }
        sourceContentIds.push(contentId);
        setProgress(10 + Math.round(((i + 1) / files.length) * 50));
      }

      const compose = await contentApi.createCompose({
        sourceContentIds,
        aspect,
        preset,
        title: brief.trim() ? brief.trim().slice(0, 80) : "Event highlight",
      });
      setProgress(75);

      try {
        await contentApi.analyzeCompose(compose.id, { brief: brief.trim() || undefined });
      } catch (err) {
        console.warn("analyzeCompose", err);
        toast.message("Compose ready — AI arrange skipped; edit manually.");
      }
      setProgress(100);
      triggerHaptic("success");
      toast.success("Event highlight draft ready");
      navigate(`/create/clip/${compose.id}/edit?step=polish&compose=1`);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not create event highlight", {
        description: Array.isArray(err?.message)
          ? err.message.join(", ")
          : err?.message || "Upload or compose failed",
      });
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link to="/create" className="underline-offset-2 hover:underline">
            Create
          </Link>{" "}
          / Event Highlight
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Film className="h-6 w-6 text-teal-600" />
          Event Highlight Composer
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload 2–8 event clips. NxClip suggests order, transitions, and hooks — you keep full
          manual control in Clip Editor before render and publish.
        </p>
      </div>

      {!planOk && (
        <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>{hint}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm space-y-1">
          <span className="font-medium">Aspect</span>
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={aspect}
            onChange={(e) => setAspect(e.target.value as Aspect)}
          >
            <option value="9:16">9:16 vertical (social)</option>
            <option value="16:9">16:9 landscape (event reel)</option>
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="font-medium">Preset</span>
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
          >
            <option value="teaser">Teaser (~3 min)</option>
            <option value="reel">Highlight reel (~15 min)</option>
          </select>
        </label>
      </div>

      <label className="text-sm space-y-1 block">
        <span className="font-medium">Event brief (optional)</span>
        <textarea
          className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2"
          placeholder="e.g. Annual summit day 1 — keynote, networking, awards"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={2000}
        />
      </label>

      <div
        className="rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 p-6 text-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onPick(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-teal-600 mb-2" />
        <p className="text-sm font-medium">Drop videos or click to add</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => onPick(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
              <span className="truncate">
                {i + 1}. {f.name}
              </span>
              <button
                type="button"
                className="text-xs text-destructive"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <Button className="w-full gap-2" disabled={!canSubmit} onClick={handleCreate}>
        <Sparkles className="h-4 w-4" />
        {busy ? "Building highlight…" : "Create & AI Arrange"}
      </Button>
    </div>
  );
}
