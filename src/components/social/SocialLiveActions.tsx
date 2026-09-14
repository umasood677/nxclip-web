import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock, Link2, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { socialApi, type SocialPlatform } from "../../services/apiClient";
import { SocialPublishTargets } from "./SocialPublishTargets";
import { cn } from "../../lib/utils";

interface SocialLiveActionsProps {
  contentId: string;
  caption?: string;
}

type EligibilityRow = {
  platform: SocialPlatform;
  eligible?: boolean;
  reasons?: string[];
};

function localDateValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTimeValue(d = new Date()): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function statusTone(status: string): string {
  switch (status) {
    case "live":
      return "text-rose-400";
    case "scheduled":
      return "text-sky-400";
    case "publishing":
      return "text-amber-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function SocialLiveActions({ contentId, caption }: SocialLiveActionsProps) {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [busy, setBusy] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPlatform, setLinkPlatform] = useState<SocialPlatform>("youtube");
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [eligibilityByPlatform, setEligibilityByPlatform] = useState<
    Partial<Record<SocialPlatform, { eligible: boolean; reasons: string[] }>>
  >({});

  const scheduledAt = scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : "";
  const minDate = localDateValue();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const scheduleSummary = useMemo(() => {
    if (!scheduledAt) return null;
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [scheduledAt]);

  const refresh = async () => {
    const res = await socialApi.getDistributions(contentId);
    setItems(Array.isArray(res?.items) ? res.items : []);
  };

  const refreshEligibility = async () => {
    const res = await socialApi.checkEligibility(contentId);
    const rows: EligibilityRow[] = Array.isArray(res?.platforms)
      ? res.platforms
      : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
          ? res
          : [];
    const next: Partial<Record<SocialPlatform, { eligible: boolean; reasons: string[] }>> = {};
    for (const row of rows) {
      const platform = row.platform as SocialPlatform | undefined;
      if (!platform) continue;
      next[platform] = {
        eligible: row.eligible !== false,
        reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [],
      };
    }
    setEligibilityByPlatform(next);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
    void refreshEligibility().catch(() => undefined);
  }, [contentId]);

  // Poll while anything is publishing / recently queued
  useEffect(() => {
    const active = items.some((item) => {
      const status = String(item.status || "");
      return status === "publishing" || status === "queued" || status === "scheduled";
    });
    if (!active) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [contentId, items]);

  const handlePublishNow = async () => {
    if (platforms.length === 0) {
      toast.info("Select a connected platform first.");
      return;
    }
    setBusy(true);
    try {
      await socialApi.publishNow(contentId, { platforms, caption });
      toast.success("Queued Live posts. Status updates as each platform finishes.");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not post Live");
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = async () => {
    if (platforms.length === 0) {
      toast.info("Select a connected platform first.");
      return;
    }
    const date = scheduleDate || minDate;
    const time = scheduleTime || localTimeValue();
    if (!scheduleDate) setScheduleDate(date);
    if (!scheduleTime) setScheduleTime(time);
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast.info("Choose a time in the future.");
      return;
    }
    setBusy(true);
    try {
      await socialApi.schedule(contentId, {
        platforms,
        scheduledAt: when.toISOString(),
        caption,
        timezone,
      });
      toast.success("Scheduled Live auto-post.", {
        description: `Will publish around ${when.toLocaleString()} (${timezone}).`,
      });
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not schedule");
    } finally {
      setBusy(false);
    }
  };

  const handleLink = async () => {
    if (!linkUrl.trim()) return;
    setBusy(true);
    try {
      await socialApi.linkExternalPost(contentId, {
        platform: linkPlatform,
        externalUrl: linkUrl.trim(),
      });
      toast.success("Linked existing post.");
      setLinkUrl("");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not verify ownership of that URL");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id="live-on-social"
      className="ui-card p-6 border border-white/10 bg-card/60 backdrop-blur-md rounded-2xl space-y-5 scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <Radio size={16} className="text-rose-500" />
        <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
          Live on social
        </h3>
      </div>
      <SocialPublishTargets
        selected={platforms}
        onChange={setPlatforms}
        disabled={busy}
        eligibilityByPlatform={eligibilityByPlatform}
        caption="Choose connected channels, then post now or schedule auto-post. Connect accounts on Profile."
      />

      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          className="font-bold gap-1.5 h-9 w-full"
          disabled={busy}
          onClick={() => void handlePublishNow()}
        >
          <Radio size={14} />
          Post now
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={15} className="text-muted-foreground" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Schedule auto-post
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="space-y-1.5 min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Date
            </span>
            <Input
              type="date"
              min={minDate}
              className="h-9 text-xs"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="space-y-1.5 min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Time
            </span>
            <Input
              type="time"
              className="h-9 text-xs"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>
        {scheduleSummary ? (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Clock size={12} />
            {scheduleSummary} · {timezone}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Pick a future date and time. The feed worker posts automatically when due.
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="font-bold gap-1.5 h-9 w-full"
          disabled={busy}
          onClick={() => void handleSchedule()}
        >
          <CalendarClock size={14} />
          Schedule post
        </Button>
      </div>

      <div className="space-y-2 pt-1 border-t border-border/50">
        <p className="text-[11px] text-muted-foreground">
          Already posted? Paste the URL from the connected account.
        </p>
        <div className="flex gap-2">
          <select
            className="h-9 rounded-md border border-border bg-background text-[11px] px-2 shrink-0"
            value={linkPlatform}
            onChange={(e) => setLinkPlatform(e.target.value as SocialPlatform)}
            disabled={busy}
          >
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
          <Input
            className="h-9 text-[11px]"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            disabled={busy}
          />
          <Button
            size="sm"
            variant="outline"
            className="font-bold gap-1.5 h-9"
            disabled={busy}
            onClick={() => void handleLink()}
          >
            <Link2 size={14} />
            Link
          </Button>
        </div>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-[11px]">
          {items.map((item) => {
            const status = String(item.status || "unknown");
            const error = item.errorMessage ? String(item.errorMessage) : "";
            return (
              <li
                key={String(item.id || item.platform)}
                className="flex flex-col gap-0.5 text-muted-foreground"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-bold capitalize">{String(item.platform)}</span>
                  <span className={cn("font-semibold capitalize", statusTone(status))}>
                    {status}
                  </span>
                </div>
                {error ? <span className="text-red-400/90 text-[10px]">{error}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
