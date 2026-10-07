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
    tier: 18.5,
    difficulty: "Insane Demon",
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
      routeOverview={false}
      isAdmin={false}
      onSelectDemon={vi.fn()}
      onOpenMonth={vi.fn()}
      onOpenYearOverview={vi.fn()}
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

  it("shows the hardest demon on non-empty month cards", () => {
    renderTimeline({ routeYear: 2025 });

    expect(screen.getByLabelText("Hardest demon: Exact Month Demon")).toBeInTheDocument();
    expect(screen.getByLabelText("Hardest difficulty: Insane Demon")).toBeInTheDocument();
    expect(screen.getAllByText("Exact Month Demon")).toHaveLength(1);
  });

  it("shows all month demons in the year overview without year-only entries", () => {
    const demons = [
      ...timelineDemons,
      {
        id: "5",
        name: "January Demon",
        placement: "#5",
        tier: 20,
        date: "08/01/2025",
        dateYear: 2025,
        status: "COMPLETED"
      }
    ];

    renderTimeline({ demons, routeYear: 2025, routeOverview: true });

    expect(screen.getByRole("heading", { name: "2025 Year Overview" })).toBeInTheDocument();
    const juneDemon = screen.getByText("Exact Month Demon");
    const januaryDemon = screen.getByText("January Demon");
    expect(juneDemon.compareDocumentPosition(januaryDemon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Exact Month Demon")).toBeInTheDocument();
    expect(screen.queryByText("Year Only Demon")).not.toBeInTheDocument();
  });
});
