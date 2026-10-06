import { describe, expect, it } from "vitest";
import { DEVICE_OPTIONS, normalizeDevice } from "./deviceUtils.js";

describe("deviceUtils", () => {
  it("exposes the three supported completion devices", () => {
    expect(DEVICE_OPTIONS).toEqual(["PC", "Laptop", "Mobile"]);
  });

  it.each([
    ["pc", "PC"],
    ["LAPTOP", "Laptop"],
    [" mobile ", "Mobile"],
    ["Console", ""],
    [null, ""]
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeDevice(input)).toBe(expected);
  });
});
