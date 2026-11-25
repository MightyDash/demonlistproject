import { describe, expect, it } from "vitest";
import { buildGddlFinderQuery, pickRandomGddlDemon, rowsFromGddlResponse } from "./gddlFinderUtils.js";

describe("GDDL finder utilities", () => {
  it("builds independent tier and enjoyment filters", () => {
    expect(buildGddlFinderQuery({ useTier: true, tier: 7 })).toContain("F >= 6.5 and F < 7.5");
    expect(buildGddlFinderQuery({ useEnjoyment: true, enjoymentMin: 7.5, enjoymentMax: 9 })).toContain("G >= 7.5 and G <= 9");
  });

  it.each([
    [1, "F >= 1 and F < 1.5"],
    [2, "F >= 1.5 and F < 2.5"],
    [3, "F >= 2.5 and F < 3.5"],
    [38, "F >= 37.5 and F < 38.5"],
    [39, "F >= 38.5 and F <= 39"]
  ])("uses the correct boundaries for tier %i", (tier, expected) => {
    expect(buildGddlFinderQuery({ useTier: true, tier })).toContain(expected);
  });

  it("combines both filters and normalizes reversed enjoyment values", () => {
    const query = buildGddlFinderQuery({
      useTier: true,
      tier: 12,
      useEnjoyment: true,
      enjoymentMin: 9,
      enjoymentMax: 6
    });
    expect(query).toContain("F >= 11.5 and F < 12.5");
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
