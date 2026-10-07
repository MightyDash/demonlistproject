import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTopButton } from "./ScrollToTopButton.jsx";

describe("ScrollToTopButton", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  it("appears after scrolling and smoothly returns to the top", () => {
    render(<ScrollToTopButton />);
    const button = screen.getByRole("button", { name: "Back to top" });
    expect(button).not.toHaveClass("is-visible");

    window.scrollY = 700;
    fireEvent.scroll(window);
    expect(button).toHaveClass("is-visible");

    fireEvent.click(button);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
