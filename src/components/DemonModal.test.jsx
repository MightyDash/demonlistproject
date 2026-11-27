import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { requestJson } from "../api.js";
import { DemonModal } from "./DemonModal.jsx";

vi.mock("../api.js", () => ({ requestJson: vi.fn() }));

const demon = { id: "4706930", name: "Supersonic", year: 2026, attempts: 1537, tier: 16.88 };
const entries = [
  { recordedAt: "2026-11-27T12:00:00Z", progressPercent: 100, attempts: 1537, attemptDelta: 267, status: "COMPLETED", event: "COMPLETED" },
  { recordedAt: "2026-11-22T12:00:00Z", progressPercent: 70, attempts: 1270, progressCategory: "PLAN TO BEAT", event: "BASELINE" }
];

beforeEach(() => {
  requestJson.mockReset();
  requestJson.mockImplementation(async url => new URL(url).searchParams.get("view") === "progress-history"
    ? { entries }
    : { skillsetDistribution: [] });
});

it("shows recorded Tracker updates in the normal card for a previously tracked demon", async () => {
  render(<DemonModal demon={{ ...demon, wasTracked: true }} />);
  const history = await screen.findByRole("list", { name: "Recorded Progress Tracker updates" });
  const events = within(history).getAllByRole("listitem");
  expect(events).toHaveLength(2);
  expect(events[0]).toHaveTextContent("70% → 100%");
  expect(events[0]).toHaveTextContent("1.537 attempts (+267)");
  expect(events[0]).toHaveTextContent("Plan to Beat → Completed");
  expect(events[1]).toHaveTextContent("Tracking started");
  expect(requestJson).toHaveBeenCalledWith(
    expect.stringContaining("view=progress-history&levelId=4706930"), expect.any(Object)
  );
});

it("keeps the original level history for other demons without requesting Tracker data", async () => {
  render(<DemonModal demon={demon} />);
  await screen.findByText("No GDDL skillset votes found yet.");
  expect(screen.getByText("Stats updated")).toBeInTheDocument();
  expect(screen.getByText("Added to list")).toBeInTheDocument();
  expect(screen.getByText("Current tier")).toBeInTheDocument();
  expect(requestJson.mock.calls.every(([url]) => !url.includes("progress-history"))).toBe(true);
});

it("lets the user retry a failed Tracker history request", async () => {
  let historyRequests = 0;
  requestJson.mockImplementation(async url => {
    if (!url.includes("progress-history")) return { skillsetDistribution: [] };
    historyRequests += 1;
    return historyRequests === 1 ? { success: false } : { entries };
  });
  render(<DemonModal demon={{ ...demon, wasTracked: true }} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Progress history could not be loaded.");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("70% → 100%")).toBeVisible();
});
