import { describe, expect, it, vi } from "vitest";
import { matchesAttemptsFilter, pickRandomResult } from "./searchUtils.js";

describe("matchesAttemptsFilter", () => {
  it.each([
    [3137, "3137", true],
    [3137, "=3137", true],
    [3137, ">3000", true],
    [3137, ">=3.137", true],
    [3137, "<4000", true],
    [3137, "<=3,137", true],
    [3137, ">3137", false],
    [3137, "<3137", false],
    [3137, "unknown", false]
  ])("matches %s against %s", (attempts, expression, expected) => {
    expect(matchesAttemptsFilter(attempts, expression)).toBe(expected);
  });
});

describe("pickRandomResult", () => {
  it("returns one item using the supplied random value", () => {
    const random = vi.fn(() => 0.6);
    expect(pickRandomResult(["one", "two", "three"], random)).toEqual(["two"]);
    expect(random).toHaveBeenCalledOnce();
  });

  it("returns no item for an empty result", () => {
    expect(pickRandomResult([])).toEqual([]);
  });
});
