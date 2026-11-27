import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProgressTrackerPage } from "./ProgressTrackerPage.jsx";
import { parseSharedFilters, buildSharedFilterSearch } from "../sharedUrlUtils.js";

it("shows only previously tracked completions and places the tab after Dropped", () => {
  const completed = { id: "2", name: "Tracked completion", status: "COMPLETED", wasTracked: true };
  const demons = [
    { id: "1", name: "Archive only", status: "COMPLETED", wasTracked: false },
    completed,
    { id: "3", name: "Still tracking", status: "IN PROGRESS", wasTracked: true }
  ];
  const onSelectDemon = vi.fn();
  render(<ProgressTrackerPage demons={demons} activeFilter="COMPLETED" onFilterChange={vi.fn()} onSelectDemon={onSelectDemon} />);

  const filters = within(screen.getByRole("navigation", { name: "Filter progress status" })).getAllByRole("button");
  expect(filters.at(-2)).toHaveTextContent("Dropped");
  expect(filters.at(-1)).toHaveTextContent("Completed1");
  expect(filters.at(-1)).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText("Archive only")).not.toBeInTheDocument();
  expect(screen.queryByText("Still tracking")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Tracked completion/ }));
  expect(onSelectDemon).toHaveBeenCalledWith(completed);
});

it("retains the Completed filter in a shared Tracker URL", () => {
  const search = buildSharedFilterSearch({ progressCategory: "COMPLETED" }, { progress: true });
  expect(parseSharedFilters(search, { progress: true }).progressCategory).toBe("COMPLETED");
});
