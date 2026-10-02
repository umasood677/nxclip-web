/**
 * Manual override panel for Event Highlight compose timelines.
 */
import { Film, GripVertical, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { contentApi } from "../../services/apiClient";

export type ComposeSourceRow = {
  contentId: string;
  storageKey?: string;
  label?: string;
  order: number;
  inMs: number;
  outMs: number;
};

export type ComposeTransitionRow = {
  afterIndex: number;
  type: "cut" | "crossfade" | "flash";
  durationMs?: number;
  sfxId?: string;
};

const SFX_OPTIONS = [
  "whoosh_soft",
  "whoosh_hard",
  "impact_hit",
  "flash_pop",
  "riser_short",
  "cut_click",
] as const;

type Props = {
  contentId: string;
  sources: ComposeSourceRow[];
  transitions: ComposeTransitionRow[];
  onUpdated: (next: {
    sources: ComposeSourceRow[];
    transitions: ComposeTransitionRow[];
    title?: string;
  }) => void;
};

export function ComposeTimelinePanel({ contentId, sources, transitions, onUpdated }: Props) {
  const [rows, setRows] = useState(sources);
  const [xfades, setXfades] = useState(transitions);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  const totalSec = useMemo(
    () => rows.reduce((acc, r) => acc + Math.max(0, r.outMs - r.inMs), 0) / 1000,
    [rows],
  );

  const saveManual = async () => {
    setBusy(true);
    try {
      const updated = await contentApi.updateComposeSources(contentId, {
        sources: rows.map((r, i) => ({ ...r, order: i })),
        transitions: xfades,
      });
      const compose = (updated.clipEditSpec as any)?.compose;
      onUpdated({
        sources: compose?.sources ?? rows,
        transitions: compose?.transitions ?? xfades,
        title: updated.title,
      });
      toast.success("Compose timeline saved");
    } catch (err: any) {
      toast.error("Could not save compose", {
        description: err?.message || "Try again",
      });
    } finally {
      setBusy(false);
    }
  };

  const runAiArrange = async () => {
    setBusy(true);
    try {
      await contentApi.updateComposeSources(contentId, {
        sources: rows.map((r, i) => ({ ...r, order: i })),
        transitions: xfades,
      });
      const updated = await contentApi.analyzeCompose(contentId, {
        brief: brief.trim() || undefined,
      });
      const compose = (updated.clipEditSpec as any)?.compose;
      if (compose?.sources) setRows(compose.sources);
      if (compose?.transitions) setXfades(compose.transitions);
      onUpdated({
        sources: compose?.sources ?? rows,
        transitions: compose?.transitions ?? xfades,
        title: updated.title,
      });
      toast.success("AI Arrange applied — edit freely then render");
    } catch (err: any) {
      toast.error("AI Arrange failed", {
        description: err?.message || "Heuristic may still be available after retry",
      });
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    setRows(next.map((r, i) => ({ ...r, order: i })));
  };

  return (
    <div className="space-y-4 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Film className="h-4 w-4 text-orange-600" />
            Event Highlight timeline
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            ~{totalSec.toFixed(1)}s across {rows.length} clips. Reorder / trim / transitions, then
            AI Arrange or Render.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li
            key={row.contentId}
            className="rounded-lg border bg-background/80 p-2 flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono text-muted-foreground">{index + 1}</span>
              <Input
                className="h-8"
                value={row.label ?? ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...row, label: e.target.value };
                  setRows(next);
                }}
                placeholder={`Clip ${index + 1}`}
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                in
                <Input
                  className="h-8 w-20"
                  type="number"
                  value={Math.round(row.inMs)}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, inMs: Math.max(0, Number(e.target.value) || 0) };
                    setRows(next);
                  }}
                />
              </label>
              <label className="flex items-center gap-1">
                out
                <Input
                  className="h-8 w-20"
                  type="number"
                  value={Math.round(row.outMs)}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = {
                      ...row,
                      outMs: Math.max(row.inMs + 500, Number(e.target.value) || row.inMs + 500),
                    };
                    setRows(next);
                  }}
                />
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(index, -1)}>
                ↑
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(index, 1)}>
                ↓
              </Button>
              {rows.length > 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRows(rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, order: i })))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-xs font-medium">Transitions</p>
        {xfades.map((t, index) => (
          <div key={`${t.afterIndex}-${index}`} className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-muted-foreground">After clip {t.afterIndex + 1}</span>
            <Select
              value={t.type}
              onValueChange={(v) => {
                const next = [...xfades];
                next[index] = { ...t, type: v as ComposeTransitionRow["type"] };
                setXfades(next);
              }}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cut">Cut</SelectItem>
                <SelectItem value="crossfade">Crossfade</SelectItem>
                <SelectItem value="flash">Flash</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={t.sfxId || "whoosh_soft"}
              onValueChange={(v) => {
                const next = [...xfades];
                next[index] = { ...t, sfxId: v };
                setXfades(next);
              }}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SFX_OPTIONS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <Input
        placeholder="Event brief for AI Arrange (optional)"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={saveManual}>
          Save manual edits
        </Button>
        <Button type="button" disabled={busy} onClick={runAiArrange} className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Arrange
        </Button>
      </div>
    </div>
  );
}
