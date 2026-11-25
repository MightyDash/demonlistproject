import { describe, expect, it } from "vitest";
import { buildGddlFinderQuery, pickRandomGddlDemon, rowsFromGddlResponse } from "./gddlFinderUtils.js";

describe("GDDL finder utilities", () => {
  it("builds independent tier and enjoyment filters", () => {
    expect(buildGddlFinderQuery({ useTier: true, tier: 7 })).toContain("F >= 7 and F < 8");
    expect(buildGddlFinderQuery({ useEnjoyment: true, enjoymentMin: 7.5, enjoymentMax: 9 })).toContain("G >= 7.5 and G <= 9");
  });

  it("combines both filters and normalizes reversed enjoyment values", () => {
    const query = buildGddlFinderQuery({
      useTier: true,
      tier: 12,
      useEnjoyment: true,
      enjoymentMin: 9,
      enjoymentMax: 6
    });
    expect(query).toContain("F >= 12 and F < 13");
    expect(query).toContain("G >= 6 and G <= 9");
  });

  it("converts spreadsheet rows and avoids immediately repeating a result", () => {
    const levels = rowsFromGddlResponse({
      status: "ok",
      table: {
        rows: [
          { c: [{ v: 1, f: "1" }, { v: "First" }, { v: "Creator" }, { v: "Song" }, { v: "Easy" }, { v: 2.4 }, { v: 8.1 }] },
          { c: [{ v: 2, f: "2" }, { v: "Second" }, { v: "Creator" }, { v: "Song" }, { v: "Medium" }, { v: 5.4 }, { v: 7.2 }] }
        ]
      }
    });

    expect(levels[0]).toMatchObject({ id: "1", name: "First", tier: 2.4, enjoyment: 8.1 });
    expect(pickRandomGddlDemon(levels, "1", () => 0).id).toBe("2");
  });
});
