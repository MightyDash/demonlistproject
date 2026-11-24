import { describe, expect, it } from "vitest";
import { buildSharedFilterSearch, parseSharedFilters } from "./sharedUrlUtils.js";

describe("shareable list filters", () => {
  it("round-trips list filters and hidden searches", () => {
    const search = buildSharedFilterSearch({
      query: "artist:acid-notation",
      device: "PC",
      difficulty: "Hard Demon",
      segment: "main",
      yearView: "tier",
      tierFilter: "2 > 16"
    });

    expect(parseSharedFilters(search)).toMatchObject({
      query: "artist:acid-notation",
      device: "PC",
      difficulty: "Hard Demon",
      segment: "main",
      yearView: "tier",
      tierFilter: "2 > 16"
    });
  });

  it("serializes progress status independently", () => {
    const search = buildSharedFilterSearch({ progressCategory: "ON HOLD" }, { progress: true });
    expect(search).toBe("?status=ON+HOLD");
    expect(parseSharedFilters(search, { progress: true }).progressCategory).toBe("ON HOLD");
  });
});
