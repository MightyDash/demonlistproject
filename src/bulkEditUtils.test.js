import { describe, expect, it } from "vitest";
import { buildBulkEditChanges, createDemonEditDraft, validateBulkEditChanges } from "./bulkEditUtils.js";

const demon = {
  id: "10565740",
  name: "Bloodbath",
  creator: "Riot & more",
  difficulty: "Extreme Demon",
  date: "18/03/2026",
  attempts: 20226,
  status: "COMPLETED",
  device: "PC",
  twoPlayerMode: "standard",
  progressPercent: 0
};

describe("bulkEditUtils", () => {
  it("only sends changed fields", () => {
    const draft = { ...createDemonEditDraft(demon), device: "Laptop" };
    expect(buildBulkEditChanges([demon], { [demon.id]: draft })).toEqual([
      { levelId: demon.id, device: "Laptop" }
    ]);
  });

  it("does not send reverted drafts", () => {
    expect(buildBulkEditChanges([demon], { [demon.id]: createDemonEditDraft(demon) })).toEqual([]);
  });

  it("includes progress when changing to in progress", () => {
    const draft = { ...createDemonEditDraft(demon), status: "IN PROGRESS", progressPercent: "64" };
    expect(buildBulkEditChanges([demon], { [demon.id]: draft })[0]).toMatchObject({
      status: "IN PROGRESS",
      progressPercent: "64"
    });
  });

  it("validates invalid batch values", () => {
    expect(validateBulkEditChanges([{ levelId: "1", attempts: "-2" }])).toMatch(/Attempts/);
    expect(validateBulkEditChanges([{ levelId: "1", date: "tomorrow" }])).toMatch(/Date/);
    expect(validateBulkEditChanges([{ levelId: "1", device: "PC" }])).toBe("");
  });
});
