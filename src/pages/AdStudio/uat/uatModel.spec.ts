import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UAT_CHECKS,
  restoreFeedback,
  emptyFeedback,
  feedbackReport,
  feedbackMarkdown,
  checkUrl,
} from "./uatModel";
import { AD_STUDIO_EXPERIENCE_SCREENS } from "../production/experienceRoutes";
test("all 40 approved screen IDs have actionable checks plus eight end-to-end regressions", () => {
  assert.equal(UAT_CHECKS.length, 48);
  assert.equal(new Set(UAT_CHECKS.map((check) => check.id)).size, 48);
  assert.deepEqual(
    UAT_CHECKS.slice(0, 40).map((check) => check.screen),
    [...AD_STUDIO_EXPERIENCE_SCREENS],
  );
  assert.ok(
    UAT_CHECKS.every(
      (check) =>
        check.title && check.steps && check.expected && check.implementation,
    ),
  );
});
test("feedback never defaults to a passing outcome", () => {
  const report = feedbackReport({});
  assert.ok(report.checks.every((check) => check.outcome === "not-tested"));
  assert.ok(report.checks.some((check) => check.parity === "not-integrated"));
});
test("issue, enhancement, fix and evidence survive a browser-storage round trip", () => {
  const feedback = {
    "UAT-41": {
      outcome: "issue" as const,
      issue: "Color was lost",
      enhancement: "Add clearer help",
      fix: "Keep palette after reopen",
      evidence: "screenshot-41.png",
    },
  };
  assert.deepEqual(restoreFeedback(JSON.stringify(feedback)), feedback);
  const report = feedbackReport(feedback, new Date("2026-10-28T00:00:00Z"));
  assert.equal(
    report.checks.find((check) => check.id === "UAT-41")?.fix,
    feedback["UAT-41"].fix,
  );
  assert.match(feedbackMarkdown(feedback), /UAT-41/);
  assert.match(feedbackMarkdown(feedback), /screenshot-41.png/);
});
test("invalid storage, unsupported outcomes and oversized notes are handled safely", () => {
  assert.deepEqual(restoreFeedback("bad json"), {});
  const restored = restoreFeedback(
    JSON.stringify({
      unknown: { outcome: "pass" },
      "UAT-01": {
        outcome: "automatically-approved",
        issue: "x".repeat(5000),
        fix: 42,
      },
      __proto__: { admin: true },
    }),
  );
  assert.deepEqual(Object.keys(restored), ["UAT-01"]);
  assert.equal(restored["UAT-01"].outcome, "not-tested");
  assert.equal(restored["UAT-01"].issue.length, 4000);
  assert.equal(restored["UAT-01"].fix, "");
  assert.deepEqual(emptyFeedback().enhancement, "");
});
test("workflow links use explicit record IDs and never route unsupported screens as implemented", () => {
  const find = (screen: string) =>
    UAT_CHECKS.find((check) => check.screen === screen)!;
  const context = {
    projectId: "owned-project",
    brandId: "owned-brand",
    creativeId: "owned-creative",
  };
  assert.equal(
    checkUrl(find("brand-assets"), context),
    "/brands/owned-brand?step=assets",
  );
  assert.equal(checkUrl(find("edit"), context), "/create/ad/owned-creative");
  assert.equal(checkUrl(find("performance"), context), null);
  assert.equal(
    checkUrl(find("edit"), {
      ...context,
      creativeId: "https://untrusted.example",
    }),
    null,
  );
  assert.equal(checkUrl(find("brand-manager"), context), "/brands");
});
