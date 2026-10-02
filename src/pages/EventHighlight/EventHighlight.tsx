/**
 * AI Story Engine — multi-clip narrative assembly (short/long × 9:16/16:9).
 */
import {
  Upload,
  Sparkles,
  AlertCircle,
  Film,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { contentApi, putToUploadUrl, type ContentDto } from "../../services/apiClient";
import { triggerHaptic } from "../../lib/vibration";
import { useAppSelector } from "../../store/hooks";
import { selectAuthProfile } from "../../store/slices/authSlice";

type Aspect = "9:16" | "16:9";
type FormatLength = "short" | "long";
type CtaGoal = "follow" | "comment" | "save" | "visit_link" | "watch_full";

const NICHE_FALLBACKS = [
  "Gaming",
  "Travel",
  "Food and Cooking",
  "Fitness",
  "Beauty",
  "Education",
  "Lifestyle",
  "Event",
  "Sports",
  "Digital Creator",
] as const;

const CTA_OPTIONS: { id: CtaGoal; label: string }[] = [
  { id: "follow", label: "Follow me" },
  { id: "comment", label: "Comment below" },
  { id: "save", label: "Save this" },
  { id: "visit_link", label: "Visit my link" },
  { id: "watch_full", label: "Watch the full video" },
];

function readStoryPlan(content: ContentDto): any {
  const compose = (content.clipEditSpec as any)?.compose;
  return compose?.storyPlan ?? null;
}

export default function EventHighlight() {
  const navigate = useNavigate();
  const profile = useAppSelector(selectAuthProfile);
  const plan = (profile?.plan || "FREE").toUpperCase();
  const maxClips = plan === "FREE" ? 5 : 20;
  const planOk = true;

  const profileCategory =
    (profile as any)?.creatorCategoryLabel ||
    (profile as any)?.creatorCategory ||
    "";
  const profileNiches: string[] = Array.isArray((profile as any)?.creatorNiches)
    ? (profile as any).creatorNiches
    : [];

  const [files, setFiles] = useState<File[]>([]);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [formatLength, setFormatLength] = useState<FormatLength>("short");
  const [context, setContext] = useState("");
  const [ctaGoal, setCtaGoal] = useState<CtaGoal>("save");
  const [fallbackNiche, setFallbackNiche] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<
    "upload" | "analysing" | "plan"
  >("upload");
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [draft, setDraft] = useState<ContentDto | null>(null);
  const [selectedHookId, setSelectedHookId] = useState<string>("hook_a");
  const inputRef = useRef<HTMLInputElement>(null);

  const creatorCategory = profileCategory || fallbackNiche || undefined;
  const niches = profileNiches.length
    ? profileNiches
    : fallbackNiche
      ? [fallbackNiche]
      : undefined;

  const canSubmit =
    planOk &&
    files.length >= 2 &&
    files.length <= maxClips &&
    !busy &&
    context.trim().length > 0;

  const hint = useMemo(() => {
    if (files.length < 2) return `Add 2–${maxClips} clips from the same experience.`;
    if (files.length > maxClips) return `Maximum ${maxClips} clips on ${plan}.`;
    if (!context.trim()) return "Tell us what this content is about.";
    return formatLength === "short"
      ? "Short form — up to ~3 minutes."
      : "Long form — up to ~15 minutes.";
  }, [files.length, maxClips, plan, context, formatLength]);

  const onPick = (list: FileList | null) => {
    if (!list?.length) return;
    const videos = Array.from(list).filter(
      (f) =>
        f.type.startsWith("video/") ||
        /\.(mp4|mov|webm|m4v|avi)$/i.test(f.name),
    );
    setFiles((prev) => [...prev, ...videos].slice(0, maxClips));
  };

  const storyPlan = draft ? readStoryPlan(draft) : null;

  const handleAnalyse = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setPhase("analysing");
    setStatusLines([`Uploading ${files.length} clips…`]);
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
        setStatusLines([
          `✓  ${i + 1}/${files.length} clips uploaded`,
          "⟳  Preparing story session…",
        ]);
      }

      setStatusLines((s) => [...s.filter((x) => x.startsWith("✓")), "⟳  Creating story draft…"]);
      const compose = await contentApi.createCompose({
        sourceContentIds,
        aspect,
        formatLength,
        preset: formatLength,
        title: context.trim().slice(0, 80),
        context: context.trim(),
        ctaGoal,
        creatorCategory,
        niches,
      });

      setStatusLines([
        `✓  All ${files.length} clips uploaded`,
        "⟳  Reading each clip for moments and energy…",
        "⟳  Understanding your story…",
        "⟳  Building narrative order…",
        "⟳  Writing hook and captions…",
      ]);

      let analysed = compose;
      try {
        analysed = await contentApi.analyzeCompose(compose.id, {
          brief: context.trim(),
          context: context.trim(),
          ctaGoal,
        });
      } catch (err) {
        console.warn("analyzeCompose", err);
        toast.message("Story draft ready — AI plan used heuristics; you can still edit.");
      }

      const planData = readStoryPlan(analysed);
      setDraft(analysed);
      setSelectedHookId(planData?.selectedHookId || planData?.hookOptions?.[0]?.id || "hook_a");
      setPhase("plan");
      triggerHaptic("success");
      toast.success("Story plan ready");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not build story", {
        description: Array.isArray(err?.message)
          ? err.message.join(", ")
          : err?.message || "Upload or analyse failed",
      });
      setPhase("upload");
    } finally {
      setBusy(false);
    }
  };

  const handleProduce = async () => {
    if (!draft?.id) return;
    setBusy(true);
    try {
      if (selectedHookId && selectedHookId !== storyPlan?.selectedHookId) {
        await contentApi.analyzeCompose(draft.id, {
          brief: context.trim() || undefined,
          context: context.trim() || undefined,
          ctaGoal,
          selectedHookId,
        });
      }
      triggerHaptic("success");
      toast.success("Opening editor to produce");
      navigate(`/create/clip/${draft.id}/edit?step=polish&compose=1`);
    } catch (err: any) {
      toast.error("Could not open produce", {
        description: err?.message || "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  const mechanismLabel = (m: string) => {
    if (m === "bold_statement") return "Bold Statement";
    if (m === "engagement_prompt") return "Engagement Prompt";
    return "Curiosity Gap";
  };

  if (phase === "analysing") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 space-y-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-600" />
        <h1 className="text-xl font-semibold">Analysing your clips</h1>
        <ul className="text-left text-sm space-y-2 mx-auto max-w-sm">
          {statusLines.map((line) => (
            <li key={line} className="text-muted-foreground">
              {line}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Usually takes 60–90 seconds</p>
      </div>
    );
  }

  if (phase === "plan" && draft) {
    const metrics = storyPlan?.metrics;
    const hooks = storyPlan?.hookOptions ?? [];
    const acts = storyPlan?.acts ?? [];
    const unused = storyPlan?.unusedClips ?? [];

    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link to="/create" className="underline-offset-2 hover:underline">
              Create
            </Link>{" "}
            / AI Story Engine
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Story Plan</h1>
          {metrics && (
            <p className="text-xs text-muted-foreground">
              {metrics.durationSec != null ? `${metrics.durationSec}s` : "—"} ·{" "}
              {formatLength === "short" ? "Short" : "Long"} · {aspect}
              {metrics.actCount != null ? ` · ${metrics.actCount} acts` : ""}
              {metrics.engagementEstimate
                ? ` · Est. engagement: ${metrics.engagementEstimate}`
                : ""}
              {metrics.platformFit ? ` · ${metrics.platformFit}` : ""}
            </p>
          )}
        </div>

        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold">Story summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {storyPlan?.storySummary ||
              draft.description ||
              "Your clips are ready to assemble into one story."}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Hook selection</h2>
          <div className="space-y-2">
            {hooks.map((h: any) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHookId(h.id)}
                className={`w-full text-left rounded-lg border p-3 text-sm transition ${
                  selectedHookId === h.id
                    ? "border-orange-500 bg-orange-500/10"
                    : "hover:border-orange-500/40"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  {mechanismLabel(h.mechanism)}
                </span>
                <p className="font-medium mt-0.5">{h.text}</p>
              </button>
            ))}
            {!hooks.length && (
              <p className="text-sm text-muted-foreground">Hooks will appear after analyse.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Acts</h2>
          {acts.map((act: any) => (
            <div key={act.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex justify-between gap-2 text-sm font-medium">
                <span>{act.role}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round((act.startMs || 0) / 1000)}s–{Math.round((act.endMs || 0) / 1000)}s
                </span>
              </div>
              {(act.captionLines || []).map((line: string, i: number) => (
                <p key={i} className="text-sm text-muted-foreground">
                  “{line}”
                </p>
              ))}
              {act.audioNote && (
                <p className="text-xs text-muted-foreground">Audio: {act.audioNote}</p>
              )}
            </div>
          ))}
          {!acts.length && (
            <p className="text-sm text-muted-foreground">
              Open Clip Editor to refine the timeline before produce.
            </p>
          )}
        </section>

        {unused.length > 0 && (
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {unused.length} clip{unused.length === 1 ? "" : "s"} not used
            </summary>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {unused.map((u: any) => (
                <li key={u.contentId}>
                  {u.contentId.slice(0, 8)}… — {u.reason}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => {
              setPhase("upload");
              setDraft(null);
            }}
          >
            Start over
          </Button>
          <Button
            variant="secondary"
            className="flex-1 gap-2"
            disabled={busy}
            onClick={handleAnalyse}
          >
            <Sparkles className="h-4 w-4" />
            Regenerate story
          </Button>
          <Button className="flex-1 gap-2" disabled={busy} onClick={handleProduce}>
            <CheckCircle2 className="h-4 w-4" />
            Produce this video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link to="/create" className="underline-offset-2 hover:underline">
            Create
          </Link>{" "}
          / AI Story Engine
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Film className="h-6 w-6 text-orange-600" />
          AI Story Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload your clips. Tell us the story. We’ll build a short or long video in 9:16 or 16:9 —
          with a hook, connected captions, and a CTA.
        </p>
      </div>

      {!profileCategory && (
        <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>No niche on your profile — pick one below so captions match your audience.</span>
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
            <option value="9:16">9:16 vertical</option>
            <option value="16:9">16:9 landscape</option>
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="font-medium">Length</span>
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={formatLength}
            onChange={(e) => setFormatLength(e.target.value as FormatLength)}
          >
            <option value="short">Short (up to ~3 min)</option>
            <option value="long">Long (up to ~15 min)</option>
          </select>
        </label>
      </div>

      <label className="text-sm space-y-1 block">
        <span className="font-medium">What is this content about?</span>
        <textarea
          className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2"
          placeholder="e.g. Istanbul travel reel, Tommy’s football final, Leg day workout"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          maxLength={2000}
        />
      </label>

      <fieldset className="text-sm space-y-2">
        <legend className="font-medium">What do you want viewers to do?</legend>
        <div className="flex flex-wrap gap-2">
          {CTA_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCtaGoal(opt.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                ctaGoal === opt.id
                  ? "border-orange-500 bg-orange-500/15"
                  : "hover:border-orange-500/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {!profileCategory && (
        <label className="text-sm space-y-1 block">
          <span className="font-medium">Niche</span>
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={fallbackNiche}
            onChange={(e) => setFallbackNiche(e.target.value)}
          >
            <option value="">Select niche</option>
            {NICHE_FALLBACKS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {profileCategory && (
        <p className="text-xs text-muted-foreground">
          Niche from profile: <strong>{profileCategory}</strong>
          {profileNiches.length ? ` · ${profileNiches.join(", ")}` : ""}
        </p>
      )}

      <div
        className="rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 p-6 text-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onPick(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-orange-600 mb-2" />
        <p className="text-sm font-medium">Drop clips or browse</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v,.avi"
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

      <Button className="w-full gap-2" disabled={!canSubmit} onClick={handleAnalyse}>
        <Sparkles className="h-4 w-4" />
        Analyse my clips
      </Button>
    </div>
  );
}
