import { describe, expect, it } from "vitest";
import {
  findMonthlyHighlightStyle,
  getHardestMonthlyDemon,
  monthlyHighlightTextStyle,
  normalizeMonthlyHighlightStyle
} from "./monthlyHighlightUtils.js";

describe("monthlyHighlightUtils", () => {
  it("selects the demon with the highest tier", () => {
    expect(getHardestMonthlyDemon([
      { demon: { name: "A", tier: 12, placement: "#8" } },
      { demon: { name: "Bloodbath", tier: 23.98, placement: "#1" } },
      { demon: { name: "B", tier: 19, placement: "#3" } }
    ])?.name).toBe("Bloodbath");
  });

  it("normalizes style values and rejects arbitrary font names", () => {
    expect(normalizeMonthlyHighlightStyle({ opacity: 8, fontFamily: "unsafe", fontSize: 5 })).toMatchObject({
      opacity: 1,
      fontFamily: "site",
      fontSize: 18
    });
  });

  it("finds a saved month style and produces safe CSS", () => {
    const style = findMonthlyHighlightStyle([{ year: 2026, month: "march", color: "#abcdef" }], 2026, "march");
    expect(style.color).toBe("#abcdef");
    expect(monthlyHighlightTextStyle(style)).toMatchObject({ color: "#abcdef", fontSize: "30px" });
  });
});
