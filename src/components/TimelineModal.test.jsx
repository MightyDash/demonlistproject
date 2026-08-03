import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelinePage } from "./TimelineModal.jsx";

const timelineDemons = [
  {
    id: "1",
    name: "Year Only Demon",
    placement: "#1",
    date: "2024",
    dateYear: 2024,
    status: "COMPLETED",
    thumbnail: "https://example.test/year.jpg"
  },
  {
    id: "2",
    name: "Exact Month Demon",
    placement: "#2",
    date: "15/06/2025",
    dateYear: 2025,
    status: "COMPLETED",
    thumbnail: "https://example.test/exact.jpg"
  },
  {
    id: "3",
    name: "Invalid Date Demon",
    placement: "#3",
    date: "31/04/2025",
    dateYear: 0,
    status: "COMPLETED",
    thumbnail: "https://example.test/invalid.jpg"
  },
  {
    id: "4",
    name: "Progress Demon",
    placement: "",
    date: "15/06/2025",
    dateYear: 2025,
    status: "IN PROGRESS",
    thumbnail: "https://example.test/progress.jpg"
  }
];

function renderTimeline(overrides = {}) {
  return render(
    <TimelinePage
      demons={timelineDemons}
      timelineEntries={[]}
      routeYear={null}
      routeMonth={null}
      isAdmin={false}
      onSelectDemon={vi.fn()}
      onOpenMonth={vi.fn()}
      onBackToTimeline={vi.fn()}
      onAddTimelineEntry={vi.fn()}
      onRemoveTimelineEntry={vi.fn()}
      {...overrides}
    />
  );
}

describe("TimelinePage", () => {
  it("keeps year-only demon dates out of month buckets", () => {
    renderTimeline({ routeYear: 2024 });

    expect(screen.getByRole("heading", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByText("1 demon completed, 0 demons placed in months")).toBeInTheDocument();
  });

  it("shows exact dates on the matching month route only", () => {
    renderTimeline({ routeYear: 2025, routeMonth: "june" });

    expect(screen.getByRole("heading", { name: "June 2025" })).toBeInTheDocument();
    expect(screen.getByText("Exact Month Demon")).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date Demon")).not.toBeInTheDocument();
    expect(screen.queryByText("Progress Demon")).not.toBeInTheDocument();
  });
});
