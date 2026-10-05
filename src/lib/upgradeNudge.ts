import { safeLocalStorage, safeSessionStorage } from "./safeStorage";

export type UpgradeNudgePlan = "free" | "pro";

const STORAGE_PREFIX = "nx_upgrade_nudge_shown_";
const SESSION_PREFIX = "nx_upgrade_nudge_session_";
/** Re-show marketing nudge at most once per week per plan tier after dismiss/CTA. */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function resolveUpgradeNudgeTarget(
  plan: string | null | undefined,
): UpgradeNudgePlan | null {
  const p = String(plan || "free").toLowerCase();
  if (p === "free") return "free";
  if (p === "pro") return "pro";
  return null;
}

/** True when Free/Pro and outside the weekly cooldown after last dismiss/CTA. */
export function shouldShowUpgradeNudge(plan: string | null | undefined): boolean {
  const target = resolveUpgradeNudgeTarget(plan);
  if (!target) return false;
  const raw = safeLocalStorage.getItem(`${STORAGE_PREFIX}${target}`);
  if (!raw) return true;
  const shownAt = Number(raw);
  if (!Number.isFinite(shownAt)) return true;
  return Date.now() - shownAt >= COOLDOWN_MS;
}

/** Once per browser session — avoids triple-inject from SideNav + TopBar + Notifications. */
export function claimUpgradeNudgeSession(plan: string | null | undefined): boolean {
  const target = resolveUpgradeNudgeTarget(plan);
  if (!target || !shouldShowUpgradeNudge(plan)) return false;
  const key = `${SESSION_PREFIX}${target}`;
  if (safeSessionStorage.getItem(key) === "1") return false;
  safeSessionStorage.setItem(key, "1");
  return true;
}

/** Call when user clicks Upgrade CTA or dismisses the nudge. */
export function markUpgradeNudgeShown(plan: string | null | undefined): void {
  const target = resolveUpgradeNudgeTarget(plan);
  if (!target) return;
  safeLocalStorage.setItem(`${STORAGE_PREFIX}${target}`, String(Date.now()));
  safeSessionStorage.setItem(`${SESSION_PREFIX}${target}`, "1");
}

export type UpgradeNudgeCopy = {
  id: string;
  title: string;
  body: string;
  cta: string;
  href: "/upgrade";
  target: UpgradeNudgePlan;
};

/** Build i18n-ready upgrade marketing copy for Free→Pro or Pro→Studio. */
export function buildUpgradeNudge(
  plan: string | null | undefined,
  t: (key: string) => string,
): UpgradeNudgeCopy | null {
  if (!shouldShowUpgradeNudge(plan)) return null;
  const target = resolveUpgradeNudgeTarget(plan);
  if (!target) return null;

  if (target === "free") {
    return {
      id: "upgrade-nudge-free",
      title: t("notifications.upgrade.free_title"),
      body: t("notifications.upgrade.free_body"),
      cta: t("notifications.upgrade.free_cta"),
      href: "/upgrade",
      target,
    };
  }

  return {
    id: "upgrade-nudge-pro",
    title: t("notifications.upgrade.pro_title"),
    body: t("notifications.upgrade.pro_body"),
    cta: t("notifications.upgrade.pro_cta"),
    href: "/upgrade",
    target,
  };
}
