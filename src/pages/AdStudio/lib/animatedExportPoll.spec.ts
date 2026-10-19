import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAnimatedExportFailure,
  formatAnimatedExportStatus,
  isAnimatedExportTerminal,
  shouldPollAnimatedExport,
} from "./animatedExportPoll";

describe("animatedExportPoll (4C-B)", () => {
  it("classifies terminal vs polling statuses", () => {
    assert.equal(isAnimatedExportTerminal("completed"), true);
    assert.equal(isAnimatedExportTerminal("failed"), true);
    assert.equal(isAnimatedExportTerminal("queued"), false);
    assert.equal(shouldPollAnimatedExport("processing"), true);
    assert.equal(shouldPollAnimatedExport("completed"), false);
  });

  it("formats status with progress when present", () => {
    assert.equal(
      formatAnimatedExportStatus({ status: "processing", progressPercent: 42.4 }),
      "Status: processing · 42%",
    );
    assert.equal(formatAnimatedExportStatus({ status: "completed" }), "Status: completed");
  });

  it("formats failure messages with code and text", () => {
    assert.equal(
      formatAnimatedExportFailure({
        status: "failed",
        errorCode: "RENDER_FAILED",
        errorMessage: "FFmpeg exited 1",
      }),
      "RENDER_FAILED — FFmpeg exited 1",
    );
  });
});
