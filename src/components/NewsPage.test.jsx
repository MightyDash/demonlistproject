import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewsPage } from "./NewsPage.jsx";

const article = {
  id: "news-1",
  title: "New channel update",
  excerpt: "A short summary of the update.",
  content: "<p>The full story.</p>",
  coverImageUrl: "",
  sourceLabel: "YouTube",
  sourceUrl: "https://example.com/watch",
  status: "published",
  pinned: true,
  createdAt: "2026-09-17T10:00:00.000Z",
  updatedAt: "2026-09-17T10:00:00.000Z",
  publishedAt: "2026-09-17T10:00:00.000Z"
};

function renderNews(overrides = {}) {
  const props = {
    articles: [article],
    loading: false,
    error: "",
    isAdmin: false,
    selectedArticleId: "",
    onOpenArticle: vi.fn(),
    onBackToNews: vi.fn(),
    onReload: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onUploadImage: vi.fn(),
    ...overrides
  };

  return { props, ...render(<NewsPage {...props} />) };
}

describe("NewsPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("opens an article from the news feed", () => {
    const { props } = renderNews();

    fireEvent.click(screen.getByRole("button", { name: /new channel update/i }));

    expect(props.onOpenArticle).toHaveBeenCalledWith("news-1");
  });

  it("shows the rich article editor directly to administrators", () => {
    renderNews({ isAdmin: true });

    fireEvent.click(screen.getByRole("button", { name: /new article/i }));

    expect(screen.getByRole("heading", { name: "Create article" })).toBeInTheDocument();
    expect(screen.getByLabelText("Text size")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Underline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add link card" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload image" })).toBeInTheDocument();
  });
});
