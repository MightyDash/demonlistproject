import { describe, expect, it } from "vitest";
import { buildDemonStatistics } from "./statisticsUtils.js";

const demons = [
  { name: "First", difficulty: "Easy Demon", attempts: 100, tier: 2, year: 2025, status: "COMPLETED" },
  { name: "Second", difficulty: "Hard Demon", attempts: 300, tier: 10, year: 2025, status: "COMPLETED" },
  { name: "Hardest", difficulty: "Extreme Demon", attempts: 800, tier: 22, year: 2026, status: "COMPLETED" },
  { name: "Working", difficulty: "Insane Demon", attempts: 900, tier: 18, year: 2026, status: "IN PROGRESS" }
];

describe("buildDemonStatistics", () => {
  it("only uses completed demons for overall totals", () => {
    const result = buildDemonStatistics(demons);

    expect(result.total).toBe(3);
    expect(result.attempts).toBe(1200);
    expect(result.averageAttempts).toBe(400);
    expect(result.averageTier).toBeCloseTo(34 / 3);
    expect(result.hardest.name).toBe("Hardest");
    expect(result.difficultyCounts).toEqual({ easy: 1, medium: 0, hard: 1, insane: 0, extreme: 1 });
  });

  it("builds year summaries and compares them with the previous year", () => {
    const result = buildDemonStatistics(demons);

    expect(result.years.map(summary => summary.year)).toEqual([2025, 2026]);
    expect(result.latestYear).toMatchObject({ year: 2026, total: 1, totalChange: -1, attemptsChange: 400 });
    expect(result.latestYear.hardest.name).toBe("Hardest");
    expect(result.maxYearTotal).toBe(2);
  });
});
