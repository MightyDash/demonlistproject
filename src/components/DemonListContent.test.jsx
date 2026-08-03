import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DemonListContent } from "./DemonListContent.jsx";

const demons = [
  {
    id: "1",
    name: "Bloodbath",
    creator: "Riot & more",
    placement: "#1",
    difficulty: "Extreme Demon",
    attempts: 20226,
    year: 2026,
    date: "18/03/2026",
    tier: 23.99,
    thumbnail: "https://example.test/bloodbath.jpg",
    status: "COMPLETED"
  },
  {
    id: "2",
    name: "Acu",
    creator: "neigefeu",
    placement: "#3",
    difficulty: "Extreme Demon",
    attempts: 4575,
    year: 2023,
    date: "2023",
    tier: 20.25,
    thumbnail: "https://example.test/acu.jpg",
    status: "COMPLETED"
  }
];

function renderContent(overrides = {}) {
  const props = {
    stats: {
      total: 503,
      attempts: 114079,
      hardest: { name: "Bloodbath", difficulty: "Extreme Demon" }
    },
    setSelected: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    difficulty: "all",
    setDifficulty: vi.fn(),
    difficultyOpen: false,
    setDifficultyOpen: vi.fn(),
    difficulties: ["all", "Extreme Demon"],
    segment: "all",
    setSegment: vi.fn(),
    yearView: "all",
    setYearView: vi.fn(),
    viewMode: "banner",
    setViewMode: vi.fn(),
    filtered: demons,
    totalCount: demons.length,
    hasMoreDemons: false,
    onLoadMore: vi.fn(),
    apiLatestDemon: "Bloodbath",
    listUpdatedAt: "2026-07-20T12:54:00.000Z",
    onLatestDemonClick: vi.fn(),
    demonListError: "",
    onRetryDemonList: vi.fn(),
    isAdmin: false,
    futureListIds: [],
    onToggleFutureListDemon: vi.fn(),
    ...overrides
  };

  return {
    props,
    ...render(<DemonListContent {...props} />)
  };
}

describe("DemonListContent", () => {
  it("shows live demon list errors with a non-submit retry button", () => {
    const onRetryDemonList = vi.fn();
    renderContent({
      filtered: [],
      totalCount: 0,
      demonListError: "Live demon list failed.",
      onRetryDemonList
    });

    expect(screen.getByText("Live demon list failed.")).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Try again" });

    expect(retryButton).toHaveAttribute("type", "button");
    fireEvent.click(retryButton);
    expect(onRetryDemonList).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Mock data")).not.toBeInTheDocument();
  });

  it("renders only the visible banner demons while totalCount can be larger", () => {
    renderContent({
      filtered: demons,
      totalCount: 5,
      hasMoreDemons: true
    });

    expect(screen.getByText("2 of 5 demons shown")).toBeInTheDocument();
    expect(screen.getAllByText("Bloodbath").length).toBeGreaterThan(0);
    expect(screen.getByText("Acu")).toBeInTheDocument();
    expect(screen.queryByText("Make It Drop")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more demons" })).toBeInTheDocument();
  });

  it("calls the load-more callback and hides the button when everything is visible", () => {
    const onLoadMore = vi.fn();
    const { rerender, props } = renderContent({
      hasMoreDemons: true,
      onLoadMore
    });

    fireEvent.click(screen.getByRole("button", { name: "Load more demons" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<DemonListContent {...props} hasMoreDemons={false} />);
    expect(screen.queryByRole("button", { name: "Load more demons" })).not.toBeInTheDocument();
  });

  it("shows unplaced completed demons without inventing a placement", () => {
    renderContent({
      filtered: [
        {
          id: "999",
          name: "Unranked Demon",
          creator: "Unknown creator",
          placement: "",
          difficulty: "Easy Demon",
          attempts: 10,
          year: 2026,
          date: "2026",
          tier: 0,
          thumbnail: "https://example.test/unranked.jpg",
          status: "COMPLETED"
        }
      ],
      totalCount: 1
    });

    expect(screen.getByText("Unplaced")).toBeInTheDocument();
    expect(screen.getByText("Unranked Demon")).toBeInTheDocument();
  });
});
