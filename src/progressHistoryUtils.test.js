import { describe, expect, it } from "vitest";
import { buildProgressTimeline, formatProgressHistoryDate, progressCategoryLabel } from "./progressHistoryUtils.js";

describe("buildProgressTimeline", () => {
  it("builds newest-first progress changes with attempt deltas", () => {
    const result = buildProgressTimeline([
      { recordedAt: "2026-11-12T12:00:00Z", progressPercent: 65, attempts: 1000, event: "BASELINE" },
      { recordedAt: "2026-11-18T12:00:00Z", progressPercent: 78, attempts: 1292, event: "PROGRESS" }
    ], { id: "1", name: "Example", progressPercent: 82, attempts: 1438, progressCategory: "IN PROGRESS" });

    expect(result).toMatchObject([
      { event: "CURRENT", previousProgressPercent: 78, progressPercent: 82, progressDelta: 4, attemptDelta: 146 },
      { event: "PROGRESS", previousProgressPercent: 65, progressPercent: 78, progressDelta: 13, attemptDelta: 292 },
      { event: "BASELINE", previousProgressPercent: null, progressPercent: 65, attemptDelta: 0 }
    ]);
  });

  it("does not duplicate a current snapshot already stored by the backend", () => {
    const result = buildProgressTimeline([
      { recordedAt: "2026-11-22T12:00:00Z", progressPercent: 82, attempts: 1438, progressCategory: "ON HOLD" }
    ], { progressPercent: 82, attempts: 1438, progressCategory: "ON HOLD" });
    expect(result).toHaveLength(1);
  });
});

describe("progress history labels", () => {
  it("formats tracker categories and dates", () => {
    expect(progressCategoryLabel("PLAN TO BEAT")).toBe("Plan to Beat");
    expect(progressCategoryLabel("unknown")).toBe("In Progress");
    expect(formatProgressHistoryDate("2026-11-22T12:00:00Z")).toBe("22 Nov 2026");
    expect(formatProgressHistoryDate("")).toBe("Current");
  });
});
