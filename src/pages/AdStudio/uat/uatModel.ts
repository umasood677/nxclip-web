import { AD_STUDIO_EXPERIENCE_SCREENS } from "../production/experienceRoutes";
import register from "../../../../docs/ad-studio/production/UX-PARITY-MATRIX.json";
import instructions from "./uatInstructions.json";
export const OUTCOMES = ["not-tested", "pass", "issue", "blocked"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export type Feedback = {
  outcome: Outcome;
  issue: string;
  enhancement: string;
  fix: string;
  evidence: string;
};
export type UatCheck = {
  id: string;
  screen: string;
  title: string;
  group: string;
  steps: string;
  expected: string;
  implementation: string;
  parity: string;
  paid: boolean;
};
const paidScreens = new Set([
  "concepts",
  "director",
  "visual-lab",
  "variation-lab",
  "brand-analysis",
  "motion-studio",
]);
export const UAT_CHECKS: UatCheck[] = register.screens.map((screen) => {
  const index = AD_STUDIO_EXPERIENCE_SCREENS.indexOf(
    screen.screen as (typeof AD_STUDIO_EXPERIENCE_SCREENS)[number],
  );
  const detail = instructions[screen.screen as keyof typeof instructions];
  return {
    id: `UAT-${String(index + 1).padStart(2, "0")}`,
    screen: screen.screen,
    title: detail[0],
    group: detail[1],
    steps: detail[2],
    expected: detail[3],
    implementation: screen.status,
    parity: screen.implementationState,
    paid: paidScreens.has(screen.screen),
  };
});
const extra = [
  [
    "Brand JSON import / export",
    "Setup & brands",
    "Download the compatible sample. Validate an edited copy, apply to a disposable kit draft, save and reopen. Export it again.",
    "Optional fields survive; existing uploads and permissions are not replaced or imported from URLs.",
  ],
  [
    "Default Brand isolation",
    "Campaign & concepts",
    "Create a project without a Brand Kit after opening a ZOE project.",
    "The new project does not silently inherit the previous Brand Kit.",
  ],
  [
    "Save failure & concurrent edits",
    "Campaign & concepts",
    "In disposable data, check validation errors and a stale version while editing the brief or kit.",
    "Errors retain your draft; failed saves do not trigger generation or report success.",
  ],
  [
    "Project rename & shared fields",
    "Campaign & concepts",
    "Rename a test project; update a shared audience/message field, save and reopen both brief views.",
    "The explicit rename persists and the latest campaign context is used consistently.",
  ],
  [
    "Ownership & permissions",
    "Campaign delivery",
    "Use only your own records. Check unavailable assets and consent requirements through normal application access.",
    "No cross-account asset sharing or unauthorized media access is offered; no bypass testing is needed.",
  ],
  [
    "Responsive typography & accessibility",
    "Campaign delivery",
    "Inspect at desktop 1440, tablet 768 and mobile 390 widths. Use keyboard navigation and inspect focus, loading and errors.",
    "NxClip Geist UI typography, readable contrast, visible focus and usable layouts; artwork keeps its selected brand font.",
  ],
  [
    "ZOE Golden Ad end-to-end",
    "Campaign delivery",
    "Select the existing ZOE kit, save a brief, plan concepts, initiate approved Google image generation, review, refine, open Canvas, save/reopen and export.",
    "The actual provider path and product fidelity are verified by your first live test. Record each failed stage; no overall PASS from mocks.",
  ],
  [
    "Existing workflow regression",
    "Campaign delivery",
    "Reopen a project and creative created before these changes. Check existing Canvas, preview and export controls.",
    "Previously saved records stay compatible; no duplicate editor or persistence engine is introduced.",
  ],
];
extra.forEach((v, index) =>
  UAT_CHECKS.push({
    id: `UAT-${41 + index}`,
    screen: `regression-${index + 1}`,
    title: v[0],
    group: v[1],
    steps: v[2],
    expected: v[3],
    implementation:
      "Existing production workflow; owner verification required.",
    parity: "review",
    paid: index === 6,
  }),
);
export const STORAGE_KEY = "nxclip.ad-studio.uat.v1";
export function emptyFeedback(): Feedback {
  return {
    outcome: "not-tested",
    issue: "",
    enhancement: "",
    fix: "",
    evidence: "",
  };
}
export function restoreFeedback(raw: string | null): Record<string, Feedback> {
  try {
    if (!raw || raw.length > 1200000) return {};
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return {};
    return Object.fromEntries(
      UAT_CHECKS.flatMap((check) => {
        const value = (data as Record<string, unknown>)[check.id];
        if (!value || typeof value !== "object") return [];
        const row = value as Record<string, unknown>;
        const text = (key: string) =>
          typeof row[key] === "string"
            ? (row[key] as string).slice(0, 4000)
            : "";
        return [
          [
            check.id,
            {
              outcome: OUTCOMES.includes(row.outcome as Outcome)
                ? (row.outcome as Outcome)
                : "not-tested",
              issue: text("issue"),
              enhancement: text("enhancement"),
              fix: text("fix"),
              evidence: text("evidence"),
            },
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
}
export function feedbackReport(
  feedback: Record<string, Feedback>,
  now = new Date(),
) {
  return {
    schemaVersion: 1,
    createdAt: now.toISOString(),
    scope: "Owner UAT; reported outcomes, not automated production acceptance",
    checks: UAT_CHECKS.map((check) => ({
      ...check,
      ...(feedback[check.id] || emptyFeedback()),
    })),
  };
}
export function feedbackMarkdown(feedback: Record<string, Feedback>) {
  return feedbackReport(feedback)
    .checks.map(
      (check) =>
        `## ${check.id} — ${check.title} [${check.outcome}]\nIssue: ${check.issue || "—"}\nEnhancement: ${check.enhancement || "—"}\nRequested fix: ${check.fix || "—"}\nEvidence / actual result: ${check.evidence || "—"}`,
    )
    .join("\n\n");
}

export function checkUrl(
  check: UatCheck,
  context: { projectId: string; brandId: string; creativeId: string },
): string | null {
  const valid = (value: string) =>
    /^[a-z0-9_-]{1,128}$/i.test(value) ? value : "";
  const brand = valid(context.brandId),
    project = valid(context.projectId),
    creative = valid(context.creativeId);
  if (
    check.parity === "not-integrated" &&
    !["home", "brand-manager"].includes(check.screen)
  )
    return null;
  if (check.screen === "brand-manager" || check.id === "UAT-41")
    return "/brands";
  if (check.screen.startsWith("brand-")) {
    const steps: Record<string, string> = {
      "brand-info": "brand",
      "brand-category": "category",
      "brand-goals": "goals",
      "brand-assets": "assets",
      "brand-analysis": "identity",
      "brand-guidelines": "guidelines",
      "brand-overview": "ready",
    };
    if (
      check.screen === "brand-templates" ||
      check.screen === "brand-template-detail"
    )
      return brand ? `/brands/${encodeURIComponent(brand)}/templates` : null;
    return brand
      ? `/brands/${encodeURIComponent(brand)}?step=${steps[check.screen] || "brand"}`
      : "/brands";
  }
  if (["edit", "advanced-canvas"].includes(check.screen))
    return creative ? `/create/ad/${encodeURIComponent(creative)}` : null;
  if (check.screen === "home" || check.screen.startsWith("regression-"))
    return "/create/ad";
  if (!project) return "/create/ad";
  const query = new URLSearchParams({ view: check.screen });
  if (creative) query.set("creative", creative);
  return `/create/ad/projects/${encodeURIComponent(project)}?${query}`;
}
