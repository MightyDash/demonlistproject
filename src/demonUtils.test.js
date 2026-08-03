import { describe, expect, it } from "vitest";
import {
  difficultyClass,
  extractDateYear,
  formatDateLabel,
  hasPlacement,
  isInProgressDemon,
  normalizeDemon,
  parseDemonDate,
  placementSortValue,
  placementNumber,
  segmentForPlacement
} from "./demonUtils.js";

describe("demonUtils", () => {
  it("normalizes a complete demon row", () => {
    expect(normalizeDemon({
      id: 10565740,
      name: "Bloodbath",
      creator: "Riot & more",
      placement: "#1",
      difficulty: "Extreme Demon",
      attempts: "20226",
      Date: "18/03/2026",
      Tier: "23.99",
      "Tier +/-": "0.01",
      "Done/Progress?": "COMPLETED",
      skillsetDistribution: [{ name: "Wave", value: 10 }]
    })).toMatchObject({
      id: "10565740",
      name: "Bloodbath",
      creator: "Riot & more",
      placement: "#1",
      difficulty: "Extreme Demon",
      attempts: 20226,
      year: 2026,
      date: "18/03/2026",
      tier: 23.99,
      tierChange: 0.01,
      formerTop1Year: null,
      status: "COMPLETED",
      thumbnail: "https://levelthumbs.prevter.me/thumbnail/10565740"
    });
  });

  it("normalizes missing optional fields and empty strings", () => {
    expect(normalizeDemon({ name: "", id: "", attempts: "", tier: "" })).toMatchObject({
      placement: "",
      name: "",
      creator: "",
      id: "",
      difficulty: "",
      attempts: 0,
      year: 0,
      date: "",
      tier: 0,
      tierChange: 0,
      skillsetDistribution: [],
      status: "COMPLETED",
      progressPercent: 0,
      thumbnail: ""
    });
  });

  it("does not normalize unsupported placement container types into valid placements", () => {
    expect(normalizeDemon({ placement: ["1"] })).toMatchObject({ placement: "" });
    expect(normalizeDemon({ placement: { value: "#1" } })).toMatchObject({ placement: "" });
  });

  it("documents current null row behavior", () => {
    expect(() => normalizeDemon(null)).toThrow();
  });

  it("keeps numeric values as numbers and large IDs as strings", () => {
    expect(normalizeDemon({ ID: 1234567890123, Attempts: "42", rating: 0 })).toMatchObject({
      id: "1234567890123",
      attempts: 42
    });
  });

  it("keeps unknown difficulty and unexpected primitive fields without remapping", () => {
    const demon = normalizeDemon({
      name: ["Array Name"],
      creator: { value: "Creator" },
      difficulty: "Impossible Demon"
    });

    expect(demon.name).toEqual(["Array Name"]);
    expect(demon.creator).toEqual({ value: "Creator" });
    expect(demon.difficulty).toBe("Impossible Demon");
    expect(difficultyClass(demon.difficulty)).toBe("unknown");
  });

  it.each([
    ["#1", 1],
    ["#1 •", 1],
    ["#1 ▲", 1],
    ["#1 ▼", 1],
    ["150", 150],
    [" #150 ", 150],
    [0, null],
    ["-1", null],
    ["1.5", null],
    ["abc123", null],
    [undefined, null],
    ["", null],
    [NaN, null],
    [Infinity, null],
    [{}, null],
    [[], null]
  ])("calculates placementNumber(%s)", (placement, expected) => {
    expect(placementNumber(placement)).toBe(expected);
  });

  it("sorts missing placements after real placements", () => {
    expect(placementSortValue("#1")).toBe(1);
    expect(placementSortValue("")).toBe(Number.POSITIVE_INFINITY);
    expect(placementSortValue("not placed")).toBe(Number.POSITIVE_INFINITY);
  });

  it.each([
    ["#1", true],
    ["#1 •", true],
    ["#1 ▲", true],
    ["#1 ▼", true],
    ["", false],
    [null, false],
    ["abc", false],
    ["#500", true]
  ])("detects hasPlacement(%s)", (placement, expected) => {
    expect(hasPlacement(placement)).toBe(expected);
  });

  it.each([
    ["#1", "main"],
    ["#100", "main"],
    ["#101", "extended"],
    ["#200", "extended"],
    ["#201", "legacy"],
    ["", null],
    ["unknown", null]
  ])("maps %s to its current segment", (placement, expected) => {
    expect(segmentForPlacement(placement)).toBe(expected);
  });

  it("detects in-progress demons only by explicit status", () => {
    expect(isInProgressDemon({ status: "IN PROGRESS", placement: "#20" })).toBe(true);
    expect(isInProgressDemon({ status: " in progress ", placement: "" })).toBe(true);
    expect(isInProgressDemon({ status: "COMPLETED", placement: "" })).toBe(false);
    expect(isInProgressDemon({ status: "COMPLETED", placement: "#20" })).toBe(false);
    expect(isInProgressDemon(null)).toBe(false);
  });

  it.each([
    ["9/10/2025", 2025, "09/10/2025"],
    ["09-10-2025", 2025, "09/10/2025"],
    ["2025-10-09", 2025, "09/10/2025"],
    ["2025-10-09T00:00:00.000Z", 2025, "09/10/2025"],
    ["2023", 2023, "2023"],
    ["", 0, ""],
    ["not a date", 0, ""],
    ["09-10-25", 0, ""],
    ["31/02/2025", 0, ""],
    ["29/02/2023", 0, ""],
    ["29/02/2024", 2024, "29/02/2024"],
    ["12/31/2025", 0, ""],
    ["2025-06", 0, ""],
    [["2024"], 0, ""],
    [{ value: "2024" }, 0, ""],
    [true, 0, ""],
    [Infinity, 0, ""]
  ])("parses and formats date value %s", (value, expectedYear, expectedLabel) => {
    expect(extractDateYear(value)).toBe(expectedYear);
    expect(formatDateLabel(value)).toBe(expectedLabel);
  });

  it("returns parsed date metadata without browser-specific date-only shifts", () => {
    expect(parseDemonDate("2025-01-01")).toMatchObject({
      year: 2025,
      month: 1,
      day: 1,
      yearOnly: false
    });
    expect(parseDemonDate("2025")).toMatchObject({
      year: 2025,
      month: null,
      day: null,
      yearOnly: true
    });
    expect(formatDateLabel(Date.UTC(2025, 5, 15))).toBe("15/06/2025");
  });

  it("uses Date fallback formatting for date objects", () => {
    const value = new Date(2025, 9, 9);

    expect(extractDateYear(value)).toBe(2025);
    expect(formatDateLabel(value)).toBe("09/10/2025");
  });
});
